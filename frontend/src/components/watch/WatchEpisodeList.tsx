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
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full max-w-full text-left min-h-[56px] flex-shrink-0 pointer-events-auto ${
              isCurrent
                ? 'bg-[#3f1a1a] text-white shadow-inner'
                : 'hover:bg-white/[0.06] text-white/50 hover:text-white/90 active:bg-white/[0.08]'
            } ${noVideo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                isCurrent ? 'bg-black/25 text-white' : 'bg-[#1a1a1c] text-white/45'
              }`}
            >
              {ep.episode_number}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p
                className={`text-xs font-semibold normal-case truncate leading-tight ${
                  isCurrent ? 'text-white' : 'text-white/85'
                }`}
              >
                {ep.title || `Bölüm ${ep.episode_number}`}
              </p>
              <p
                className={`text-[10px] font-medium mt-0.5 tabular-nums ${
                  isCurrent ? 'text-white/55' : 'text-white/40'
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
