import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import { ensureAnimeSlug, ensureSeason, expectedCdn, getEpisodesBySeason, getSeasonByNumber, getSeasonsForAnime, getEpisodeByKey, upsertEpisodeByKey } from '../services/supabaseAdmin.js';
import { buildAnimelyUrl } from '../services/episodeResolver.js';
import { runYtDlp } from '../services/ytDlp.js';
import { uploadToBunny } from '../services/bunnyUpload.js';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const redisUrl = process.env.REDIS_URL;
const connection: ConnectionOptions | undefined = redisUrl
  ? (() => {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: Number(url.port || 6379),
        password: url.password || undefined,
        username: url.username || undefined,
      };
    })()
  : undefined;

console.log('[WORKER] Bootstrapping auto-import queue/worker');
export const autoImportQueue = new Queue('auto-import', { connection });
autoImportQueue
  .waitUntilReady()
  .then(() => console.log('[WORKER] Queue connected to Redis'))
  .catch((err) => console.error('[WORKER] Queue connection error', err));

const TMP_ROOT = '/tmp/anirias';
type JobData = { animeId: string; seasonNumber?: number | null; mode?: 'season' | 'all' };

export const autoImportWorker = new Worker<JobData>('auto-import', async (job: Job<JobData>) => {
  console.log('[WORKER] Job received', { jobId: job.id, data: job.data });
  try {
    const { animeId, seasonNumber, mode } = job.data;
    await mkdir(TMP_ROOT, { recursive: true });
    console.log('[WORKER] Ensuring slug');
    const slug = await ensureAnimeSlug(animeId);
    console.log('[WORKER] Fetching seasons');
    const seasons = mode === 'all' || seasonNumber == null
      ? await getSeasonsForAnime(animeId)
      : (() => {
          if (seasonNumber == null) return [];
          return getSeasonByNumber(animeId, Number(seasonNumber)).then((s) => (s ? [s] : []));
        })();
    const seasonList = await seasons;
    const episodeQueue: Array<{ seasonNumber: number; episodeNumber: number; seasonId: string }> = [];
    for (const season of seasonList) {
      console.log('[WORKER] Processing season', season.season_number);
      const episodes = await getEpisodesBySeason(season.id);
      const seen = new Set<number>();
      episodes.forEach((ep) => {
        if (seen.has(ep.episode_number)) return;
        seen.add(ep.episode_number);
        episodeQueue.push({ seasonNumber: season.season_number, episodeNumber: ep.episode_number, seasonId: season.id });
      });
    }

    const totalEpisodes = episodeQueue.length;
    let completedEpisodes = 0;
    await job.updateProgress({ totalEpisodes, completedEpisodes, currentEpisode: null, status: 'downloading', percent: 0 });

    for (const item of episodeQueue) {
      const { seasonNumber, episodeNumber, seasonId } = item;
      const pct = totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
      await job.updateProgress({ totalEpisodes, completedEpisodes, currentEpisode: episodeNumber, status: 'downloading', percent: pct });
      console.log('[WORKER] START episode', episodeNumber);
      let tmpFile: string | null = null;
      try {
        const ensuredSeasonId = await ensureSeason(animeId, seasonNumber);
        const cdnUrl = expectedCdn(slug, seasonNumber, episodeNumber);
        const existing = await getEpisodeByKey(animeId, ensuredSeasonId, episodeNumber);
        if (existing?.video_path === cdnUrl && existing?.stream_url === cdnUrl) {
          completedEpisodes += 1;
          const afterPct = totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
          await job.updateProgress({ totalEpisodes, completedEpisodes, currentEpisode: episodeNumber, status: 'done', percent: afterPct });
          console.log('[WORKER] SKIP episode already ok', episodeNumber);
          continue;
        }
        const remotePath = `${slug}/season-${seasonNumber}/episode-${episodeNumber}.mp4`;
        const sourceUrl = buildAnimelyUrl(slug, seasonNumber, episodeNumber);
        tmpFile = path.join(TMP_ROOT, animeId, `season-${seasonNumber}`, `episode-${episodeNumber}.mp4`);
        const downloadPromise = runYtDlp(sourceUrl, tmpFile);
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Episode download timeout')), 1000 * 60));
        await Promise.race([downloadPromise, timeout]);
        await job.updateProgress({ totalEpisodes, completedEpisodes, currentEpisode: episodeNumber, status: 'uploading', percent: pct });
        await uploadToBunny(remotePath, tmpFile);
        await upsertEpisodeByKey({
          animeId,
          seasonId: ensuredSeasonId,
          episodeNumber,
          cdnUrl,
          hlsUrl: existing?.hls_url ?? null,
          durationSeconds: existing?.duration_seconds ?? 0,
          title: existing?.title || `Bölüm ${episodeNumber}`,
        });
        completedEpisodes += 1;
        const afterPct = totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
        await job.updateProgress({ totalEpisodes, completedEpisodes, currentEpisode: episodeNumber, status: 'done', percent: afterPct });
        console.log('[WORKER] DONE episode', episodeNumber);
      } catch (err) {
        completedEpisodes += 1;
        const afterPct = totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
        await job.updateProgress({ totalEpisodes, completedEpisodes, currentEpisode: episodeNumber, status: 'done', percent: afterPct });
        console.error('[WORKER] FAIL episode', episodeNumber, err);
        continue;
      } finally {
        if (tmpFile) {
          await rm(tmpFile, { force: true });
        }
      }
    }

    await job.updateProgress({
      totalEpisodes,
      completedEpisodes,
      currentEpisode: null,
      status: 'done',
      percent: 100,
    });
    console.log('[WORKER] Job finished, returning');
    return { ok: true };
  } catch (err) {
    console.error('[WORKER] Job error', err);
    throw err;
  }
}, {
  connection,
  // Prevent long downloads from being marked stalled
  lockDuration: 1000 * 60 * 15, // 15 minutes
  stalledInterval: 1000 * 60 * 5, // check every 5 minutes
  maxStalledCount: 2,
});

autoImportWorker.on('ready', () => console.log('[WORKER] Ready'));
autoImportWorker.on('error', (err: unknown) => console.error('[WORKER] Error', err));
autoImportWorker.on('active', (job: Job<JobData>) => console.log('[WORKER] Processing job', job.id));
autoImportWorker.on('completed', (job: Job<JobData>) => console.log('[WORKER] Completed job', job.id));
autoImportWorker.on('failed', (job: Job<JobData> | undefined, err: unknown) => console.error('[WORKER] Failed job', job?.id, err));
