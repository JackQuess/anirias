import React from 'react';
import { type WatchProgressChunk } from './WatchEpisodeList';
import WatchZipEpisodeRail from './WatchZipEpisodeRail';
import type { Episode } from '@/types';

export interface WatchMobileEpisodeSheetProps {
  open: boolean;
  onClose: () => void;
  episodes: Episode[];
  animeSlug: string;
  seasonNum: number;
  currentEpisodeNumber: number;
  posterFallback: string;
  progressMap: Map<string, WatchProgressChunk>;
  onEpisodeSelect: (ep: Episode) => void;
  blockWithoutVideo?: boolean;
}

const WatchMobileEpisodeSheet: React.FC<WatchMobileEpisodeSheetProps> = ({
  open,
  onClose,
  episodes,
  animeSlug,
  seasonNum,
  currentEpisodeNumber,
  posterFallback,
  progressMap,
  onEpisodeSelect,
  blockWithoutVideo,
}) => {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[130] transition-opacity" onClick={onClose} aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-[140] bg-[#12121a] border-t border-white/5 rounded-t-[2rem] shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5 flex-shrink-0">
          <h3 className="font-bold text-lg text-white leading-none">Bölümler</h3>
          <span className="text-sm text-white/60 tabular-nums">{episodes.length} Bölüm</span>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 watch-scrollbar gap-2 min-h-0">
          <WatchZipEpisodeRail
            episodes={episodes}
            animeSlug={animeSlug}
            seasonNum={seasonNum}
            currentEpisodeNumber={currentEpisodeNumber}
            posterFallback={posterFallback}
            progressMap={progressMap}
            onSelect={(ep) => {
              onEpisodeSelect(ep);
              onClose();
            }}
            blockWithoutVideo={blockWithoutVideo}
          />
        </div>
      </div>
    </>
  );
};

export default WatchMobileEpisodeSheet;
