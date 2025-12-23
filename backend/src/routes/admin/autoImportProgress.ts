import { Router, type Request, type Response } from 'express';
import { autoImportQueue } from '../../queues/autoImport.js';

const router = Router();

router.get('/auto-import-progress', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const jobId = req.query.jobId as string | undefined;
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId required' });
    }

    const job = await autoImportQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress || {};

    return res.json({
      jobId: job.id,
      status: state,
      progress,
      data: job.data,
      failedReason: job.failedReason || null,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Progress fetch failed' });
  }
});

export default router;
