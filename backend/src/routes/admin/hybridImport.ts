import { Router, type Request, type Response } from 'express';
import { hybridImportAnime } from '../../services/hybridImport.js';

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
 * POST /api/admin/hybrid-import
 * 
 * Hybrid anime import using AniList + MyAnimeList
 * 
 * Body:
 * {
 *   anilistId: number (required)
 *   malId?: number (optional, for validation)
 *   animelySlug?: string (optional, custom slug)
 * }
 */
router.post('/hybrid-import', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { anilistId, malId, animelySlug } = req.body || {};

    if (!anilistId || typeof anilistId !== 'number') {
      return res.status(400).json({ success: false, error: 'anilistId (number) is required' });
    }

    const result = await hybridImportAnime({
      anilistId: Number(anilistId),
      malId: malId ? Number(malId) : null,
      animelySlug: animelySlug || null,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.errors.join(', ') || 'Hybrid import failed',
        warnings: result.warnings,
      });
    }

    return res.json({
      success: true,
      animeId: result.animeId,
      seasonsCreated: result.seasonsCreated,
      episodesCreated: result.episodesCreated,
      warnings: result.warnings,
      malValidation: result.malValidation,
    });
  } catch (err: any) {
    console.error('[HybridImport] API error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Hybrid import failed' });
  }
});

export default router;

