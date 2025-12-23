import { Router, type Request, type Response } from 'express';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { runYtDlp } from '../../services/ytDlp.js';
import { uploadToBunny } from '../../services/bunnyUpload.js';
import {
  ensureAnimeSlug,
  ensureSeason,
  expectedCdn,
  getEpisodesBySeason,
  getSeasonByNumber,
  getSeasonsForAnime,
  getEpisodeByKey,
  upsertEpisodeByKey,
} from '../../services/supabaseAdmin.js';
import { buildAnimelyUrl } from '../../services/episodeResolver.js';

const router = Router();
const TMP_ROOT = '/tmp/anirias';
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || 2);
let importProgress: {
  total: number;
  processed: number;
  success: number;
  failed: number;
  currentEpisode: number | null;
  status: 'idle' | 'running' | 'done';
} = { total: 0, processed: 0, success: 0, failed: 0, currentEpisode: null, status: 'idle' };

router.post('/auto-import-all', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId, seasonNumber, mode } = req.body || {};
    console.log("[AUTO IMPORT] INPUT", {
      animeId,
      seasonNumber,
      mode
    });
    if (!animeId) return res.status(400).json({ success: false, error: 'animeId required' });

    await mkdir(TMP_ROOT, { recursive: true });

    const slug = await ensureAnimeSlug(animeId);
    let seasons;
    if (mode === 'all' || seasonNumber === null || seasonNumber === undefined) {
      seasons = await getSeasonsForAnime(animeId);
    } else {
      const season = await getSeasonByNumber(animeId, Number(seasonNumber));
      if (!season) return res.status(404).json({ success: false, error: 'Season not found' });
      seasons = [season];
    }
    console.log("[AUTO IMPORT] SEASONS FOUND", seasons.length);

    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    const tasks: Array<() => Promise<void>> = [];

    for (const season of seasons) {
      console.log("[AUTO IMPORT] CURRENT SEASON", season.season_number, season.id);
      const episodes = await getEpisodesBySeason(season.id);
      console.log("[AUTO IMPORT] EPISODES FOUND", episodes.length);
      const seen = new Set<number>();
      episodes.forEach((ep) => {
        if (seen.has(ep.episode_number)) return;
        seen.add(ep.episode_number);
        tasks.push(async () => {
          const seasonNum = season.season_number;
          const seasonId = await ensureSeason(animeId, seasonNum);
          console.log("[AUTO IMPORT] SEASON FOUND", seasonId);
          const cdnUrl = expectedCdn(slug, seasonNum, ep.episode_number);
          const existing = await getEpisodeByKey(animeId, seasonId, ep.episode_number);
          if (existing?.video_path === cdnUrl && existing?.stream_url === cdnUrl) {
            skipped += 1;
            importProgress.processed = downloaded + skipped + failed;
            return;
          }

          const remotePath = `${slug}/season-${seasonNum}/episode-${ep.episode_number}.mp4`;
          const sourceUrl = buildAnimelyUrl(slug, seasonNum, ep.episode_number);
          const tmpFile = path.join(TMP_ROOT, animeId, `season-${seasonNum}`, `episode-${ep.episode_number}.mp4`);

          try {
            importProgress.currentEpisode = ep.episode_number;
            console.log("[AUTO IMPORT] START Ep", ep.episode_number);
            await runYtDlp(sourceUrl, tmpFile);
            downloaded += 1;
            await uploadToBunny(remotePath, tmpFile);
            await upsertEpisodeByKey({
              animeId,
              seasonId,
              episodeNumber: ep.episode_number,
              cdnUrl,
              hlsUrl: existing?.hls_url ?? null,
              durationSeconds: existing?.duration_seconds ?? 0,
              title: existing?.title || `Bölüm ${ep.episode_number}`,
            });
            console.log("[AUTO IMPORT] DONE Ep", ep.episode_number);
            importProgress.success = downloaded;
            importProgress.processed = downloaded + skipped + failed;
          } catch (err: any) {
            failed += 1;
            // eslint-disable-next-line no-console
            console.error(`[AUTO IMPORT] FAIL Ep ${ep.episode_number}`, err?.message || err);
            importProgress.failed = failed;
            importProgress.processed = downloaded + skipped + failed;
          } finally {
            await rm(tmpFile, { force: true });
          }
        });
      });
    }

    importProgress = { total: tasks.length, processed: 0, success: 0, failed: 0, currentEpisode: null, status: 'running' };
    await runWithConcurrency(tasks, MAX_CONCURRENCY);
    importProgress.status = 'done';

    return res.json({
      success: failed === 0,
      total: tasks.length,
      downloaded,
      skipped,
      failed,
    });
  } catch (err: any) {
    importProgress.status = 'failed';
    return res.status(500).json({ success: false, error: err?.message || 'Auto import failed' });
  }
});

router.get('/auto-import-progress', (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.status(200).json(importProgress);
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
