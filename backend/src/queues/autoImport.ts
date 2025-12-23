import { Queue, Worker } from 'bullmq';
type Job = any;
type ConnectionOptions = any;
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
export let workerReady = false;
export const workerReadyPromise = autoImportQueue
  .waitUntilReady()
  .then(() => {
    workerReady = true;
    console.log('[WORKER] Queue connected to Redis');
  })
  .catch((err: unknown) => {
    console.error('[WORKER] Queue connection error', err);
    throw err;
  });

const TMP_ROOT = '/tmp/anirias';
type JobData = { animeId: string; seasonNumber?: number | null; mode?: 'season' | 'all' };

export const autoImportWorker = new Worker('auto-import', async (job: Job) => {
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
    const progressUpdate = async (fields: Partial<any>) => {
      const percent = totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
      await job.updateProgress({
        mode: 'worker',
        totalEpisodes,
        completedEpisodes,
        percent,
        lastUpdateAt: Date.now(),
        ...fields,
      });
    };

    await progressUpdate({
      currentEpisode: null,
      status: 'preparing',
      message: 'Hazırlanıyor...',
      error: null,
    });

    const concurrency = 2;
    const taskQueue = [...episodeQueue];
    const runTask = async (item: { seasonNumber: number; episodeNumber: number; seasonId: string }) => {
      const { seasonNumber, episodeNumber } = item;
      await progressUpdate({
        currentEpisode: episodeNumber,
        status: 'downloading',
        message: `Bölüm ${episodeNumber} indiriliyor (arka planda)`,
        error: null,
      });
      console.log('[WORKER] START episode', episodeNumber);
      let tmpFile: string | null = null;
      try {
        const ensuredSeasonId = await ensureSeason(animeId, seasonNumber);
        const cdnUrl = expectedCdn(slug, seasonNumber, episodeNumber);
        const existing = await getEpisodeByKey(animeId, ensuredSeasonId, episodeNumber);
        if (existing?.video_path === cdnUrl && existing?.stream_url === cdnUrl) {
          completedEpisodes += 1;
          await progressUpdate({
            currentEpisode: episodeNumber,
            status: 'done',
            message: `Bölüm ${episodeNumber} atlandı`,
            error: null,
          });
          console.log('[WORKER] SKIP episode already ok', episodeNumber);
          return;
        }
        const remotePath = `${slug}/season-${seasonNumber}/episode-${episodeNumber}.mp4`;
        const sourceUrl = buildAnimelyUrl(slug, seasonNumber, episodeNumber);
        tmpFile = path.join(TMP_ROOT, animeId, `season-${seasonNumber}`, `episode-${episodeNumber}.mp4`);
        await runYtDlp(sourceUrl, tmpFile);
        await progressUpdate({
          currentEpisode: episodeNumber,
          status: 'uploading',
          message: `Bölüm ${episodeNumber} yükleniyor`,
          error: null,
        });
        await uploadToBunny(remotePath, tmpFile);
        await progressUpdate({
          currentEpisode: episodeNumber,
          status: 'patching',
          message: `Bölüm ${episodeNumber} Supabase güncelleniyor`,
          error: null,
        });
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
        await progressUpdate({
          currentEpisode: episodeNumber,
          status: 'done',
          message: `Bölüm ${episodeNumber} tamamlandı`,
          error: null,
        });
        console.log('[WORKER] DONE episode', episodeNumber);
      } catch (err) {
        completedEpisodes += 1;
        await progressUpdate({
          currentEpisode: episodeNumber,
          status: 'error',
          message: `Bölüm ${episodeNumber} hata aldı`,
          error: err instanceof Error ? err.message : 'unknown',
        });
        console.error('[WORKER] FAIL episode', episodeNumber, err);
      } finally {
        if (tmpFile) {
          await rm(tmpFile, { force: true });
        }
      }
    };

    const runners: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, taskQueue.length); i++) {
      const runner = async () => {
        while (taskQueue.length) {
          const next = taskQueue.shift();
          if (!next) break;
          await runTask(next);
        }
      };
      runners.push(runner());
    }
    await Promise.all(runners);

    await job.updateProgress({
      mode: 'worker',
      totalEpisodes,
      completedEpisodes,
      currentEpisode: null,
      status: 'done',
      percent: 100,
      message: 'İş tamamlandı',
      lastUpdateAt: Date.now(),
      error: null
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
  lockDuration: 1000 * 60 * 20, // 20 minutes
  stalledInterval: 1000 * 60 * 5, // check every 5 minutes
  maxStalledCount: 2,
});

autoImportWorker.on('ready', () => console.log('[WORKER] Ready'));
autoImportWorker.on('error', (err: unknown) => console.error('[WORKER] Error', err));
autoImportWorker.on('active', (job: Job) => console.log('[WORKER] Processing job', job.id));
autoImportWorker.on('completed', (job: Job) => console.log('[WORKER] Completed job', job.id));
autoImportWorker.on('failed', (job: Job | undefined, err: unknown) => console.error('[WORKER] Failed job', job?.id, err));
autoImportWorker.on('progress', (job: Job, progress: any) =>
  console.log('[WORKER] Progress', { jobId: job.id, progress })
);
