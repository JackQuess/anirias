import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin.js';

const router = Router();

/**
 * GET /api/watch/:slug/:seasonNumber/:episodeNumber
 *
 * Aggregated watch page payload for a given anime slug, season and episode.
 * Returns:
 * {
 *   anime,
 *   season,
 *   episode,
 *   seasons: [...],
 *   episodes: [...]
 * }
 */
router.get('/:slug/:seasonNumber/:episodeNumber', async (req: Request, res: Response) => {
  const { slug, seasonNumber, episodeNumber } = req.params;

  const seasonNum = Number.parseInt(seasonNumber, 10);
  const episodeNum = Number.parseInt(episodeNumber, 10);

  if (!slug || !seasonNumber || !episodeNumber || Number.isNaN(seasonNum) || Number.isNaN(episodeNum)) {
    return res.status(400).json({ error: 'Invalid slug, seasonNumber or episodeNumber' });
  }

  try {
    // 1) Anime by slug
    const { data: anime, error: animeError } = await supabaseAdmin
      .from('animes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (animeError) {
      return res.status(500).json({ error: `Failed to fetch anime: ${animeError.message}` });
    }

    if (!anime) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    // 2) All seasons for this anime (for tabs / navigation)
    const { data: seasons, error: seasonsError } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('anime_id', anime.id)
      .order('season_number', { ascending: true });

    if (seasonsError) {
      return res.status(500).json({ error: `Failed to fetch seasons: ${seasonsError.message}` });
    }

    if (!seasons || seasons.length === 0) {
      return res.status(404).json({ error: 'No seasons found for anime' });
    }

    const season = seasons.find((s: any) => s.season_number === seasonNum);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    // 3) All episodes for this season
    const { data: episodes, error: episodesError } = await supabaseAdmin
      .from('episodes')
      .select('id, anime_id, season_id, season_number, episode_number, title, duration_seconds, duration, video_url, hls_url, status, error_message, short_note, air_date, updated_at, created_at')
      .eq('season_id', season.id)
      .order('episode_number', { ascending: true });

    if (episodesError) {
      return res.status(500).json({ error: `Failed to fetch episodes: ${episodesError.message}` });
    }

    if (!episodes || episodes.length === 0) {
      return res.status(404).json({ error: 'No episodes found for season' });
    }

    const episode = episodes.find((ep: any) => ep.episode_number === episodeNum);
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    return res.json({
      anime,
      season,
      episode,
      seasons,
      episodes,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[watchPage] Error:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

export default router;

