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
  updateEpisodePath,
} from '../../services/supabaseAdmin.js';
import { buildSourceUrl } from '../../services/episodeResolver.js';

const router = Router();
const TMP_ROOT = '/tmp/anirias';
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || 2);

router.post('/auto-import-all', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId, urlTemplate, seasonNumber, mode } = req.body || {};
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
      episodes.forEach((ep) => {
        tasks.push(async () => {
          const seasonNum = season.season_number;
          const seasonId = await ensureSeason(animeId, seasonNum);
          console.log("[AUTO IMPORT] SEASON FOUND", seasonId);
          const cdnUrl = expectedCdn(slug, seasonNum, ep.episode_number);
          if (ep.video_path === cdnUrl && ep.stream_url === cdnUrl) {
            skipped += 1;
            return;
          }

          const remotePath = `${slug}/season-${seasonNum}/episode-${ep.episode_number}.mp4`;
          const sourceUrl = buildSourceUrl(slug, seasonNum, ep.episode_number, urlTemplate);
          const tmpFile = path.join(TMP_ROOT, animeId, `season-${seasonNum}`, `episode-${ep.episode_number}.mp4`);

          try {
            await runYtDlp(sourceUrl, tmpFile);
            downloaded += 1;
            await uploadToBunny(remotePath, tmpFile);
            await updateEpisodePath(ep.id, cdnUrl);
          } catch (err: any) {
            failed += 1;
            // eslint-disable-next-line no-console
            console.error(`[AutoImport] Ep ${ep.episode_number} failed:`, err?.message || err);
          } finally {
            await rm(tmpFile, { force: true });
          }
        });
      });
    }

    await runWithConcurrency(tasks, MAX_CONCURRENCY);

    return res.json({
      success: failed === 0,
      total: tasks.length,
      downloaded,
      skipped,
      failed,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Auto import failed' });
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
