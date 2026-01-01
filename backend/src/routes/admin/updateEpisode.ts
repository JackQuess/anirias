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
 * PUT /api/admin/update-episode/:id
 *
 * Update an existing episode in the database
 *
 * SECURITY:
 * - Admin-only endpoint (requires X-ADMIN-TOKEN header)
 * - Uses Supabase Service Role Key (backend only)
 *
 * URL Params:
 * - id: string (episode UUID)
 *
 * Body (all fields optional):
 * {
 *   "air_date": string | null,
 *   "status": string,
 *   "episode_number": number,
 *   "short_note": string | null
 * }
 *
 * Response:
 * { success: true, episode: {...} }
 */
router.put('/update-episode/:id', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Episode ID is required',
      });
    }

    const body = req.body || {};
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if ('air_date' in body) updates.air_date = body.air_date;
    if ('status' in body) updates.status = body.status;
    if ('episode_number' in body) updates.episode_number = body.episode_number;
    if ('short_note' in body) updates.short_note = body.short_note;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('episodes')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[update-episode] Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update episode',
        details: error.message,
      });
    }

    if (!data) {
      return res.status(500).json({
        success: false,
        error: 'Episode updated but no data returned',
      });
    }

    return res.status(200).json({
      success: true,
      episode: data,
    });
  } catch (err: any) {
    console.error('[update-episode] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err?.message || 'Unknown error',
    });
  }
});

export default router;
