import { Router, type Request, type Response } from 'express';
import { autoImportQueue } from '../../queues/autoImport.js';

const router = Router();

router.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

router.post('/auto-import-all', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    console.log('[AUTO IMPORT] HEADER TOKEN', adminToken);
    console.log('[AUTO IMPORT] ENV TOKEN', process.env.ADMIN_TOKEN);
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('[AUTO IMPORT] RAW BODY', req.body);
    const { animeId, seasonNumber, mode } = req.body || {};
    console.log("[AUTO IMPORT] INPUT", {
      animeId,
      seasonNumber,
      mode
    });
    if (!animeId) return res.status(400).json({ success: false, error: 'animeId required' });

    console.log('[AUTO IMPORT] QUEUE ADD');
    const job = await autoImportQueue.add('auto-import', { animeId, seasonNumber, mode });
    return res.json({ jobId: job.id, status: 'queued' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Auto import failed' });
  }
});

router.post('/auto-import', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    console.log('[AUTO IMPORT] HEADER TOKEN', adminToken);
    console.log('[AUTO IMPORT] ENV TOKEN', process.env.ADMIN_TOKEN);
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    console.log('[AUTO IMPORT] RAW BODY', req.body);
    const { animeId, seasonNumber, mode } = req.body || {};
    console.log("[AUTO IMPORT] INPUT", {
      animeId,
      seasonNumber,
      mode
    });
    if (!animeId) return res.status(400).json({ success: false, error: 'animeId required' });

    console.log('[AUTO IMPORT] QUEUE ADD');
    const job = await autoImportQueue.add('auto-import', { animeId, seasonNumber, mode });
    return res.json({ jobId: job.id, status: 'queued' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Auto import failed' });
  }
});

router.get('/auto-import-progress/:jobId', async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  try {
    const job = await autoImportQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const state = await job.getState();
    const progress: any = job.progress || {};
    res.status(200).json({
      status: state,
      totalEpisodes: progress.total ?? 0,
      completed: progress.processed ?? 0,
      failed: progress.failed ?? 0,
      success: progress.success ?? 0,
      currentEpisode: progress.currentEpisode ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Progress fetch failed' });
  }
});

router.get('/bunny/check-file', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const url = req.query.url as string | undefined;
    if (!url) return res.status(400).json({ success: false, error: 'url required' });
    const head = await fetch(url, { method: 'HEAD' });
    return res.json({ exists: head.ok, status: head.status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Check failed' });
  }
});

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number) {
  const queue = [...tasks];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(limit, queue.length); i++) {
    const worker = (async function run() {
      const next = queue.shift();
      if (!next) return;
      try {
        await next();
      } finally {
        if (queue.length > 0) {
          await run();
        }
      }
    })();
    workers.push(worker as unknown as Promise<void>);
  }

  await Promise.all(workers);
}

export default router;
