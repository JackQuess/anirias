const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function shouldCorrectAiringAt(
  currentAiringAt: string | null | undefined,
  releasedAt: string,
  thresholdMs = SIX_HOURS_MS
): boolean {
  if (!currentAiringAt) return true;

  const currentTs = new Date(currentAiringAt).getTime();
  const releasedTs = new Date(releasedAt).getTime();

  if (Number.isNaN(currentTs) || Number.isNaN(releasedTs)) return true;
  return Math.abs(currentTs - releasedTs) > thresholdMs;
}

export const AIRING_CORRECTION_THRESHOLD_MS = SIX_HOURS_MS;
