import { Router } from 'express';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { runYtDlp } from '../../services/ytDlp';
import { uploadToBunny } from '../../services/bunnyUpload';
import {
  ensureAnimeSlug,
  ensureSeason,
  expectedCdn,
  getEpisodesWithSeason,
  updateEpisodePath,
} from '../../services/supabaseAdmin';
import { buildSourceUrl } from '../../services/episodeResolver';

const router = Router();
const TMP_ROOT = '/tmp/anirias';
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || 2);

router.post('/auto-import-all', async (req, res) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId, urlTemplate, seasonNumber } = req.body || {};
    if (!animeId) return res.status(400).json({ success: false, error: 'animeId required' });

    await mkdir(TMP_ROOT, { recursive: true });

    const slug = await ensureAnimeSlug(animeId);
    const episodes = await getEpisodesWithSeason(animeId);
    const filtered = seasonNumber ? episodes.filter((ep) => (ep.seasons?.season_number || 1) === Number(seasonNumber)) : episodes;

    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    const tasks = filtered.map((ep) => async () => {
      const seasonNum = ep.seasons?.season_number || 1;
      await ensureSeason(animeId, seasonNum);
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

    await runWithConcurrency(tasks, MAX_CONCURRENCY);

    return res.json({
      success: failed === 0,
      total: filtered.length,
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
