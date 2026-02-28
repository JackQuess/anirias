import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { normalizeOrigin } from '../../utils/cors.js';

const router = Router();

router.use((req, res, next) => {
  const origin = normalizeOrigin(process.env.CORS_ORIGIN) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/**
 * POST /api/admin/create-episode
 * Admin-only episode creation endpoint.
 */
router.post('/create-episode', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = req.body || {};
    const animeId = String(body.anime_id || '').trim();
    const seasonId = String(body.season_id || '').trim();
    const seasonNumber = Number(body.season_number);
    const episodeNumber = Number(body.episode_number);

    if (!animeId || !seasonId || !Number.isFinite(seasonNumber) || !Number.isFinite(episodeNumber)) {
      return res.status(400).json({
        success: false,
        error: 'anime_id, season_id, season_number and episode_number are required',
      });
    }

    const insertPayload: Record<string, any> = {
      anime_id: animeId,
      season_id: seasonId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      title: body.title || `Bolum ${episodeNumber}`,
      hls_url: body.hls_url || null,
      video_url: body.video_url || null,
      duration_seconds: body.duration_seconds ?? null,
      status: body.status || 'pending',
      short_note: body.short_note ?? null,
      air_date: body.air_date ?? null,
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('episodes')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create episode',
        details: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      episode: data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error',
    });
  }
});

export default router;

