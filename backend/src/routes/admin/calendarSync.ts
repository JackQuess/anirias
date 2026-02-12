import { Router, type Request, type Response } from 'express';
import { runAiringScheduleSyncJob } from '../../jobs/syncAiringSchedule.js';
import { normalizeOrigin } from '../../utils/cors.js';

const router = Router();

router.use((req, res, next) => {
  const origin = normalizeOrigin(process.env.CORS_ORIGIN) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

router.post('/calendar/sync', async (req: Request, res: Response) => {
  const adminToken = req.header('x-admin-token');
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await runAiringScheduleSyncJob();
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Sync failed' });
  }
});

export default router;
