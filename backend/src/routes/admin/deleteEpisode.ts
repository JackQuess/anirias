import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { normalizeOrigin } from '../../utils/cors.js';

const router = Router();

router.use((req, res, next) => {
  const origin = normalizeOrigin(process.env.CORS_ORIGIN) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/**
 * DELETE /api/admin/delete-episode/:id
 * Admin-only episode deletion endpoint.
 */
router.delete('/delete-episode/:id', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, error: 'Episode ID is required' });
    }

    const { error } = await supabaseAdmin
      .from('episodes')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete episode',
        details: error.message,
      });
    }

    return res.status(200).json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error',
    });
  }
});

export default router;

