import { Router, Request, Response } from 'express';
import {
  buildEpisodeSynopsisMap,
  getCachedSynopsisMap,
  setCachedSynopsisMap,
} from '../services/episodeSynopsisMap.js';

const router = Router();

/**
 * GET /api/meta/episode-synopses?anilistId=123
 * Bölüm numarası → kısa metin (Jikan/MAL + isteğe bağlı AniList streaming başlığı)
 */
router.get('/meta/episode-synopses', async (req: Request, res: Response) => {
  const raw = req.query.anilistId;
  const anilistId = typeof raw === 'string' ? parseInt(raw, 10) : Array.isArray(raw) ? parseInt(String(raw[0]), 10) : NaN;
  if (!Number.isFinite(anilistId) || anilistId <= 0) {
    return res.status(400).json({ error: 'Geçerli anilistId gerekli' });
  }

  try {
    const hit = getCachedSynopsisMap(anilistId);
    if (hit) {
      return res.json({ synopses: hit, cached: true });
    }
    const synopses = await buildEpisodeSynopsisMap(anilistId);
    setCachedSynopsisMap(anilistId, synopses);
    return res.json({ synopses, cached: false });
  } catch (err: any) {
    console.error('[episode-synopses]', err);
    return res.status(500).json({ error: err?.message || 'episode-synopses failed' });
  }
});

export default router;
