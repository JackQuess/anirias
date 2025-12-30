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
 * POST /api/admin/create-anime
 * 
 * Create a new anime in the database
 * 
 * SECURITY:
 * - Admin-only endpoint (requires X-ADMIN-TOKEN header)
 * - Uses Supabase Service Role Key (backend only)
 * - Never exposes service role key to client
 * 
 * Body:
 * {
 *   "title": string (required),
 *   "slug": string (required, unique),
 *   "description": string (optional),
 *   "cover_image": string (optional),
 *   "banner_image": string (optional),
 *   "genres": string[] (optional),
 *   "studios": string[] (optional),
 *   "status": "ongoing" | "completed" | "upcoming" (required),
 *   "type": "tv" | "movie" | "ova" | "ona" | "special" | "music" (optional),
 *   "release_year": number (optional),
 *   "season": "winter" | "spring" | "summer" | "fall" (optional),
 *   "rating": string (optional),
 *   "total_episodes": number (optional),
 *   "duration": number (optional),
 *   "mal_id": number (optional),
 *   "anilist_id": number (optional),
 *   "is_featured": boolean (optional, default: false),
 * }
 * 
 * Response:
 * { success: true, anime: {...} }
 */
router.post('/create-anime', async (req: Request, res: Response) => {
  try {
    // Check admin authentication
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    // Validate required fields
    const { 
      title,
      slug,
      description,
      cover_image,
      banner_image,
      genres,
      studios,
      status,
      type,
      release_year,
      season,
      rating,
      total_episodes,
      duration,
      mal_id,
      anilist_id,
      is_featured,
    } = req.body || {};

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'title is required and must be a non-empty string',
      });
    }

    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'slug is required and must be a non-empty string',
      });
    }

    if (!status || !['ongoing', 'completed', 'upcoming'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'status is required and must be one of: ongoing, completed, upcoming',
      });
    }

    // Check if slug already exists
    const { data: existingAnime } = await supabaseAdmin
      .from('animes')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (existingAnime) {
      return res.status(409).json({
        success: false,
        error: `Anime with slug "${slug}" already exists`,
        existingAnimeId: existingAnime.id,
      });
    }

    // Prepare anime data (Supabase will auto-generate UUID for id)
    const animeData: any = {
      title: title.trim(),
      slug: slug.trim(),
      description: description || null,
      cover_image: cover_image || null,
      banner_image: banner_image || null,
      genres: genres || [],
      studios: studios || [],
      status: status,
      type: type || 'tv',
      release_year: release_year || null,
      season: season || null,
      rating: rating || null,
      total_episodes: total_episodes || null,
      duration: duration || null,
      mal_id: mal_id || null,
      anilist_id: anilist_id || null,
      is_featured: is_featured || false,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert anime into database using service role
    const { data, error } = await supabaseAdmin
      .from('animes')
      .insert(animeData)
      .select()
      .single();

    if (error) {
      console.error('[create-anime] Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create anime',
        details: error.message,
      });
    }

    if (!data) {
      return res.status(500).json({
        success: false,
        error: 'Anime created but no data returned',
      });
    }

    // Success
    console.log(`[create-anime] Successfully created anime: ${data.id} (${data.title})`);
    return res.status(201).json({
      success: true,
      anime: data,
    });
  } catch (err: any) {
    console.error('[create-anime] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err?.message || 'Unknown error',
    });
  }
});

export default router;

