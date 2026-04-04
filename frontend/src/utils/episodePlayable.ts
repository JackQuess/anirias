import type { Episode } from '@/types';

export function episodeHasPlayableVideo(ep: Pick<Episode, 'video_url' | 'hls_url'>): boolean {
  const v = (ep.video_url || '').trim();
  const h = (ep.hls_url || '').trim();
  return Boolean(v || h);
}
