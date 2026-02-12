import { syncAiringSchedule } from '../services/airingSchedule.js';

let isRunning = false;

export async function runAiringScheduleSyncJob() {
  if (isRunning) return { ok: false, skipped: true, reason: 'already_running' };
  isRunning = true;
  try {
    const result = await syncAiringSchedule();
    return { ok: true, ...result };
  } finally {
    isRunning = false;
  }
}

export function startAiringScheduleSyncJob() {
  const intervalHours = Number(process.env.AIRING_SYNC_INTERVAL_HOURS || '6');
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
    console.log('[AiringSyncJob] Disabled (AIRING_SYNC_INTERVAL_HOURS <= 0)');
    return;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  console.log(`[AiringSyncJob] Starting (every ${intervalHours}h)`);

  runAiringScheduleSyncJob().catch((err) => {
    console.error('[AiringSyncJob] Initial run failed:', err);
  });

  setInterval(() => {
    runAiringScheduleSyncJob().catch((err) => {
      console.error('[AiringSyncJob] Scheduled run failed:', err);
    });
  }, intervalMs);
}
