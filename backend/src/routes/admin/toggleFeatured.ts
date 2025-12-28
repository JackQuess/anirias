import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';

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
 * POST /api/admin/toggle-featured
 * 
 * Toggle featured status of an anime
 * 
 * SECURITY:
 * - Admin-only endpoint (requires X-ADMIN-TOKEN header)
 * - Uses Supabase Service Role Key (backend only)
 * - Never exposes service role key to client
 * 
 * Body:
 * {
 *   "anime_id": "uuid",
 *   "featured": true | false
 * }
 * 
 * Response:
 * { success: true, anime_id: "uuid", is_featured: boolean }
 */
router.post('/toggle-featured', async (req: Request, res: Response) => {
  try {
    // Check admin authentication
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Validate request body
    const { anime_id, featured } = req.body || {};

    if (!anime_id || typeof anime_id !== 'string' || anime_id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'anime_id is required and must be a non-empty string',
      });
    }

    if (typeof featured !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'featured is required and must be a boolean',
      });
    }

    // Update anime featured status using service role
    const { data, error } = await supabaseAdmin
      .from('animes')
      .update({
        is_featured: featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', anime_id)
      .select('id, is_featured')
      .single();

    if (error) {
      console.error('[toggle-featured] Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update anime',
        details: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Anime not found',
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      anime_id: data.id,
      is_featured: data.is_featured,
    });
  } catch (err: any) {
    console.error('[toggle-featured] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err?.message || 'Unknown error',
    });
  }
});

export default router;

