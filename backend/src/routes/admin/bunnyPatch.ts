import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';

const router = Router();

router.post('/bunny-patch', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId, seasonNumber, overwrite } = req.body || {};
    if (!animeId || !seasonNumber) {
      return res.status(400).json({ success: false, error: 'animeId and seasonNumber required' });
    }

    const { data, error } = await supabaseAdmin.rpc('bunny_patch_season', {
      p_anime_id: animeId,
      p_season_number: Number(seasonNumber),
      p_overwrite: !!overwrite
    });
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, patched: data ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Patch failed' });
  }
});

export default router;
