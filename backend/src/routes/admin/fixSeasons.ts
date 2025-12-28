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

    // Return 200 even if no seasons/episodes found (successful operation, just nothing to fix)
    // Only return 500 if there were actual errors during processing
    if (!result.success && result.errors.length > 0) {
      // Check if it's a "not found" case (should be 200, not 500)
      const isNotFound = result.errors.some(e => 
        e.includes('not found') || 
        e.includes('No episodes found') ||
        e.includes('Anime not found')
      );

      if (isNotFound) {
        return res.status(200).json({
          success: true,
          seasonsFixed: result.seasonsFixed,
          seasonsRemoved: result.seasonsRemoved,
          episodesReassigned: result.episodesReassigned,
          message: result.errors.join(', '),
          warnings: result.errors,
        });
      }

      // Real errors - return 500 with detailed error info
      return res.status(500).json({
        success: false,
        error: result.errors.join(' | '),
        errors: result.errors,
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
    // Log full error with stack trace
    console.error('[FixSeasons] API CRITICAL ERROR:', {
      message: err?.message || 'Unknown error',
      stack: err?.stack,
      body: req.body,
    });
    return res.status(500).json({ 
      success: false, 
      error: err?.message || 'Fix seasons failed',
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
    });
  }
});

export default router;

