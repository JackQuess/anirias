import React from 'react';
import WatchEpisodeList, { type WatchProgressChunk } from './WatchEpisodeList';
import type { Episode } from '@/types';

export interface WatchSidebarProps {
  episodes: Episode[];
  currentEpisodeNumber: number;
  progressMap: Map<string, WatchProgressChunk>;
  onEpisodeSelect: (ep: Episode) => void;
  blockWithoutVideo?: boolean;
}

/** Sağ kolon: zip / prod referansı — #121214 kart, kırmızı çizgi, kompakt bölüm listesi */
const WatchSidebar: React.FC<WatchSidebarProps> = ({
  episodes,
  currentEpisodeNumber,
  progressMap,
  onEpisodeSelect,
  blockWithoutVideo,
}) => (
  <aside className="hidden lg:flex w-full lg:w-[360px] shrink-0 flex-col z-20">
    <div className="bg-[#121214] border border-white/[0.06] rounded-xl p-4 flex flex-col shadow-xl overflow-hidden max-h-[min(75vh,820px)] min-h-0">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06] shrink-0">
        <h3 className="text-sm font-bold text-white tracking-tight border-l-4 border-primary pl-3 leading-none">
          Bölüm listesi
        </h3>
        <span className="text-[11px] font-medium text-white/40 tabular-nums">
          {episodes.length} bölüm
        </span>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pr-1 min-h-0 w-full space-y-1 watch-scrollbar">
        <WatchEpisodeList
          episodes={episodes}
          currentEpisodeNumber={currentEpisodeNumber}
          progressMap={progressMap}
          onSelect={onEpisodeSelect}
          blockWithoutVideo={blockWithoutVideo}
        />
      </div>
    </div>
  </aside>
);

export default WatchSidebar;
