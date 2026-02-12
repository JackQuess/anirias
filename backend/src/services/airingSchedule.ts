import { supabaseAdmin } from './supabaseAdmin.js';
import { shouldCorrectAiringAt } from './airingCorrection.js';

const ANILIST_API = 'https://graphql.anilist.co';
const ANILIST_RELEASING_STATES = new Set(['RELEASING', 'NOT_YET_RELEASED']);

export interface CalendarApiItem {
  animeId: string;
  slug: string | null;
  title: string;
  episodeNumber: number;
  airingAt: string;
  isReleased: boolean;
  releasedAt: string | null;
  coverImage: string | null;
  statusBadge: 'YAYINLANDI' | 'BUGÜN' | 'YAKINDA';
}

type AniListMediaSchedule = {
  id: number;
  status: string | null;
  title?: { romaji?: string | null; english?: string | null; native?: string | null } | null;
  episodes?: number | null;
  nextAiringEpisode?: { episode?: number | null; airingAt?: number | null } | null;
  coverImage?: { extraLarge?: string | null } | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
  season?: string | null;
  seasonYear?: number | null;
};

interface SyncResult {
  scannedAnime: number;
  syncedRows: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAniListChunk(ids: number[], attempt = 0): Promise<AniListMediaSchedule[]> {
  const query = `
query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
      status
      episodes
      nextAiringEpisode { episode airingAt }
      title { romaji english native }
      coverImage { extraLarge }
      startDate { year month day }
      season
      seasonYear
    }
  }
}
`;

  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { ids } }),
  });

  if (response.status === 429 && attempt < 4) {
    const retryAfterSeconds = Number(response.headers.get('retry-after') || 0);
    const waitMs = retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 700 * 2 ** attempt;
    await sleep(waitMs);
    return fetchAniListChunk(ids, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`AniList sync failed: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json?.errors?.length) {
    const tooMany = json.errors.some((e: any) => String(e?.message || '').toLowerCase().includes('rate limit'));
    if (tooMany && attempt < 4) {
      await sleep(700 * 2 ** attempt);
      return fetchAniListChunk(ids, attempt + 1);
    }
    throw new Error(`AniList GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return (json?.data?.Page?.media || []) as AniListMediaSchedule[];
}

async function invalidateWeeklyCache() {
  await supabaseAdmin.from('weekly_calendar_cache').delete().neq('id', '');
}

export async function syncAiringSchedule(): Promise<SyncResult> {
  const { data: animeRows, error: animeError } = await supabaseAdmin
    .from('animes')
    .select('id, anilist_id')
    .not('anilist_id', 'is', null);

  if (animeError) {
    throw new Error(`Failed to fetch anime list for sync: ${animeError.message}`);
  }

  const animeList = (animeRows || []).filter((row: any) => Number.isInteger(row.anilist_id));
  if (animeList.length === 0) {
    return { scannedAnime: 0, syncedRows: 0 };
  }

  const animeIdByAniList = new Map<number, string>();
  for (const row of animeList) {
    animeIdByAniList.set(Number((row as any).anilist_id), (row as any).id as string);
  }

  const ids = Array.from(animeIdByAniList.keys());
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += 25) chunks.push(ids.slice(i, i + 25));

  const fetched: AniListMediaSchedule[] = [];
  for (const chunk of chunks) {
    const media = await fetchAniListChunk(chunk);
    fetched.push(...media);
    await sleep(150);
  }

  const syncRows = fetched
    .filter((m) => ANILIST_RELEASING_STATES.has(String(m.status || '').toUpperCase()))
    .filter((m) => (m.nextAiringEpisode?.episode || 0) > 0 && (m.nextAiringEpisode?.airingAt || 0) > 0)
    .map((m) => {
      const episode = Number(m.nextAiringEpisode?.episode);
      const airingAtUnix = Number(m.nextAiringEpisode?.airingAt);
      return {
        anime_id: animeIdByAniList.get(m.id) as string,
        anilist_id: m.id,
        episode_number: episode,
        airing_at: new Date(airingAtUnix * 1000).toISOString(),
        airing_source: 'anilist',
        last_synced_at: new Date().toISOString(),
      };
    })
    .filter((row) => Boolean(row.anime_id));

  if (syncRows.length === 0) {
    return { scannedAnime: animeList.length, syncedRows: 0 };
  }

  const keyByAnimeEpisode = new Map<string, {
    is_released: boolean;
    released_at: string | null;
    imported_episode_id: string | null;
  }>();

  const animeIds = Array.from(new Set(syncRows.map((row) => row.anime_id)));
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('airing_schedule')
    .select('anime_id, episode_number, is_released, released_at, imported_episode_id')
    .in('anime_id', animeIds);

  if (existingError) {
    throw new Error(`Failed to fetch existing schedule rows: ${existingError.message}`);
  }

  for (const row of existingRows || []) {
    keyByAnimeEpisode.set(`${(row as any).anime_id}#${(row as any).episode_number}`, {
      is_released: Boolean((row as any).is_released),
      released_at: (row as any).released_at || null,
      imported_episode_id: (row as any).imported_episode_id || null,
    });
  }

  const payload = syncRows.map((row) => {
    const existing = keyByAnimeEpisode.get(`${row.anime_id}#${row.episode_number}`);
    return {
      ...row,
      is_released: existing?.is_released ?? false,
      released_at: existing?.released_at ?? null,
      imported_episode_id: existing?.imported_episode_id ?? null,
    };
  });

  const { error: upsertError } = await supabaseAdmin
    .from('airing_schedule')
    .upsert(payload, { onConflict: 'anime_id,episode_number' });

  if (upsertError) {
    throw new Error(`Failed to upsert schedule rows: ${upsertError.message}`);
  }

  await invalidateWeeklyCache();
  return { scannedAnime: animeList.length, syncedRows: payload.length };
}

export async function markEpisodeReleased(params: {
  animeId: string;
  episodeNumber: number;
  importedEpisodeId: string;
  releasedAt?: string;
}) {
  const releasedAtIso = params.releasedAt || new Date().toISOString();

  const { data: anime, error: animeError } = await supabaseAdmin
    .from('animes')
    .select('anilist_id')
    .eq('id', params.animeId)
    .maybeSingle();

  if (animeError) {
    throw new Error(`Failed to fetch anime metadata: ${animeError.message}`);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('airing_schedule')
    .select('id, airing_at')
    .eq('anime_id', params.animeId)
    .eq('episode_number', params.episodeNumber)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to read existing schedule row: ${existingError.message}`);
  }

  const shouldCorrect = shouldCorrectAiringAt(existing?.airing_at || null, releasedAtIso);

  if (!existing?.id) {
    const { error: insertError } = await supabaseAdmin.from('airing_schedule').insert({
      anime_id: params.animeId,
      anilist_id: anime?.anilist_id ?? null,
      episode_number: params.episodeNumber,
      airing_at: releasedAtIso,
      airing_source: 'importer',
      last_synced_at: new Date().toISOString(),
      is_released: true,
      released_at: releasedAtIso,
      imported_episode_id: params.importedEpisodeId,
    });

    if (insertError) throw new Error(`Failed to insert release schedule row: ${insertError.message}`);
    await invalidateWeeklyCache();
    return;
  }

  const updatePayload: Record<string, unknown> = {
    is_released: true,
    released_at: releasedAtIso,
    imported_episode_id: params.importedEpisodeId,
    last_synced_at: new Date().toISOString(),
  };

  if (shouldCorrect) {
    updatePayload.airing_at = releasedAtIso;
    updatePayload.airing_source = 'importer';
  }

  const { error: updateError } = await supabaseAdmin
    .from('airing_schedule')
    .update(updatePayload)
    .eq('id', existing.id);

  if (updateError) {
    throw new Error(`Failed to update release schedule row: ${updateError.message}`);
  }

  await invalidateWeeklyCache();
}

function resolveStatusBadge(item: { is_released: boolean; airing_at: string }, nowTs: number): 'YAYINLANDI' | 'BUGÜN' | 'YAKINDA' {
  if (item.is_released) return 'YAYINLANDI';
  const airingTs = new Date(item.airing_at).getTime();
  if (airingTs - nowTs <= 24 * 60 * 60 * 1000) return 'BUGÜN';
  return 'YAKINDA';
}

function resolveTitle(title: any): string {
  if (!title) return 'Adsiz Anime';
  if (typeof title === 'string') return title;
  return title.english || title.romaji || title.native || 'Adsiz Anime';
}

export async function getCalendarRange(fromDate: string, days: number): Promise<CalendarApiItem[]> {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  if (Number.isNaN(from.getTime())) {
    throw new Error('Invalid from date. Expected YYYY-MM-DD');
  }
  if (!Number.isInteger(days) || days < 1 || days > 31) {
    throw new Error('Invalid days. Allowed range is 1..31');
  }

  if (days === 7) {
    const { data: cacheRow } = await supabaseAdmin
      .from('weekly_calendar_cache')
      .select('payload')
      .eq('week_start', fromDate)
      .maybeSingle();
    if (cacheRow?.payload && Array.isArray(cacheRow.payload)) {
      return cacheRow.payload as CalendarApiItem[];
    }
  }

  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + days);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const { data, error } = await supabaseAdmin
    .from('airing_schedule')
    .select('anime_id, episode_number, airing_at, is_released, released_at')
    .gte('airing_at', fromIso)
    .lt('airing_at', toIso)
    .order('airing_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to read calendar range: ${error.message}`);
  }

  const animeIds = Array.from(new Set((data || []).map((row: any) => row.anime_id)));
  const { data: animeRows, error: animeError } = await supabaseAdmin
    .from('animes')
    .select('id, slug, title, cover_image')
    .in('id', animeIds);

  if (animeError) {
    throw new Error(`Failed to read anime data for calendar: ${animeError.message}`);
  }

  const animeMap = new Map<string, any>();
  for (const row of animeRows || []) animeMap.set((row as any).id, row);

  const nowTs = Date.now();
  const items: CalendarApiItem[] = (data || []).map((row: any) => {
    const anime = animeMap.get(row.anime_id);
    return {
      animeId: row.anime_id,
      slug: anime?.slug || null,
      title: resolveTitle(anime?.title),
      episodeNumber: row.episode_number,
      airingAt: row.airing_at,
      isReleased: Boolean(row.is_released),
      releasedAt: row.released_at || null,
      coverImage: anime?.cover_image || null,
      statusBadge: resolveStatusBadge(row, nowTs),
    };
  });

  if (days === 7) {
    await supabaseAdmin
      .from('weekly_calendar_cache')
      .upsert(
        {
          week_start: fromDate,
          payload: items,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'week_start' }
      );
  }

  return items;
}
