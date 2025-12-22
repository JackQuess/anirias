import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runYtDlpDownload } from './ytDlp';
import { uploadToBunny } from './bunny';
import {
  ensureAnimeSlug,
  getOrCreateSeason,
  upsertEpisodeVideo,
  getEpisodesForAnime,
  isEpisodePathCorrect,
  expectedCdnUrl,
  updateEpisodeVideo,
} from './supabaseAdmin';

export interface AutoImportEpisodeInput {
  episodeNumber: number;
  pageUrl: string;
}

export interface AutoImportParams {
  animeId: string;
  seasonNumber: number;
  episodes: AutoImportEpisodeInput[];
}

export interface AutoImportItemResult {
  episodeNumber: number;
  pageUrl: string;
  remotePath: string | null;
  cdnUrl: string | null;
  status: 'queued' | 'downloading' | 'uploading' | 'updating' | 'done' | 'error';
  error?: string;
}

export interface AutoImportResult {
  ok: boolean;
  summary: { total: number; downloaded: number; uploaded: number; updated: number; failed: number };
  items: AutoImportItemResult[];
}

const CDN_BASE = 'https://anirias-videos.b-cdn.net';
const TMP_ROOT = '/tmp/anirias';

function buildRemotePath(slug: string, seasonNumber: number, episodeNumber: number) {
  return `${slug}/season-${seasonNumber}/episode-${episodeNumber}.mp4`;
}

function buildTempPath(animeId: string, seasonNumber: number, episodeNumber: number) {
  return path.join(TMP_ROOT, animeId, `season-${seasonNumber}`, `episode-${episodeNumber}.mp4`);
}

export async function autoImportEpisodes(params: AutoImportParams): Promise<AutoImportResult> {
  const { animeId, seasonNumber, episodes } = params;
  if (!animeId || !seasonNumber || !episodes?.length) {
    throw new Error('animeId, seasonNumber and episodes are required');
  }

  const slug = await ensureAnimeSlug(animeId);
  const seasonId = await getOrCreateSeason(animeId, seasonNumber);

  const items: AutoImportItemResult[] = episodes.map((ep) => ({
    episodeNumber: ep.episodeNumber,
    pageUrl: ep.pageUrl,
    remotePath: null,
    cdnUrl: null,
    status: 'queued',
  }));

  let downloaded = 0;
  let uploaded = 0;
  let updated = 0;
  let failed = 0;

  await mkdir(TMP_ROOT, { recursive: true });

  const processOne = async (ep: AutoImportEpisodeInput): Promise<AutoImportItemResult> => {
    const result: AutoImportItemResult = {
      episodeNumber: ep.episodeNumber,
      pageUrl: ep.pageUrl,
      remotePath: null,
      cdnUrl: null,
      status: 'queued',
    };

    const tempFile = buildTempPath(animeId, seasonNumber, ep.episodeNumber);
    const remotePath = buildRemotePath(slug, seasonNumber, ep.episodeNumber);
    const cdnUrl = `${CDN_BASE}/${remotePath}`;

    try {
      result.status = 'downloading';
      await runYtDlpDownload(ep.pageUrl, tempFile);
      downloaded += 1;

      result.status = 'uploading';
      await uploadToBunny(remotePath, tempFile);
      uploaded += 1;

      result.status = 'updating';
      await upsertEpisodeVideo(animeId, seasonId, ep.episodeNumber, cdnUrl);
      updated += 1;

      result.status = 'done';
      result.remotePath = remotePath;
      result.cdnUrl = cdnUrl;
    } catch (err: any) {
      result.status = 'error';
      result.error = err?.message || 'Unknown error';
      failed += 1;
    } finally {
      await rm(tempFile, { force: true });
    }

    return result;
  };

  const results: AutoImportItemResult[] = [];
  for (const ep of episodes) {
    results.push(await processOne(ep));
  }

  return {
    ok: failed === 0,
    summary: { total: episodes.length, downloaded, uploaded, updated, failed },
    items: results,
  };
}

export interface AutoImportAllResultItem {
  episodeId: string;
  episodeNumber: number;
  seasonNumber: number;
  pageUrl: string;
  remotePath: string | null;
  cdnUrl: string | null;
  status: 'queued' | 'skipped' | 'downloading' | 'uploading' | 'updating' | 'done' | 'error';
  error?: string;
}

export interface AutoImportAllResult {
  ok: boolean;
  summary: { total: number; imported: number; skipped: number; failed: number };
  items: AutoImportAllResultItem[];
  statusCounts?: Record<string, number>;
}

const DEFAULT_EP_TEMPLATE = 'https://animely.net/anime/{anime_slug}/izle/{episode_number}';

function applyTemplate(template: string, slug: string, seasonNumber: number, episodeNumber: number) {
  if (!template) {
    if (seasonNumber <= 1) {
      return `https://animely.net/anime/${slug}/izle/${episodeNumber}`;
    }
    return `https://animely.net/anime/${slug}-${seasonNumber}-sezon/izle/${episodeNumber}`;
  }
  return template
    .replace('{anime_slug}', slug)
    .replace('{season_number}', String(seasonNumber))
    .replace('{episode_number}', String(episodeNumber));
}

async function bunnyFileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' } as any);
    return res.ok;
  } catch {
    return false;
  }
}

export async function autoImportAllEpisodes(
  animeId: string,
  seasonNumber: number,
  urlTemplate?: string,
): Promise<AutoImportAllResult> {
  if (!animeId) throw new Error('animeId required');
  if (!seasonNumber || Number.isNaN(seasonNumber)) throw new Error('seasonNumber required');
  const template = (urlTemplate || '').trim();
  if (template && (!template.includes('{anime_slug}') || !template.includes('{episode_number}'))) {
    throw new Error('urlTemplate must include {anime_slug} and {episode_number} when provided');
  }

  const slug = await ensureAnimeSlug(animeId);
  const episodes = (await getEpisodesForAnime(animeId)).filter(
    (ep) => (ep.seasons?.season_number || 1) === seasonNumber,
  );

  const items: AutoImportAllResultItem[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  await mkdir(TMP_ROOT, { recursive: true });

  const toProcess = episodes.map((ep) => {
    const season = ep.seasons?.season_number || 1;
    const remotePath = buildRemotePath(slug, season, ep.episode_number);
    const cdnUrl = expectedCdnUrl(slug, season, ep.episode_number);
    const pageUrl = applyTemplate(template, slug, season, ep.episode_number);
    const tempFile = buildTempPath(animeId, season, ep.episode_number);
    const base: AutoImportAllResultItem = {
      episodeId: ep.id,
      episodeNumber: ep.episode_number,
      seasonNumber: season,
      pageUrl,
      remotePath,
      cdnUrl,
      status: 'queued',
    };
    return { ep, seasonNumber, remotePath, cdnUrl, pageUrl, tempFile, base };
  });

  const MAX_GLOBAL = 2;
  const MAX_PER_SEASON = 2;

  const workQueue = [...toProcess];
  if (workQueue.length === 0) {
    const statusCounts: Record<string, number> = {};
    return {
      ok: true,
      summary: { total: 0, imported: 0, skipped: 0, failed: 0 },
      items: [],
      statusCounts,
    };
  }

  const concurrency = Math.min(workQueue.length, MAX_GLOBAL, MAX_PER_SEASON);

  await new Promise<void>((resolve) => {
    let active = 0;

    const launchNext = () => {
      if (workQueue.length === 0 && active === 0) {
        resolve();
        return;
      }
      if (active >= concurrency) return;
      const task = workQueue.shift();
      if (!task) {
        return;
      }
      active += 1;

      const { ep, seasonNumber, remotePath, cdnUrl, pageUrl, tempFile, base } = task;
      const itemIndex = items.length;
      items.push(base);

      const runJob = async () => {
        if (isEpisodePathCorrect(ep, slug)) {
          items[itemIndex] = { ...base, status: 'skipped' };
          skipped += 1;
          return;
        }

        await getOrCreateSeason(animeId, seasonNumber);

        // If bunny already has the file, skip download and just patch DB
        if (await bunnyFileExists(cdnUrl)) {
          items[itemIndex] = { ...base, status: 'skipped' };
          if (!isEpisodePathCorrect(ep, slug)) {
            await updateEpisodeVideo(ep.id, cdnUrl);
          }
          skipped += 1;
          return;
        }

        let lastError: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            items[itemIndex] = { ...base, status: 'downloading' };
            // eslint-disable-next-line no-console
            console.log(`[AutoImport] Ep ${ep.episode_number} attempt ${attempt} downloading`);
            await runYtDlpDownload(pageUrl, tempFile);

            items[itemIndex] = { ...base, status: 'uploading' };
            // eslint-disable-next-line no-console
            console.log(`[AutoImport] Ep ${ep.episode_number} uploading to Bunny`);
            await uploadToBunny(remotePath, tempFile);

            items[itemIndex] = { ...base, status: 'updating' };
            await updateEpisodeVideo(ep.id, cdnUrl);

            items[itemIndex] = { ...base, status: 'done' };
            imported += 1;
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            // eslint-disable-next-line no-console
            console.error(`[AutoImport] Ep ${ep.episode_number} failed attempt ${attempt}:`, err);
            if (attempt >= 3) {
              items[itemIndex] = { ...base, status: 'error', error: err?.message || 'Unknown error' };
              failed += 1;
            }
          } finally {
            await rm(tempFile, { force: true });
          }
        }

        if (lastError) {
          // error already captured in item
        }
      };

      runJob().finally(() => {
        active -= 1;
        launchNext();
      });
      launchNext();
    };

    // prime workers
    for (let i = 0; i < concurrency; i++) {
      launchNext();
    }
  });

  const statusCounts: Record<string, number> = {};
  for (const it of items) {
    statusCounts[it.status] = (statusCounts[it.status] || 0) + 1;
  }

  return {
    ok: failed === 0,
    summary: { total: episodes.length, imported, skipped, failed },
    items,
    statusCounts,
  };
}
