import React from 'react';
import type { Episode } from '@/types';

export type WatchProgressChunk = { progress: number; duration: number };

function episodeDurationMinutes(ep: Episode): number {
  if (ep.duration_seconds && ep.duration_seconds > 0) {
    return Math.floor(ep.duration_seconds / 60);
  }
  if (ep.duration != null && ep.duration > 0) {
    return Math.floor(ep.duration / 60);
  }
  return 24;
}

export interface WatchEpisodeListProps {
  episodes: Episode[];
  currentEpisodeNumber: number;
  progressMap: Map<string, WatchProgressChunk>;
  onSelect: (ep: Episode) => void;
  /** WatchSlug: tıklamayı video yoksa engelle */
  blockWithoutVideo?: boolean;
}

const WatchEpisodeList: React.FC<WatchEpisodeListProps> = ({
  episodes,
  currentEpisodeNumber,
  progressMap,
  onSelect,
  blockWithoutVideo = false,
}) => {
  return (
    <>
      {episodes.map((ep) => {
        const isCurrent = ep.episode_number === currentEpisodeNumber;
        const progress = progressMap.get(ep.id);
        const noVideo = blockWithoutVideo && !ep.video_url && !ep.hls_url;
        return (
          <button
            key={`${ep.season_id}-${ep.episode_number}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (noVideo) return;
              onSelect(ep);
            }}
            className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all w-full max-w-full text-left min-h-[56px] flex-shrink-0 pointer-events-auto ${
              isCurrent
                ? 'bg-primary/20 text-white ring-1 ring-primary/40 shadow-md shadow-black/30'
                : 'hover:bg-white/5 text-gray-400 hover:text-white active:bg-white/10'
            } ${noVideo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                isCurrent ? 'bg-primary/35 text-white' : 'bg-white/5 text-muted'
              }`}
            >
              {ep.episode_number}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-semibold text-white/95 normal-case truncate leading-tight">
                {ep.title || `Bölüm ${ep.episode_number}`}
              </p>
              <p
                className={`text-[10px] font-medium mt-0.5 tabular-nums ${
                  isCurrent ? 'text-white/65' : 'text-muted'
                }`}
              >
                {episodeDurationMinutes(ep)} dk
              </p>
              {progress && progress.duration > 0 && (
                <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{
                      width: `${Math.min(100, (progress.progress / progress.duration) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </>
  );
};

export default WatchEpisodeList;
