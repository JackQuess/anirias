/**
 * Auto Download Worker
 * 
 * Purpose: Automatically process pending downloads
 * - Checks for episodes with status='pending_download'
 * - Triggers download queue automatically
 * - Runs periodically in background
 * 
 * SAFETY RULES:
 * - Non-blocking: Never pause pipeline
 * - Fail-safe: Continue on error
 * - Rate limited: Process in batches
 */

import { supabaseAdmin } from './supabaseAdmin.js';
import { processDownloadQueue } from './downloadQueue.js';
import { notifySystemError } from './adminNotifications.js';

let isProcessing = false;

/**
 * Process pending downloads for all anime
 */
export async function processAllPendingDownloads(): Promise<void> {
  // Prevent concurrent runs
  if (isProcessing) {
    console.log('[AutoDownloadWorker] Already processing, skipping...');
    return;
  }

  isProcessing = true;
  console.log('[AutoDownloadWorker] Starting...');

  try {
    // Get all anime with pending downloads
    const { data: pendingEpisodes, error } = await supabaseAdmin
      .from('episodes')
      .select('anime_id, seasons!inner(anime_id)')
      .eq('status', 'pending_download')
      .limit(100); // Process max 100 at a time

    if (error) {
      console.error('[AutoDownloadWorker] Error fetching pending episodes:', error);
      return;
    }

    if (!pendingEpisodes || pendingEpisodes.length === 0) {
      console.log('[AutoDownloadWorker] No pending downloads');
      return;
    }

    // Group by anime_id to avoid duplicate processing
    const animeIds = [...new Set(pendingEpisodes.map((ep: any) => ep.anime_id || ep.seasons?.anime_id))].filter(Boolean);

    console.log(`[AutoDownloadWorker] Found ${pendingEpisodes.length} pending episodes across ${animeIds.length} anime`);

    // Process each anime's pending episodes
    for (const animeId of animeIds) {
      try {
        console.log(`[AutoDownloadWorker] Processing anime: ${animeId}`);
        
        // Process download queue for this anime
        // Note: processDownloadQueue is async but we don't await it to avoid blocking
        processDownloadQueue(animeId as string).catch((err) => {
          console.error(`[AutoDownloadWorker] Error processing anime ${animeId}:`, err);
          notifySystemError(
            'Download hatası',
            `Anime ${animeId}: ${err.message}`,
            'downloader'
          );
        });

        // Rate limit: Wait 5 seconds between anime
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (err: any) {
        console.error(`[AutoDownloadWorker] Error processing anime ${animeId}:`, err);
        // Continue to next anime
      }
    }

    console.log('[AutoDownloadWorker] Batch complete');
  } catch (err: any) {
    console.error('[AutoDownloadWorker] Fatal error:', err);
    notifySystemError(
      'AutoDownloadWorker hatası',
      err.message || 'Bilinmeyen hata',
      'system'
    );
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the auto download worker (runs periodically)
 */
export function startAutoDownloadWorker() {
  console.log('[AutoDownloadWorker] Starting worker...');

  // Run immediately on start
  processAllPendingDownloads();

  // Then run every 15 minutes
  setInterval(() => {
    processAllPendingDownloads();
  }, 15 * 60 * 1000); // 15 minutes

  console.log('[AutoDownloadWorker] Worker started (checking every 15 minutes)');
}

