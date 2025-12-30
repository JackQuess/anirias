import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { normalizeOrigin } from '../../utils/cors.js';

const router = Router();

router.use((req, res, next) => {
  const origin = normalizeOrigin(process.env.CORS_ORIGIN) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/**
 * PUT /api/admin/update-anime/:id
 * 
 * Update an existing anime in the database
 * 
 * SECURITY:
 * - Admin-only endpoint (requires X-ADMIN-TOKEN header)
 * - Uses Supabase Service Role Key (backend only)
 * - Never exposes service role key to client
 * 
 * URL Params:
 * - id: string (anime UUID)
 * 
 * Body (all fields optional):
 * {
 *   "title": string,
 *   "slug": string,
 *   "description": string,
 *   "cover_image": string,
 *   "banner_image": string,
 *   "genres": string[],
 *   "studios": string[],
 *   "status": "ongoing" | "completed" | "upcoming",
 *   "type": "tv" | "movie" | "ova" | "ona" | "special" | "music",
 *   "release_year": number,
 *   "season": "winter" | "spring" | "summer" | "fall",
 *   "rating": string,
 *   "total_episodes": number,
 *   "duration": number,
 *   "mal_id": number,
 *   "anilist_id": number,
 *   "is_featured": boolean,
 * }
 * 
 * Response:
 * { success: true, anime: {...} }
 */
router.put('/update-anime/:id', async (req: Request, res: Response) => {
  try {
    // Check admin authentication
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { id } = req.params;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Anime ID is required',
      });
    }

    // Check if anime exists
    const { data: existingAnime } = await supabaseAdmin
      .from('animes')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existingAnime) {
      return res.status(404).json({
        success: false,
        error: `Anime with ID "${id}" not found`,
      });
    }

    // Prepare update data (only include provided fields)
    const updates: any = {};
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

    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (cover_image !== undefined) updates.cover_image = cover_image;
    if (banner_image !== undefined) updates.banner_image = banner_image;
    if (genres !== undefined) updates.genres = genres;
    if (studios !== undefined) updates.studios = studios;
    if (status !== undefined) updates.status = status;
    if (type !== undefined) updates.type = type;
    if (release_year !== undefined) updates.release_year = release_year;
    if (season !== undefined) updates.season = season;
    if (rating !== undefined) updates.rating = rating;
    if (total_episodes !== undefined) updates.total_episodes = total_episodes;
    if (duration !== undefined) updates.duration = duration;
    if (mal_id !== undefined) updates.mal_id = mal_id;
    if (anilist_id !== undefined) updates.anilist_id = anilist_id;
    if (is_featured !== undefined) updates.is_featured = is_featured;

    // Always update the updated_at timestamp
    updates.updated_at = new Date().toISOString();

    // If no fields to update
    if (Object.keys(updates).length === 1) { // Only updated_at
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    // If slug is being updated, check for duplicates
    if (slug !== undefined) {
      const { data: slugCheck } = await supabaseAdmin
        .from('animes')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .maybeSingle();

      if (slugCheck) {
        return res.status(409).json({
          success: false,
          error: `Slug "${slug}" is already in use by another anime`,
        });
      }
    }

    // Update anime in database using service role
    const { data, error } = await supabaseAdmin
      .from('animes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[update-anime] Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update anime',
        details: error.message,
      });
    }

    if (!data) {
      return res.status(500).json({
        success: false,
        error: 'Anime updated but no data returned',
      });
    }

    // Success
    console.log(`[update-anime] Successfully updated anime: ${data.id} (${data.title})`);
    return res.status(200).json({
      success: true,
      anime: data,
    });
  } catch (err: any) {
    console.error('[update-anime] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err?.message || 'Unknown error',
    });
  }
});

export default router;

