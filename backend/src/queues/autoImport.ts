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
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY || 2);

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
    const tasks: Array<() => Promise<void>> = [];
    for (const season of seasonList) {
      console.log('[WORKER] Processing season', season.season_number);
      const episodes = await getEpisodesBySeason(season.id);
      const seen = new Set<number>();
      episodes.forEach((ep) => {
        if (seen.has(ep.episode_number)) return;
        seen.add(ep.episode_number);
        tasks.push(async () => {
          console.log('[WORKER] START episode', ep.episode_number);
          const seasonId = await ensureSeason(animeId, season.season_number);
          const cdnUrl = expectedCdn(slug, season.season_number, ep.episode_number);
          const existing = await getEpisodeByKey(animeId, seasonId, ep.episode_number);
          if (existing?.video_path === cdnUrl && existing?.stream_url === cdnUrl) {
            const prev = (job.progress as any) || {};
            await job.updateProgress({
              total: tasks.length,
              processed: (prev.processed || 0) + 1,
              success: prev.success || 0,
              failed: prev.failed || 0,
              currentEpisode: ep.episode_number,
            });
            console.log('[WORKER] SKIP episode already ok', ep.episode_number);
            return;
          }
          const remotePath = `${slug}/season-${season.season_number}/episode-${ep.episode_number}.mp4`;
          const sourceUrl = buildAnimelyUrl(slug, season.season_number, ep.episode_number);
          const tmpFile = path.join(TMP_ROOT, animeId, `season-${season.season_number}`, `episode-${ep.episode_number}.mp4`);
          let progress = (job.progress as any) || {};
          try {
            await job.updateProgress({
              total: tasks.length,
              processed: progress.processed || 0,
              success: progress.success || 0,
              failed: progress.failed || 0,
              currentEpisode: ep.episode_number,
            });
            console.log('[WORKER] Download start', sourceUrl);
            await runYtDlp(sourceUrl, tmpFile);
            console.log('[WORKER] Upload start', remotePath);
            await uploadToBunny(remotePath, tmpFile);
            console.log('[WORKER] DB upsert start', ep.episode_number);
            await upsertEpisodeByKey({
              animeId,
              seasonId,
              episodeNumber: ep.episode_number,
              cdnUrl,
              hlsUrl: existing?.hls_url ?? null,
              durationSeconds: existing?.duration_seconds ?? 0,
              title: existing?.title || `Bölüm ${ep.episode_number}`,
            });
            progress = (job.progress as any) || {};
            await job.updateProgress({
              total: tasks.length,
              processed: (progress.processed || 0) + 1,
              success: (progress.success || 0) + 1,
              failed: progress.failed || 0,
              currentEpisode: ep.episode_number,
            });
            console.log('[WORKER] DONE episode', ep.episode_number);
          } catch (err) {
            progress = (job.progress as any) || {};
            await job.updateProgress({
              total: tasks.length,
              processed: (progress.processed || 0) + 1,
              success: progress.success || 0,
              failed: (progress.failed || 0) + 1,
              currentEpisode: ep.episode_number,
            });
            console.error('[WORKER] FAIL episode', ep.episode_number, err);
            throw err;
          } finally {
            await rm(tmpFile, { force: true });
          }
        });
      });
    }

    await job.updateProgress({ total: tasks.length, processed: 0, success: 0, failed: 0, currentEpisode: null });

    const queueTasks = [...tasks];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(MAX_CONCURRENCY, queueTasks.length); i++) {
      const worker = (async function run() {
        const next = queueTasks.shift();
        if (!next) return;
        await next();
        if (queueTasks.length > 0) {
          await run();
        }
      })();
      workers.push(worker);
    }
    await Promise.all(workers);
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
autoImportWorker.on('error', (err) => console.error('[WORKER] Error', err));
autoImportWorker.on('active', (job) => console.log('[WORKER] Processing job', job.id));
autoImportWorker.on('completed', (job) => console.log('[WORKER] Completed job', job.id));
autoImportWorker.on('failed', (job, err) => console.error('[WORKER] Failed job', job?.id, err));
