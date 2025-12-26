import { Router, type Request, type Response } from 'express';
import { fixSeasonsForAnime } from '../../services/fixSeasons.js';

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
 * POST /api/admin/fix-seasons
 * 
 * Fix season structure for an anime
 * 
 * Body:
 * {
 *   animeId: string (required)
 * }
 */
router.post('/fix-seasons', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId } = req.body || {};

    if (!animeId || typeof animeId !== 'string') {
      return res.status(400).json({ success: false, error: 'animeId (string) is required' });
    }

    const result = await fixSeasonsForAnime(animeId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.errors.join(', ') || 'Fix seasons failed',
        seasonsFixed: result.seasonsFixed,
        seasonsRemoved: result.seasonsRemoved,
        episodesReassigned: result.episodesReassigned,
      });
    }

    return res.json({
      success: true,
      seasonsFixed: result.seasonsFixed,
      seasonsRemoved: result.seasonsRemoved,
      episodesReassigned: result.episodesReassigned,
      message: 'Sezonlar başarıyla düzeltildi',
    });
  } catch (err: any) {
    console.error('[FixSeasons] API error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Fix seasons failed' });
  }
});

export default router;

