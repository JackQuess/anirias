import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Supabase admin env vars missing');
}

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceKey);

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
  video_path: string | null;
  stream_url: string | null;
  status: string | null;
  seasons?: { season_number?: number | null } | null;
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
    .select('id, anime_id, season_id, episode_number, video_path, stream_url, status, seasons(season_number)')
    .eq('anime_id', animeId)
    .order('episode_number', { ascending: true });
  if (error) throw new Error(`Episode fetch failed: ${error.message}`);
  return (data || []).map((row: any) => ({
    ...row,
    seasons: row.seasons ? { season_number: row.seasons.season_number } : null,
  }));
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
  return `https://anirias-videos.b-cdn.net/${slug}/season-${seasonNumber}/episode-${episodeNumber}.mp4`;
}

export async function updateEpisodePath(episodeId: string, cdnUrl: string) {
  const { error } = await supabaseAdmin
    .from('episodes')
    .update({
      video_path: cdnUrl,
      stream_url: cdnUrl,
      status: 'ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', episodeId);
  if (error) throw new Error(`Episode update failed: ${error.message}`);
}
