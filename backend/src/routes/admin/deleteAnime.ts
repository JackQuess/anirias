import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { normalizeOrigin } from '../../utils/cors.js';

const router = Router();

router.use((req, res, next) => {
  // Allow production domain and Vercel
  const allowedOrigins = [
    normalizeOrigin('https://anirias.com'),
    'https://anirias.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  const origin = normalizeOrigin(req.headers.origin);
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/**
 * POST /api/admin/delete-anime
 * 
 * Completely delete an anime and ALL related data:
 * - seasons (cascade)
 * - episodes (cascade)
 * - watch_progress (cascade)
 * - watch_history (cascade)
 * - watchlist (cascade)
 * - comments (cascade)
 * - notifications (if exists)
 * 
 * Body:
 * {
 *   animeId: string (required)
 * }
 */
router.post('/delete-anime', async (req: Request, res: Response) => {
  try {
    // Read admin token from header (case-insensitive)
    const adminToken = req.headers['x-admin-token'] || req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId } = req.body;
    if (!animeId || typeof animeId !== 'string') {
      return res.status(400).json({ success: false, error: 'animeId is required' });
    }

    // Verify anime exists
    const { data: anime, error: fetchError } = await supabaseAdmin
      .from('animes')
      .select('id, title')
      .eq('id', animeId)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ success: false, error: `Failed to fetch anime: ${fetchError.message}` });
    }

    if (!anime) {
      return res.status(404).json({ success: false, error: 'Anime not found' });
    }

    // Get counts before deletion for logging
    const { count: seasonsCount } = await supabaseAdmin
      .from('seasons')
      .select('*', { count: 'exact', head: true })
      .eq('anime_id', animeId);

    const { count: episodesCount } = await supabaseAdmin
      .from('episodes')
      .select('*', { count: 'exact', head: true })
      .eq('anime_id', animeId);

    const { count: watchlistCount } = await supabaseAdmin
      .from('watchlist')
      .select('*', { count: 'exact', head: true })
      .eq('anime_id', animeId);

    const { count: progressCount } = await supabaseAdmin
      .from('watch_progress')
      .select('*', { count: 'exact', head: true })
      .eq('anime_id', animeId);

    const { count: historyCount } = await supabaseAdmin
      .from('watch_history')
      .select('*', { count: 'exact', head: true })
      .eq('anime_id', animeId);

    const { count: commentsCount } = await supabaseAdmin
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('anime_id', animeId);

    // Delete anime (cascade will handle related tables)
    // Using Supabase admin client to bypass RLS
    const { error: deleteError } = await supabaseAdmin
      .from('animes')
      .delete()
      .eq('id', animeId);

    if (deleteError) {
      return res.status(500).json({ 
        success: false, 
        error: `Failed to delete anime: ${deleteError.message}` 
      });
    }

    // Verify deletion
    const { data: verifyAnime } = await supabaseAdmin
      .from('animes')
      .select('id')
      .eq('id', animeId)
      .maybeSingle();

    if (verifyAnime) {
      return res.status(500).json({ 
        success: false, 
        error: 'Anime deletion failed - anime still exists' 
      });
    }

    return res.json({
      success: true,
      message: 'Anime and all related data deleted successfully',
      deleted: {
        anime: 1,
        seasons: seasonsCount || 0,
        episodes: episodesCount || 0,
        watchlist: watchlistCount || 0,
        watch_progress: progressCount || 0,
        watch_history: historyCount || 0,
        comments: commentsCount || 0,
      }
    });
  } catch (error: any) {
    console.error('[deleteAnime] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    });
  }
});

export default router;

