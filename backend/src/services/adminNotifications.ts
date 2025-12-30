/**
 * Admin Notification Service
 * 
 * Purpose: Create notifications for admins about system events
 * - New anime detected
 * - New episodes added
 * - Download failures
 * - System errors
 * 
 * IMPORTANT: This is NON-BLOCKING
 * - If notification fails, log but don't crash
 * - Never block downloader or import systems
 */

import { supabaseAdmin } from './supabaseAdmin.js';

export type NotificationType = 'info' | 'warning' | 'error';
export type NotificationSource = 'animely' | 'system' | 'downloader' | 'import';

export interface AdminNotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  source: NotificationSource;
  metadata?: Record<string, any>;
}

/**
 * Create an admin notification
 * Returns notification ID or null if failed (never throws)
 */
export async function createAdminNotification(
  payload: AdminNotificationPayload
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_notifications')
      .insert({
        type: payload.type,
        title: payload.title,
        message: payload.message,
        source: payload.source,
        metadata: payload.metadata || {},
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AdminNotifications] Failed to create notification:', error);
      return null;
    }

    return data?.id || null;
  } catch (err: any) {
    // Never crash the main process
    console.error('[AdminNotifications] Unexpected error:', err);
    return null;
  }
}

/**
 * Helper: Notify new anime detected
 */
export async function notifyNewAnimeDetected(
  animeTitle: string,
  anilistId?: number,
  malId?: number
): Promise<void> {
  await createAdminNotification({
    type: 'info',
    title: 'Yeni anime bulundu',
    message: animeTitle,
    source: 'animely',
    metadata: { anilistId, malId },
  });
}

/**
 * Helper: Notify new episode added
 */
export async function notifyNewEpisodeAdded(
  animeTitle: string,
  seasonNumber: number,
  episodeNumber: number,
  episodeId?: string
): Promise<void> {
  await createAdminNotification({
    type: 'info',
    title: 'Yeni bölüm eklendi',
    message: `${animeTitle} – Sezon ${seasonNumber}, Bölüm ${episodeNumber}`,
    source: 'animely',
    metadata: { seasonNumber, episodeNumber, episodeId },
  });
}

/**
 * Helper: Notify download failed
 */
export async function notifyDownloadFailed(
  animeTitle: string,
  seasonNumber: number,
  episodeNumber: number,
  reason: string,
  episodeId?: string
): Promise<void> {
  await createAdminNotification({
    type: 'warning',
    title: 'Bölüm indirilemedi',
    message: `${animeTitle} – Sezon ${seasonNumber}, Bölüm ${episodeNumber}\nNeden: ${reason}`,
    source: 'downloader',
    metadata: { seasonNumber, episodeNumber, episodeId, reason },
  });
}

/**
 * Helper: Notify system error
 */
export async function notifySystemError(
  title: string,
  message: string,
  source: NotificationSource = 'system',
  metadata?: Record<string, any>
): Promise<void> {
  await createAdminNotification({
    type: 'error',
    title,
    message,
    source,
    metadata,
  });
}

/**
 * Helper: Notify import success
 */
export async function notifyImportSuccess(
  animeTitle: string,
  seasonsCreated: number,
  episodesCreated: number
): Promise<void> {
  await createAdminNotification({
    type: 'info',
    title: 'İmport tamamlandı',
    message: `${animeTitle}\n${seasonsCreated} sezon, ${episodesCreated} bölüm eklendi`,
    source: 'import',
    metadata: { seasonsCreated, episodesCreated },
  });
}

/**
 * Helper: Notify import warning
 */
export async function notifyImportWarning(
  animeTitle: string,
  warning: string
): Promise<void> {
  await createAdminNotification({
    type: 'warning',
    title: 'İmport uyarısı',
    message: `${animeTitle}\n${warning}`,
    source: 'import',
  });
}

