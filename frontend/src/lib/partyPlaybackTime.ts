/**
 * playback_time + playback_updated_at ile o anki hedef süreyi tahmin eder (izleyici senkronu).
 */
export function extrapolatePartyTime(
  playbackTime: number,
  isPlaying: boolean,
  playbackUpdatedAt: string | null,
  nowMs: number = Date.now()
): number {
  if (!isPlaying || !playbackUpdatedAt) return playbackTime;
  const at = Date.parse(playbackUpdatedAt);
  if (Number.isNaN(at)) return playbackTime;
  const elapsedSec = (nowMs - at) / 1000;
  if (elapsedSec < 0) return playbackTime;
  return playbackTime + Math.min(elapsedSec, 12);
}
