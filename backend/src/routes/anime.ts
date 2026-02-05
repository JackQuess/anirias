import { Router, type Request, type Response } from 'express';
import { searchAniList } from '../services/anilist.js';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

export interface AnimeSearchResult {
  id: number;
  title: string;
  year: number | null;
  image: string | null;
}

/** GET /api/anime/search?source=anilist|mal&q=... — top 10 results */
const router = Router();

router.get('/search', async (req: Request, res: Response) => {
  const source = typeof req.query.source === 'string' ? req.query.source.toLowerCase() : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (source !== 'anilist' && source !== 'mal') {
    return res.status(400).json({ error: 'source must be anilist or mal' });
  }
  if (!q) {
    return res.status(400).json({ error: 'q is required' });
  }

  try {
    if (source === 'anilist') {
      const media = await searchAniList(q);
      const results: AnimeSearchResult[] = (media || []).slice(0, 10).map((m) => ({
        id: m.id,
        title: m.title?.romaji || m.title?.english || m.title?.native || String(m.id),
        year: m.seasonYear ?? null,
        image: m.coverImage?.extraLarge || m.coverImage?.large || null,
      }));
      return res.json(results);
    }

    const response = await fetch(
      `${JIKAN_BASE}/anime?q=${encodeURIComponent(q)}&limit=10`
    );
    if (!response.ok) {
      return res.status(502).json({ error: 'Jikan API error' });
    }
    const json = await response.json();
    const data = json.data || [];
    const results: AnimeSearchResult[] = data.slice(0, 10).map((a: any) => ({
      id: a.mal_id ?? a.id,
      title: a.title || String(a.mal_id ?? a.id),
      year: a.year ?? null,
      image: a.images?.jpg?.image_url || a.images?.webp?.image_url || null,
    }));
    return res.json(results);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Search failed';
    return res.status(502).json({ error: msg });
  }
});

export default router;
