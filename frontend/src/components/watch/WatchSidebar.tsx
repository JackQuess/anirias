import React from 'react';
import type { Episode } from '@/types';
import type { WatchProgressChunk } from './WatchEpisodeList';
import WatchZipEpisodeRail from './WatchZipEpisodeRail';

export interface WatchSidebarProps {
  episodes: Episode[];
  animeSlug: string;
  seasonNum: number;
  currentEpisodeNumber: number;
  posterFallback: string;
  progressMap: Map<string, WatchProgressChunk>;
  onEpisodeSelect: (ep: Episode) => void;
  blockWithoutVideo?: boolean;
}

/** zip (2): sağ kolon — Bölümler başlığı, #12121a kart, küçük resimli liste */
const WatchSidebar: React.FC<WatchSidebarProps> = ({
  episodes,
  animeSlug,
  seasonNum,
  currentEpisodeNumber,
  posterFallback,
  progressMap,
  onEpisodeSelect,
  blockWithoutVideo,
}) => (
  <aside className="flex w-full flex-col gap-4 z-20 lg:w-96 lg:shrink-0">
    <div className="flex items-center justify-between bg-[#12121a] p-4 rounded-lg border border-white/5 shrink-0">
      <h3 className="font-bold text-lg text-white leading-none">Bölümler</h3>
      <span className="text-sm text-white/60 tabular-nums">
        {episodes.length} Bölüm
      </span>
    </div>

    <div className="flex flex-col gap-2 max-h-[800px] overflow-y-auto pr-2 watch-scrollbar min-h-0">
      <WatchZipEpisodeRail
        episodes={episodes}
        animeSlug={animeSlug}
        seasonNum={seasonNum}
        currentEpisodeNumber={currentEpisodeNumber}
        posterFallback={posterFallback}
        progressMap={progressMap}
        onSelect={onEpisodeSelect}
        blockWithoutVideo={blockWithoutVideo}
      />
    </div>
  </aside>
);

export default WatchSidebar;
