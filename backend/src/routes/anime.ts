import { Router, type Request, type Response } from 'express';
import { searchAniList } from '../services/anilist.js';
import { supabaseAdmin } from '../services/supabaseAdmin.js';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

export interface AnimeSearchResult {
  id: number;
  title: string;
  year: number | null;
  image: string | null;
}

/** GET /api/anime/search?source=anilist|mal&q=... — top 10 results */
const router = Router();

/** GET /api/anime/public/featured */
router.get('/public/featured', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('animes')
      .select('*')
      .eq('is_featured', true)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: `Failed to fetch featured animes: ${error.message}` });
    }

    return res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Unexpected featured query error' });
  }
});

/** GET /api/anime/public/list?sortBy=created_at&limit=100 */
router.get('/public/list', async (req: Request, res: Response) => {
  const sortByRaw = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'created_at';
  const allowedSortFields = new Set(['created_at', 'updated_at', 'view_count', 'year', 'score']);
  const sortBy = allowedSortFields.has(sortByRaw) ? sortByRaw : 'created_at';

  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100;

  try {
    const { data, error } = await supabaseAdmin
      .from('animes')
      .select('*')
      .order(sortBy, { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: `Failed to fetch anime list: ${error.message}` });
    }

    return res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Unexpected anime list query error' });
  }
});

/** GET /api/anime/public/latest-episodes?limit=24&offset=0 */
router.get('/public/latest-episodes', async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit);
  const offsetRaw = Number(req.query.offset);

  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 24;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  try {
    const { data, error } = await supabaseAdmin
      .from('episodes')
      .select('id, anime_id, season_id, season_number, episode_number, title, duration_seconds, duration, video_url, hls_url, status, error_message, short_note, air_date, updated_at, created_at, seasons!inner(season_number, anime:animes(*))')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: `Failed to fetch latest episodes: ${error.message}` });
    }

    const rows = Array.isArray(data) ? data : [];
    const flattened = rows.map((item: any) => ({
      ...item,
      anime_id: item.anime_id || item.seasons?.anime?.id || null,
      anime: item.seasons?.anime || item.anime || null,
    }));

    flattened.sort((a: any, b: any) => {
      const aDate = a.air_date ? new Date(a.air_date).getTime() : null;
      const bDate = b.air_date ? new Date(b.air_date).getTime() : null;
      if (aDate !== null && bDate !== null) return bDate - aDate;
      if (aDate !== null && bDate === null) return -1;
      if (aDate === null && bDate !== null) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.json(flattened);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Unexpected latest episodes query error' });
  }
});

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
        title: m.title?.english || m.title?.romaji || m.title?.native || String(m.id),
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
