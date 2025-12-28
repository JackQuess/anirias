import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  throw new Error(`Supabase admin env vars missing: ${missing.join(', ')}`);
}

// Verify service key format (should start with 'eyJ' for JWT)
if (!serviceKey.startsWith('eyJ')) {
  console.warn('[supabaseAdmin] WARNING: Service role key does not appear to be a valid JWT token');
}

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test service role access on initialization (non-blocking)
(async () => {
  try {
    const { error } = await supabaseAdmin.from('animes').select('id').limit(1);
    if (error) {
      console.error('[supabaseAdmin] CRITICAL: Service role cannot access animes table:', error.message);
      console.error('[supabaseAdmin] This indicates RLS or service role key issue');
    } else {
      console.log('[supabaseAdmin] Service role access verified');
    }
  } catch (err: any) {
    console.error('[supabaseAdmin] Failed to verify service role access:', err.message);
  }
})();

export type AnimeRow = {
  id: string;
  slug: string | null;
  title: { romaji?: string | null; english?: string | null };
};

export type EpisodeRow = {
  id: string;
  anime_id: string;
  season_id: string;
  episode_number: number;
  video_url: string | null;
  status: string | null;
  error_message?: string | null;
  hls_url?: string | null;
  duration_seconds?: number | null;
  title?: string | null;
  seasons?: { season_number?: number | null } | null;
};

export type SeasonRow = {
  id: string;
  season_number: number;
};

const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'anime';

export async function ensureAnimeSlug(animeId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from('animes').select('slug, title').eq('id', animeId).maybeSingle();
  if (error) throw new Error(`Anime fetch failed: ${error.message}`);
  if (data?.slug) return data.slug;
  const title = data?.title?.romaji || data?.title?.english || `anime-${animeId.slice(0, 8)}`;
  const newSlug = slugify(title);
  const { error: updErr } = await supabaseAdmin.from('animes').update({ slug: newSlug }).eq('id', animeId);
  if (updErr) throw new Error(`Slug update failed: ${updErr.message}`);
  return newSlug;
}

export async function getEpisodesWithSeason(animeId: string): Promise<EpisodeRow[]> {
  const { data, error } = await supabaseAdmin
    .from('episodes')
    .select('id, anime_id, season_id, episode_number, video_url, status, seasons(season_number)')
    .eq('anime_id', animeId)
    .order('episode_number', { ascending: true });
  if (error) throw new Error(`Episode fetch failed: ${error.message}`);
  return (data || []).map((row: any) => ({
    ...row,
    seasons: row.seasons ? { season_number: row.seasons.season_number } : null,
  }));
}

export async function getSeasonsForAnime(animeId: string): Promise<SeasonRow[]> {
  const { data, error } = await supabaseAdmin
    .from('seasons')
    .select('id, season_number')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true });
  if (error) throw new Error(`Season fetch failed: ${error.message}`);
  return (data || []) as SeasonRow[];
}

export async function getSeasonByNumber(animeId: string, seasonNumber: number): Promise<SeasonRow | null> {
  const { data, error } = await supabaseAdmin
    .from('seasons')
    .select('id, season_number')
    .eq('anime_id', animeId)
    .eq('season_number', seasonNumber)
    .maybeSingle();
  if (error) throw new Error(`Season fetch failed: ${error.message}`);
  return data as SeasonRow | null;
}

export async function getEpisodesBySeason(seasonId: string): Promise<EpisodeRow[]> {
  const { data, error } = await supabaseAdmin
    .from('episodes')
    .select('id, anime_id, season_id, episode_number, video_url, status, error_message, hls_url, duration_seconds')
    .eq('season_id', seasonId)
    .order('episode_number', { ascending: true });
  if (error) throw new Error(`Episode fetch failed: ${error.message}`);
  return (data || []) as EpisodeRow[];
}

export async function getEpisodeByKey(animeId: string, seasonId: string, episodeNumber: number): Promise<EpisodeRow | null> {
  const { data, error } = await supabaseAdmin
    .from('episodes')
    .select('id, anime_id, season_id, episode_number, video_url, status, error_message, hls_url, duration_seconds')
    .eq('anime_id', animeId)
    .eq('season_id', seasonId)
    .eq('episode_number', episodeNumber)
    .maybeSingle();
  if (error) throw new Error(`Episode fetch failed: ${error.message}`);
  return data as EpisodeRow | null;
}

export async function upsertEpisodeByKey(params: {
  animeId: string;
  seasonId: string;
  episodeNumber: number;
  cdnUrl: string | null;
  hlsUrl?: string | null;
  durationSeconds?: number | null;
  title?: string | null;
  status?: string | null;
}) {
  const { animeId, seasonId, episodeNumber, cdnUrl, hlsUrl, durationSeconds, title, status } = params;
  const existing = await getEpisodeByKey(animeId, seasonId, episodeNumber);
  
  // Fetch season_number from season_id (CRITICAL: always fetch to ensure season_number is set)
  const { data: season } = await supabaseAdmin
    .from('seasons')
    .select('season_number')
    .eq('id', seasonId)
    .maybeSingle();
  
  if (!season) {
    throw new Error(`Season not found: ${seasonId}`);
  }
  
  const seasonNumber = season.season_number;

  const payload = {
    video_url: cdnUrl,
    hls_url: hlsUrl ?? existing?.hls_url ?? null,
    duration_seconds: durationSeconds ?? existing?.duration_seconds ?? 0,
    status: status || (cdnUrl ? 'ready' : 'pending'),
    error_message: null,
    updated_at: new Date().toISOString(),
    title: title || existing?.title || `Bölüm ${episodeNumber}`,
    season_number: seasonNumber, // 🔥 CRITICAL: Always set season_number (fixes existing episodes with NULL)
  };

  if (existing?.id) {
    const wasReady = existing.status === 'ready';
    const isNowReady = payload.status === 'ready' && cdnUrl;
    
    const { error } = await supabaseAdmin
      .from('episodes')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw new Error(`Episode update failed: ${error.message}`);
    
    // Create notifications if episode just became ready (wasn't ready before, now is ready)
    if (!wasReady && isNowReady) {
      const { error: notifyError } = await supabaseAdmin.rpc('create_episode_notifications', {
        p_anime_id: animeId,
        p_episode_id: existing.id,
        p_episode_number: episodeNumber,
        p_season_number: seasonNumber,
      });
      if (notifyError) {
        console.error(`[upsertEpisodeByKey] Failed to create notifications for episode ${existing.id}:`, notifyError);
      }
    }
    
    return existing.id;
  }

  const insertPayload = {
    ...payload,
    anime_id: animeId,
    season_id: seasonId,
    episode_number: episodeNumber,
    season_number: seasonNumber, // 🔥 CRITICAL: season_number must be set for new episodes
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin
    .from('episodes')
    .insert(insertPayload)
    .select('id')
    .single();
  if (error || !data) throw new Error(`Episode insert failed: ${error?.message}`);
  
  // Create notifications if episode is inserted as ready
  if (insertPayload.status === 'ready' && cdnUrl) {
    const { error: notifyError } = await supabaseAdmin.rpc('create_episode_notifications', {
      p_anime_id: animeId,
      p_episode_id: data.id,
      p_episode_number: episodeNumber,
      p_season_number: seasonNumber,
    });
    if (notifyError) {
      console.error(`[upsertEpisodeByKey] Failed to create notifications for new episode ${data.id}:`, notifyError);
    }
  }
  
  return data.id;
}

export async function ensureSeason(animeId: string, seasonNumber: number): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('seasons')
    .select('id')
    .eq('anime_id', animeId)
    .eq('season_number', seasonNumber)
    .maybeSingle();
  if (error) throw new Error(`Season fetch failed: ${error.message}`);
  if (data?.id) return data.id;
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('seasons')
    .insert({ anime_id: animeId, season_number: seasonNumber, title: `Sezon ${seasonNumber}` })
    .select('id')
    .single();
  if (insErr || !inserted) throw new Error(`Season create failed: ${insErr?.message}`);
  return inserted.id;
}

export function expectedCdn(slug: string, seasonNumber: number, episodeNumber: number) {
  const padded = episodeNumber.toString().padStart(2, '0');
  return `https://anirias-videos.b-cdn.net/${slug}/season-${seasonNumber}/episode-${padded}.mp4`;
}

export async function updateEpisodePath(episodeId: string, cdnUrl: string) {
  // First, get episode details before updating
  const { data: episode, error: fetchError } = await supabaseAdmin
    .from('episodes')
    .select('id, anime_id, season_id, episode_number, seasons(season_number)')
    .eq('id', episodeId)
    .single();

  if (fetchError) throw new Error(`Episode fetch failed: ${fetchError.message}`);
  if (!episode) throw new Error(`Episode not found: ${episodeId}`);

  // Update episode status to ready
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

  // Create notifications for users following this anime
  // This uses the database function created in create_notification_system.sql
  const seasonNumber = (episode.seasons as any)?.season_number || 1;
  const { error: notifyError } = await supabaseAdmin.rpc('create_episode_notifications', {
    p_anime_id: episode.anime_id,
    p_episode_id: episodeId,
    p_episode_number: episode.episode_number,
    p_season_number: seasonNumber,
  });

  // Log notification creation errors but don't fail the episode update
  if (notifyError) {
    console.error(`[updateEpisodePath] Failed to create notifications for episode ${episodeId}:`, notifyError);
  }
}
