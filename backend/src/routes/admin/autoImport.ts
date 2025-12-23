import { Router, type Request, type Response } from 'express';
import { autoImportQueue, autoImportWorker, workerReady, workerReadyPromise } from '../../queues/autoImport.js';
import { ensureAnimeSlug, ensureSeason, expectedCdn, getEpisodesBySeason, getSeasonByNumber, getSeasonsForAnime, getEpisodeByKey, upsertEpisodeByKey } from '../../services/supabaseAdmin.js';
import { buildAnimelyUrl } from '../../services/episodeResolver.js';
import { runYtDlp } from '../../services/ytDlp.js';
import { uploadToBunny } from '../../services/bunnyUpload.js';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const router = Router();
const fallbackProgress: Record<string, any> = {};

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
    try {
      const job = await autoImportQueue.add('auto-import', { animeId, seasonNumber, mode });
      const ready = await Promise.race([
        workerReadyPromise.then(() => true).catch(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(workerReady), 3000))
      ]);
      if (!ready) throw new Error('Worker not ready, using fallback');
      return res.json({ jobId: job.id, status: 'started', mode: 'worker' });
    } catch (enqueueErr) {
      console.error('[AUTO IMPORT] Worker enqueue failed, using fallback', enqueueErr);
      const jobId = `fallback-${Date.now()}`;
      runFallbackImport(jobId, { animeId, seasonNumber, mode }).catch((err) => {
        console.error('[AUTO IMPORT] Fallback fatal error', err);
      });
      return res.json({ jobId, status: 'started', mode: 'fallback' });
    }
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

router.get('/auto-import/:jobId/progress', async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  const fb = fallbackProgress[req.params.jobId];
  if (fb) {
    return res.status(200).json(fb);
  }
  try {
    const job = await autoImportQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const state = await job.getState();
    const progress: any = job.progress || {};
    res.status(200).json({
      state,
      progress,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason || null,
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

async function runFallbackImport(jobId: string, params: { animeId: string; seasonNumber?: number | null; mode?: 'season' | 'all' }) {
  const { animeId, seasonNumber, mode } = params;
  console.log('[FALLBACK] Start import', { jobId, animeId, seasonNumber, mode });
  const progressState = {
    state: 'active',
    progress: {
      totalEpisodes: 0,
      completedEpisodes: 0,
      currentEpisode: null as number | null,
      status: 'running',
      percent: 0
    },
    finishedOn: null as number | null,
    failedReason: null as string | null
  };
  fallbackProgress[jobId] = progressState;
  try {
    await mkdir('/tmp/anirias', { recursive: true });
    const slug = await ensureAnimeSlug(animeId);
    const seasons = mode === 'all' || seasonNumber == null
      ? await getSeasonsForAnime(animeId)
      : (() => {
          if (seasonNumber == null) return [];
          return getSeasonByNumber(animeId, Number(seasonNumber)).then((s) => (s ? [s] : []));
        })();
    const seasonList = await seasons;
    const episodeQueue: Array<{ seasonNumber: number; episodeNumber: number; seasonId: string }> = [];
    for (const season of seasonList) {
      const episodes = await getEpisodesBySeason(season.id);
      const seen = new Set<number>();
      episodes.forEach((ep) => {
        if (seen.has(ep.episode_number)) return;
        seen.add(ep.episode_number);
        episodeQueue.push({ seasonNumber: season.season_number, episodeNumber: ep.episode_number, seasonId: season.id });
      });
    }
    const totalEpisodes = episodeQueue.length;
    progressState.progress.totalEpisodes = totalEpisodes;
    for (const item of episodeQueue) {
      const { seasonNumber, episodeNumber } = item;
      progressState.progress.currentEpisode = episodeNumber;
      progressState.progress.status = 'downloading';
      progressState.progress.percent = totalEpisodes ? Math.round((progressState.progress.completedEpisodes / totalEpisodes) * 100) : 0;
      console.log('[FALLBACK] START episode', episodeNumber);
      let tmpFile: string | null = null;
      try {
        const seasonId = await ensureSeason(animeId, seasonNumber);
        const cdnUrl = expectedCdn(slug, seasonNumber, episodeNumber);
        const existing = await getEpisodeByKey(animeId, seasonId, episodeNumber);
        if (existing?.video_path === cdnUrl && existing?.stream_url === cdnUrl) {
          progressState.progress.completedEpisodes += 1;
          progressState.progress.percent = totalEpisodes ? Math.round((progressState.progress.completedEpisodes / totalEpisodes) * 100) : 0;
          console.log('[FALLBACK] SKIP episode already ok', episodeNumber);
          continue;
        }
        const remotePath = `${slug}/season-${seasonNumber}/episode-${episodeNumber}.mp4`;
        const sourceUrl = buildAnimelyUrl(slug, seasonNumber, episodeNumber);
        tmpFile = path.join('/tmp/anirias', animeId, `season-${seasonNumber}`, `episode-${episodeNumber}.mp4`);
        await runYtDlp(sourceUrl, tmpFile);
        progressState.progress.status = 'uploading';
        await uploadToBunny(remotePath, tmpFile);
        await upsertEpisodeByKey({
          animeId,
          seasonId,
          episodeNumber,
          cdnUrl,
          hlsUrl: existing?.hls_url ?? null,
          durationSeconds: existing?.duration_seconds ?? 0,
          title: existing?.title || `Bölüm ${episodeNumber}`,
        });
        progressState.progress.completedEpisodes += 1;
        progressState.progress.percent = totalEpisodes ? Math.round((progressState.progress.completedEpisodes / totalEpisodes) * 100) : 0;
        progressState.progress.status = 'done';
        console.log('[FALLBACK] DONE episode', episodeNumber);
      } catch (err) {
        progressState.progress.completedEpisodes += 1;
        progressState.progress.percent = totalEpisodes ? Math.round((progressState.progress.completedEpisodes / totalEpisodes) * 100) : 0;
        progressState.progress.status = 'done';
        console.error('[FALLBACK] FAIL episode', episodeNumber, err);
        continue;
      } finally {
        if (tmpFile) await rm(tmpFile, { force: true });
      }
    }
    progressState.state = 'completed';
    progressState.finishedOn = Date.now();
    progressState.progress.currentEpisode = null;
    progressState.progress.status = 'done';
    progressState.progress.percent = 100;
    fallbackProgress[jobId] = progressState;
    console.log('[FALLBACK] Job completed', jobId);
  } catch (err: any) {
    progressState.state = 'failed';
    progressState.failedReason = err?.message || 'Fallback failed';
    progressState.finishedOn = Date.now();
    fallbackProgress[jobId] = progressState;
    console.error('[FALLBACK] Job failed', jobId, err);
  }
}

export default router;
