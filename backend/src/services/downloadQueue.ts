import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runYtDlp } from './ytDlp.js';
import { uploadToBunny } from './bunnyUpload.js';
import {
  supabaseAdmin,
  ensureAnimeSlug,
  expectedCdn,
  updateEpisodePath,
} from './supabaseAdmin.js';
import { notifyDownloadFailed } from './adminNotifications.js';
import { markEpisodeReleased } from './airingSchedule.js';

const TMP_ROOT = process.env.DOWNLOAD_TMP_ROOT || '/tmp/anirias-downloads';
const MAX_CONCURRENT_DOWNLOADS = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '2', 10);

export interface DownloadQueueItem {
  episodeId: string;
  animeId: string;
  seasonId: string;
  seasonNumber: number;
  episodeNumber: number;
  pageUrl: string | null;
}

export interface DownloadQueueProgress {
  total: number;
  completed: number;
  downloading: number;
  uploading: number;
  ready: number;
  failed: number;
  currentEpisode?: number;
  message?: string;
}

/**
 * Fetches all episodes with status 'pending_download' for a given anime
 */
export async function getPendingDownloadEpisodes(
  animeId: string,
  seasonId?: string
): Promise<DownloadQueueItem[]> {
  let query = supabaseAdmin
    .from('episodes')
    .select('id, anime_id, season_id, episode_number, seasons!inner(season_number)')
    .eq('anime_id', animeId)
    .eq('status', 'pending_download')
    .order('episode_number', { ascending: true });

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending episodes: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as any[]).map((row) => ({
    episodeId: row.id,
    animeId: row.anime_id,
    seasonId: row.season_id,
    seasonNumber: row.seasons?.season_number || 1,
    episodeNumber: row.episode_number,
    pageUrl: null, // Will be constructed from template if needed
  }));
}

/**
 * Processes a single episode download
 */
async function processEpisodeDownload(
  item: DownloadQueueItem,
  slug: string,
  urlTemplate?: string
): Promise<{ success: boolean; error?: string }> {
  const { episodeId, animeId, seasonId, seasonNumber, episodeNumber } = item;

  // Update status to downloading
  await supabaseAdmin
    .from('episodes')
    .update({
      status: 'downloading',
      updated_at: new Date().toISOString(),
    })
    .eq('id', episodeId);

  const tempFile = path.join(
    TMP_ROOT,
    animeId,
    `season-${seasonNumber}`,
    `episode-${episodeNumber}.mp4`
  );
  const remotePath = `${slug}/season-${seasonNumber}/episode-${episodeNumber.toString().padStart(2, '0')}.mp4`;
  const cdnUrl = expectedCdn(slug, seasonNumber, episodeNumber);

  try {
    // Construct page URL from template or use default
    let pageUrl = item.pageUrl;
    if (!pageUrl && urlTemplate) {
      pageUrl = urlTemplate
        .replace('{anime_slug}', slug)
        .replace('{season_number}', String(seasonNumber))
        .replace('{episode_number}', String(episodeNumber));
    } else if (!pageUrl) {
      // Default template
      if (seasonNumber <= 1) {
        pageUrl = `https://animely.net/anime/${slug}/izle/${episodeNumber}`;
      } else {
        pageUrl = `https://animely.net/anime/${slug}-${seasonNumber}-sezon/izle/${episodeNumber}`;
      }
    }

    if (!pageUrl) {
      throw new Error('No page URL available for download');
    }

    // Ensure temp directory exists
    await mkdir(path.dirname(tempFile), { recursive: true });

    // Download with yt-dlp
    await runYtDlp(pageUrl, tempFile);

    // Update status to uploading
    await supabaseAdmin
      .from('episodes')
      .update({
        status: 'uploading',
        updated_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    // Upload to Bunny
    await uploadToBunny(remotePath, tempFile);

    // Update episode with CDN URL and set status to ready
    await updateEpisodePath(episodeId, cdnUrl);
    await markEpisodeReleased({
      animeId,
      episodeNumber,
      importedEpisodeId: episodeId,
      releasedAt: new Date().toISOString(),
    });

    // Clean up temp file
    await rm(tempFile, { force: true });

    return { success: true };
  } catch (err: any) {
    // Update status to error or source_missing based on error type
    const errorMessage = err?.message || 'Unknown error';
    const isSourceMissing = errorMessage.includes('No video formats found') ||
                           errorMessage.includes('Unable to download') ||
                           errorMessage.includes('Video unavailable');

    await supabaseAdmin
      .from('episodes')
      .update({
        status: isSourceMissing ? 'source_missing' : 'error',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    // Clean up temp file on error
    await rm(tempFile, { force: true }).catch(() => {
      // Ignore cleanup errors
    });

    // Notify admin of download failure
    const { data: episodeData } = await supabaseAdmin
      .from('episodes')
      .select('episode_number, seasons!inner(season_number, anime:animes!inner(title))')
      .eq('id', episodeId)
      .maybeSingle();

    if (episodeData) {
      const animeTitle = (episodeData.seasons as any)?.anime?.title?.romaji || 
                        (episodeData.seasons as any)?.anime?.title?.english || 
                        'Unknown Anime';
      const seasonNumber = (episodeData.seasons as any)?.season_number || 1;
      const episodeNumber = episodeData.episode_number;
      
      notifyDownloadFailed(animeTitle, seasonNumber, episodeNumber, errorMessage, episodeId);
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Processes the download queue for pending episodes
 */
export async function processDownloadQueue(
  animeId: string,
  seasonId?: string,
  urlTemplate?: string,
  onProgress?: (progress: DownloadQueueProgress) => void
): Promise<{ total: number; ready: number; failed: number; errors: string[] }> {
  const slug = await ensureAnimeSlug(animeId);
  const items = await getPendingDownloadEpisodes(animeId, seasonId);

  if (items.length === 0) {
    return { total: 0, ready: 0, failed: 0, errors: [] };
  }

  const progress: DownloadQueueProgress = {
    total: items.length,
    completed: 0,
    downloading: 0,
    uploading: 0,
    ready: 0,
    failed: 0,
  };

  const errors: string[] = [];
  const workQueue = [...items];
  let active = 0;
  let completed = 0;

  return new Promise<{ total: number; ready: number; failed: number; errors: string[] }>((resolve) => {
    const processNext = async () => {
      // Check if we're done
      if (workQueue.length === 0 && active === 0) {
        resolve({
          total: items.length,
          ready: progress.ready,
          failed: progress.failed,
          errors,
        });
        return;
      }

      // Check concurrency limit
      if (active >= MAX_CONCURRENT_DOWNLOADS) {
        return;
      }

      const item = workQueue.shift();
      if (!item) {
        // No more items, but wait for active to finish
        if (active === 0) {
          resolve({
            total: items.length,
            ready: progress.ready,
            failed: progress.failed,
            errors,
          });
        }
        return;
      }

      active += 1;
      progress.downloading += 1;
      progress.currentEpisode = item.episodeNumber;
      progress.message = `Bölüm ${item.episodeNumber} indiriliyor`;
      onProgress?.(progress);

      try {
        const result = await processEpisodeDownload(item, slug, urlTemplate);

        progress.downloading -= 1;
        completed += 1;
        progress.completed = completed;

        if (result.success) {
          progress.ready += 1;
          progress.message = `Bölüm ${item.episodeNumber} hazır`;
        } else {
          progress.failed += 1;
          errors.push(`Bölüm ${item.episodeNumber}: ${result.error || 'Bilinmeyen hata'}`);
          progress.message = `Bölüm ${item.episodeNumber} başarısız`;
        }

        onProgress?.(progress);
      } catch (err: any) {
        progress.downloading -= 1;
        completed += 1;
        progress.completed = completed;
        progress.failed += 1;
        const errorMsg = err?.message || 'Bilinmeyen hata';
        errors.push(`Bölüm ${item.episodeNumber}: ${errorMsg}`);
        progress.message = `Bölüm ${item.episodeNumber} başarısız`;
        onProgress?.(progress);
      } finally {
        active -= 1;
        // Process next item
        setImmediate(() => processNext());
      }
    };

    // Start processing with concurrency limit
    for (let i = 0; i < Math.min(MAX_CONCURRENT_DOWNLOADS, items.length); i++) {
      processNext();
    }
  });

  return {
    total: items.length,
    ready: progress.ready,
    failed: progress.failed,
    errors,
  };
}
