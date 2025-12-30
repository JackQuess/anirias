/**
 * Notification Worker Service
 * 
 * Background job that checks for upcoming and released episodes
 * and creates notifications for users.
 * 
 * Runs every 5 minutes.
 */

import { supabaseAdmin } from './supabaseAdmin.js';

let workerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Check for episodes and create notifications
 */
async function checkAndCreateNotifications(): Promise<void> {
  if (isRunning) {
    console.log('[NotificationWorker] Already running, skipping...');
    return;
  }

  isRunning = true;

  try {
    // Call the database function to create notifications
    const { data, error } = await supabaseAdmin.rpc('create_episode_airing_notifications');

    if (error) {
      console.error('[NotificationWorker] Error creating notifications:', error);
      return;
    }

    const notificationCount = data || 0;
    if (notificationCount > 0) {
      console.log(`[NotificationWorker] Created ${notificationCount} notifications`);
    }
  } catch (err: any) {
    // Fail silently - don't crash the server
    console.error('[NotificationWorker] Unexpected error:', err?.message || err);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the notification worker
 * Runs every 5 minutes
 */
export function startNotificationWorker(): void {
  if (workerInterval) {
    console.log('[NotificationWorker] Already started');
    return;
  }

  console.log('[NotificationWorker] Starting notification worker (runs every 5 minutes)');

  // Run immediately on start
  checkAndCreateNotifications();

  // Then run every 5 minutes
  workerInterval = setInterval(() => {
    checkAndCreateNotifications();
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop the notification worker
 */
export function stopNotificationWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[NotificationWorker] Stopped');
  }
}

