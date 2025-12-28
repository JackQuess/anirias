import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';

const router = Router();

router.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/**
 * POST /api/admin/create-season
 * 
 * Create a new season for an anime
 * 
 * SECURITY:
 * - Admin-only endpoint (requires X-ADMIN-TOKEN header)
 * - Uses Supabase Service Role Key (backend only)
 * 
 * Body:
 * {
 *   "anime_id": "uuid",
 *   "season_number": number,
 *   "title": string (optional),
 *   "anilist_id": number | null (optional),
 *   "episode_count": number | null (optional),
 *   "expected_episode_count": number (optional, for auto-creating episodes)
 * }
 * 
 * Response:
 * { success: true, season: {...}, episodesCreated: number }
 */
router.post('/create-season', async (req: Request, res: Response) => {
  try {
    // Check admin authentication
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Validate request body
    const { 
      anime_id, 
      season_number, 
      title, 
      anilist_id, 
      episode_count,
      expected_episode_count 
    } = req.body || {};

    if (!anime_id || typeof anime_id !== 'string' || anime_id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'anime_id is required and must be a non-empty string',
      });
    }

    if (!season_number || typeof season_number !== 'number' || season_number < 1) {
      return res.status(400).json({
        success: false,
        error: 'season_number is required and must be a positive number',
      });
    }

    // Verify anime exists
    const { data: anime, error: animeError } = await supabaseAdmin
      .from('animes')
      .select('id')
      .eq('id', anime_id)
      .maybeSingle();

    if (animeError) {
      console.error('[create-season] Anime fetch error:', animeError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify anime',
        details: animeError.message,
      });
    }

    if (!anime) {
      return res.status(404).json({
        success: false,
        error: 'Anime not found',
      });
    }

    // Check if season with this number already exists
    const { data: existingSeason, error: checkError } = await supabaseAdmin
      .from('seasons')
      .select('id, season_number')
      .eq('anime_id', anime_id)
      .eq('season_number', season_number)
      .maybeSingle();

    if (checkError) {
      console.error('[create-season] Season check error:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check existing seasons',
        details: checkError.message,
      });
    }

    if (existingSeason) {
      return res.status(400).json({
        success: false,
        error: `Season ${season_number} already exists for this anime`,
      });
    }

    // Create season
    const seasonTitle = title || `Sezon ${season_number}`;
    const { data: newSeason, error: createError } = await supabaseAdmin
      .from('seasons')
      .insert({
        anime_id,
        season_number,
        title: seasonTitle,
        anilist_id: anilist_id || null,
        episode_count: episode_count || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, anime_id, season_number, title, anilist_id, episode_count, created_at')
      .single();

    if (createError || !newSeason) {
      console.error('[create-season] Season create error:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create season',
        details: createError?.message || 'Unknown error',
      });
    }

    // Auto-create episodes if expected_episode_count is provided
    let episodesCreated = 0;
    if (expected_episode_count && expected_episode_count > 0) {
      const episodePromises = [];
      for (let epNum = 1; epNum <= expected_episode_count; epNum++) {
        episodePromises.push(
          supabaseAdmin
            .from('episodes')
            .insert({
              anime_id,
              season_id: newSeason.id,
              season_number: season_number,
              episode_number: epNum,
              title: `Bölüm ${epNum}`,
              duration_seconds: 1440,
              status: 'pending',
              video_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
        );
      }

      const results = await Promise.all(episodePromises);
      episodesCreated = results.filter(r => !r.error).length;

      if (episodesCreated < expected_episode_count) {
        console.warn(
          `[create-season] Created ${episodesCreated} of ${expected_episode_count} episodes`
        );
      }
    }

    // Success
    return res.status(200).json({
      success: true,
      season: newSeason,
      episodesCreated,
      message: `Season ${season_number} created successfully${episodesCreated > 0 ? ` with ${episodesCreated} episodes` : ''}`,
    });
  } catch (err: any) {
    console.error('[create-season] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err?.message || 'Unknown error',
    });
  }
});

export default router;

