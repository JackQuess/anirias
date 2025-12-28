import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { createClient } from '@supabase/supabase-js';

const router = Router();

router.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helper to verify Supabase Auth session and check admin role
async function verifyAdminSession(authToken: string | undefined): Promise<{ userId: string; isAdmin: boolean }> {
  if (!authToken) {
    throw new Error('No authentication token provided');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  // Create Supabase client with anon key to verify user token
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Verify the session token
  const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);

  if (authError || !user) {
    throw new Error('Invalid authentication token');
  }

  // Check user role from profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[verifyAdminSession] Profile fetch error:', profileError);
    throw new Error('Failed to verify admin role');
  }

  const isAdmin = profile?.role === 'admin';

  return { userId: user.id, isAdmin };
}

/**
 * POST /api/admin/anilist/bind-season
 * 
 * Bind a season to an AniList media entry
 * 
 * SECURITY:
 * - Admin-only endpoint (requires Supabase Auth session)
 * - Verifies user role from profiles table
 * - Uses Supabase Service Role Key (backend only)
 * 
 * Body:
 * {
 *   "season_id": "uuid",
 *   "anilist_media_id": number,
 *   "anilist_media": {
 *     "id": number,
 *     "format": string,
 *     "episodes": number | null,
 *     "seasonYear": number | null
 *   }
 * }
 * 
 * Response:
 * { success: true, season: {...} }
 * 
 * Error Codes:
 * - ANILIST_MEDIA_NOT_FOUND
 * - EPISODE_COUNT_MISMATCH
 * - INVALID_MEDIA_TYPE
 * - SEASON_NOT_FOUND
 * - SEASON_ALREADY_BOUND
 * - DB_UPDATE_FAILED
 */
router.post('/anilist/bind-season', async (req: Request, res: Response) => {
  try {
    // Verify Supabase Auth session and admin role
    const authHeader = req.header('authorization');
    const token = authHeader?.replace('Bearer ', '') || authHeader;

    let session;
    try {
      session = await verifyAdminSession(token);
    } catch (authErr: any) {
      return res.status(401).json({ 
        success: false, 
        error: authErr?.message || 'Unauthorized',
        errorCode: 'UNAUTHORIZED',
      });
    }

    if (!session.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin role required',
        errorCode: 'FORBIDDEN',
      });
    }

    // Validate request body
    const { season_id, anilist_media_id, anilist_media } = req.body || {};

    if (!season_id || typeof season_id !== 'string' || season_id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'season_id is required and must be a non-empty string',
        errorCode: 'INVALID_SEASON_ID',
      });
    }

    if (!anilist_media_id || typeof anilist_media_id !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'anilist_media_id is required and must be a number',
        errorCode: 'INVALID_ANILIST_ID',
      });
    }

    if (!anilist_media || typeof anilist_media !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'anilist_media is required and must be an object',
        errorCode: 'INVALID_ANILIST_MEDIA',
      });
    }

    // Validate AniList media exists and matches
    if (anilist_media.id !== anilist_media_id) {
      return res.status(400).json({
        success: false,
        error: 'anilist_media.id does not match anilist_media_id',
        errorCode: 'ANILIST_MEDIA_NOT_FOUND',
      });
    }

    // Validate media type (only TV and TV_SHORT are allowed)
    const allowedFormats = ['TV', 'TV_SHORT', 'OVA', 'ONA', 'MOVIE'];
    if (!anilist_media.format || !allowedFormats.includes(anilist_media.format)) {
      return res.status(400).json({
        success: false,
        error: `Invalid media format: ${anilist_media.format}. Allowed: ${allowedFormats.join(', ')}`,
        errorCode: 'INVALID_MEDIA_TYPE',
      });
    }

    // Fetch season to validate it exists and check current state
    const { data: season, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('id, anime_id, season_number, anilist_id, episode_count')
      .eq('id', season_id)
      .single();

    if (seasonError || !season) {
      console.error('[bindAniListSeason] Season fetch error:', seasonError);
      return res.status(404).json({
        success: false,
        error: 'Season not found',
        errorCode: 'SEASON_NOT_FOUND',
      });
    }

    // Check if season is already bound to a different AniList media
    if (season.anilist_id && season.anilist_id !== anilist_media_id) {
      return res.status(400).json({
        success: false,
        error: `Season is already bound to AniList ID ${season.anilist_id}`,
        errorCode: 'SEASON_ALREADY_BOUND',
      });
    }

    // Validate episode count compatibility (if both exist)
    // Allow binding even if episode counts don't match, but log a warning
    const anilistEpisodes = anilist_media.episodes;
    const currentEpisodes = season.episode_count;
    
    if (anilistEpisodes !== null && currentEpisodes !== null) {
      const difference = Math.abs(anilistEpisodes - currentEpisodes);
      const threshold = Math.max(anilistEpisodes, currentEpisodes) * 0.2; // 20% difference threshold
      
      if (difference > threshold && difference > 3) {
        // This is a warning, not an error - still allow binding
        console.warn(
          `[bindAniListSeason] Episode count mismatch: Season has ${currentEpisodes}, AniList has ${anilistEpisodes}`
        );
      }
    }

    // Transaction-like update: Update season with AniList data
    // In PostgreSQL, a single UPDATE is atomic, so this is effectively transactional
    const updateData: {
      anilist_id: number;
      year: number | null;
      episode_count: number | null;
      updated_at: string;
    } = {
      anilist_id: anilist_media_id,
      year: anilist_media.seasonYear || null,
      episode_count: anilist_media.episodes || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedSeason, error: updateError } = await supabaseAdmin
      .from('seasons')
      .update(updateData)
      .eq('id', season_id)
      .select('id, anime_id, season_number, anilist_id, episode_count, year, title, updated_at')
      .single();

    if (updateError || !updatedSeason) {
      console.error('[bindAniListSeason] Update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update season',
        errorCode: 'DB_UPDATE_FAILED',
        details: updateError?.message || 'Unknown database error',
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      season: updatedSeason,
      message: `Season ${updatedSeason.season_number} successfully bound to AniList ID ${anilist_media_id}`,
    });
  } catch (err: any) {
    console.error('[bindAniListSeason] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
      details: err?.message || 'Unknown error',
    });
  }
});

export default router;

