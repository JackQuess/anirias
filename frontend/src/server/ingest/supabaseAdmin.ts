import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  // Throw early to surface misconfig in server context
  throw new Error('Supabase admin env vars missing');
}

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceKey);

type AnimeRow = {
  id: string;
  slug: string | null;
  title: { romaji?: string | null; english?: string | null };
};

export type EpisodeRow = {
  id: string;
  season_id: string;
  episode_number: number;
  video_url: string | null;
  status: string | null;
  seasons?: { season_number?: number | null } | null;
};

export async function getAnime(animeId: string): Promise<AnimeRow | null> {
  const { data, error } = await supabaseAdmin
    .from('animes')
    .select('id, slug, title')
    .eq('id', animeId)
    .single();

  if (error) throw new Error(`Anime fetch failed: ${error.message}`);
  return data;
}

const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'anime';

export async function ensureAnimeSlug(animeId: string): Promise<string> {
  const anime = await getAnime(animeId);
  if (!anime) throw new Error('Anime not found');
  if (anime.slug) return anime.slug;

  const fallbackTitle = anime.title?.romaji || anime.title?.english || `anime-${animeId.slice(0, 8)}`;
  const newSlug = slugify(fallbackTitle);

  const { error } = await supabaseAdmin.from('animes').update({ slug: newSlug }).eq('id', animeId);
  if (error) throw new Error(`Slug update failed: ${error.message}`);
  return newSlug;
}

export async function getOrCreateSeason(animeId: string, seasonNumber: number): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('seasons')
    .select('id')
    .eq('anime_id', animeId)
    .eq('season_number', seasonNumber)
    .maybeSingle();

  if (error) throw new Error(`Season fetch failed: ${error.message}`);
  if (data?.id) return data.id;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('seasons')
    .insert({ anime_id: animeId, season_number: seasonNumber, title: `Sezon ${seasonNumber}` })
    .select('id')
    .single();

  if (insertError || !inserted) throw new Error(`Season create failed: ${insertError?.message}`);
  return inserted.id;
}

export function expectedCdnUrl(slug: string, seasonNumber: number, episodeNumber: number) {
  const padded = String(episodeNumber).padStart(2, '0');
  return `https://anirias-videos.b-cdn.net/${slug}/season-${seasonNumber}/episode-${padded}.mp4`;
}

export async function upsertEpisodeVideo(
  animeId: string,
  seasonId: string,
  episodeNumber: number,
  cdnUrl: string,
): Promise<void> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('episodes')
    .select('id')
    .eq('anime_id', animeId)
    .eq('season_id', seasonId)
    .eq('episode_number', episodeNumber)
    .maybeSingle();

  if (fetchError) throw new Error(`Episode fetch failed: ${fetchError.message}`);

  // Fetch season_number from season_id (CRITICAL for new episodes)
  const { data: season } = await supabaseAdmin
    .from('seasons')
    .select('season_number')
    .eq('id', seasonId)
    .maybeSingle();

  if (!season) throw new Error(`Season not found: ${seasonId}`);

  const payload = {
    anime_id: animeId,
    season_id: seasonId,
    season_number: season.season_number, // 🔥 CRITICAL: season_number must be set
    episode_number: episodeNumber,
    title: `Bölüm ${episodeNumber}`,
    video_url: cdnUrl,
    status: 'ready',
    error_message: null,
    updated_at: new Date().toISOString(),
  };

  if (!existing) {
    const { error } = await supabaseAdmin
      .from('episodes')
      .insert({ ...payload, duration_seconds: 0, created_at: new Date().toISOString() });
    if (error) throw new Error(`Episode insert failed: ${error.message}`);
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('episodes')
    .update(payload)
    .eq('id', existing.id);

  if (updateError) throw new Error(`Episode update failed: ${updateError.message}`);
}

export async function updateEpisodeVideo(
  episodeId: string,
  cdnUrl: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('episodes')
    .update({
      video_url: cdnUrl,
      status: 'ready',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', episodeId);

  if (error) throw new Error(`Episode update failed: ${error.message}`);
}

export async function getEpisodesForAnime(animeId: string): Promise<EpisodeRow[]> {
  const { data, error } = await supabaseAdmin
    .from('episodes')
    .select('id, season_id, episode_number, video_url, status, seasons!inner(season_number)')
    .eq('anime_id', animeId)
    .order('episode_number', { ascending: true });

  if (error) throw new Error(`Episodes fetch failed: ${error.message}`);
  return (data || []).map((row: any) => ({
    ...row,
    seasons: row.seasons ? { season_number: row.seasons.season_number } : null,
  }));
}

export function isEpisodePathCorrect(ep: EpisodeRow, slug: string): boolean {
  const seasonNumber = ep.seasons?.season_number || 1;
  const expected = expectedCdnUrl(slug, seasonNumber, ep.episode_number);
  return ep.video_url === expected;
}
