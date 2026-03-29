import React from 'react';
import WatchEpisodeList, { type WatchProgressChunk } from './WatchEpisodeList';
import type { Episode } from '@/types';

export interface WatchSidebarProps {
  episodes: Episode[];
  currentEpisodeNumber: number;
  seasonNum: number;
  titleString: string;
  poster: string;
  rawPoster: string | null;
  fallbackPoster: string;
  progressMap: Map<string, WatchProgressChunk>;
  onEpisodeSelect: (ep: Episode) => void;
  blockWithoutVideo?: boolean;
}

const WatchSidebar: React.FC<WatchSidebarProps> = ({
  episodes,
  currentEpisodeNumber,
  seasonNum,
  titleString,
  poster,
  rawPoster,
  fallbackPoster,
  progressMap,
  onEpisodeSelect,
  blockWithoutVideo,
}) => (
  <aside className="hidden xl:block w-[320px] 2xl:w-[360px] flex-shrink-0 max-w-full space-y-6 relative z-20">
    <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5 h-[600px] flex flex-col shadow-xl overflow-hidden">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 flex-shrink-0">
        <h3 className="text-sm font-bold text-white tracking-tight border-l-4 border-primary pl-3">Bölüm listesi</h3>
        <span className="text-[11px] font-semibold text-muted tabular-nums">{episodes.length} bölüm</span>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar space-y-1.5 min-h-0 w-full">
        <WatchEpisodeList
          episodes={episodes}
          currentEpisodeNumber={currentEpisodeNumber}
          progressMap={progressMap}
          onSelect={onEpisodeSelect}
          blockWithoutVideo={blockWithoutVideo}
        />
      </div>
    </div>

    <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5 flex gap-4 items-center shadow-lg">
      <img
        src={poster}
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          if (rawPoster && target.src !== rawPoster) {
            target.src = rawPoster;
          } else {
            target.src = fallbackPoster;
          }
        }}
        className="w-16 h-24 object-cover rounded-xl shadow-lg border border-white/10"
        alt={titleString}
      />
      <div className="min-w-0">
        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Şimdi izleniyor</p>
        <h4 className="text-sm font-bold text-white leading-tight line-clamp-2">{titleString}</h4>
        <p className="text-[10px] text-muted mt-1 font-semibold tabular-nums">
          S{seasonNum} · B{currentEpisodeNumber}
        </p>
      </div>
    </div>
  </aside>
);

export default WatchSidebar;
