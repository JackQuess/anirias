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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** GET /api/anime/public/item/:identifier */
router.get('/public/item/:identifier', async (req: Request, res: Response) => {
  const identifier = String(req.params.identifier || '').trim();
  if (!identifier) {
    return res.status(400).json({ error: 'identifier is required' });
  }

  try {
    let query = supabaseAdmin.from('animes').select('*');
    if (UUID_RE.test(identifier)) {
      query = query.eq('id', identifier);
    } else {
      query = query.eq('slug', identifier);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      return res.status(500).json({ error: `Failed to fetch anime: ${error.message}` });
    }
    if (!data) {
      return res.status(404).json({ error: 'Anime not found' });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Unexpected anime detail query error' });
  }
});

/** GET /api/anime/public/:animeId/episodes?seasonId=... */
router.get('/public/:animeId/episodes', async (req: Request, res: Response) => {
  const animeId = String(req.params.animeId || '').trim();
  const seasonId = typeof req.query.seasonId === 'string' ? req.query.seasonId.trim() : '';
  if (!animeId) {
    return res.status(400).json({ error: 'animeId is required' });
  }

  try {
    const { data: seasons, error: seasonsError } = await supabaseAdmin
      .from('seasons')
      .select('id, season_number')
      .eq('anime_id', animeId)
      .order('season_number', { ascending: true });

    if (seasonsError) {
      return res.status(500).json({ error: `Failed to fetch seasons: ${seasonsError.message}` });
    }

    if (!seasons || seasons.length === 0) {
      return res.json([]);
    }

    const seasonIds = seasons.map((s: any) => s.id);
    const seasonMap = new Map(seasons.map((s: any) => [s.id, s.season_number]));

    let query = supabaseAdmin
      .from('episodes')
      .select('id, anime_id, season_id, season_number, episode_number, title, duration_seconds, duration, video_url, hls_url, status, error_message, short_note, air_date, updated_at, created_at')
      .in('season_id', seasonIds);

    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data, error } = await query.order('episode_number', { ascending: true });
    if (error) {
      return res.status(500).json({ error: `Failed to fetch episodes: ${error.message}` });
    }

    const episodes = (Array.isArray(data) ? data : []).map((ep: any) => ({
      ...ep,
      season_number: ep.season_number ?? seasonMap.get(ep.season_id) ?? 0,
      anime_id: ep.anime_id || animeId,
    }));

    episodes.sort((a: any, b: any) => {
      const aSeason = a.season_number ?? 0;
      const bSeason = b.season_number ?? 0;
      if (aSeason !== bSeason) return aSeason - bSeason;
      return a.episode_number - b.episode_number;
    });

    return res.json(episodes);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Unexpected episodes query error' });
  }
});

/** GET /api/anime/public/:animeId/similar?limit=6 */
router.get('/public/:animeId/similar', async (req: Request, res: Response) => {
  const animeId = String(req.params.animeId || '').trim();
  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 20) : 6;

  if (!animeId) {
    return res.status(400).json({ error: 'animeId is required' });
  }

  try {
    const { data: current, error: currentError } = await supabaseAdmin
      .from('animes')
      .select('genres')
      .eq('id', animeId)
      .maybeSingle();

    if (currentError) {
      return res.status(500).json({ error: `Failed to fetch source anime: ${currentError.message}` });
    }

    const genres = Array.isArray((current as any)?.genres) ? (current as any).genres.slice(0, 2) : [];
    if (genres.length === 0) return res.json([]);

    const { data, error } = await supabaseAdmin
      .from('animes')
      .select('*')
      .overlaps('genres', genres)
      .neq('id', animeId)
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: `Failed to fetch similar animes: ${error.message}` });
    }

    return res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Unexpected similar animes query error' });
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
