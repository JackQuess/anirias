import React from 'react';
import WatchEpisodeList, { type WatchProgressChunk } from './WatchEpisodeList';
import type { Episode } from '@/types';

export interface WatchMobileEpisodeSheetProps {
  open: boolean;
  onClose: () => void;
  episodes: Episode[];
  currentEpisodeNumber: number;
  progressMap: Map<string, WatchProgressChunk>;
  onEpisodeSelect: (ep: Episode) => void;
  blockWithoutVideo?: boolean;
}

/** WatchSlug ile aynı tam ekran alt sheet — Watch (legacy) mobilde de kullanılır */
const WatchMobileEpisodeSheet: React.FC<WatchMobileEpisodeSheetProps> = ({
  open,
  onClose,
  episodes,
  currentEpisodeNumber,
  progressMap,
  onEpisodeSelect,
  blockWithoutVideo,
}) => {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[130] transition-opacity" onClick={onClose} aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-[140] bg-[#121214] border-t border-white/[0.08] rounded-t-[2rem] shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <h3 className="text-sm font-bold text-white tracking-tight border-l-4 border-primary pl-3 leading-none">
            Bölüm listesi
          </h3>
          <span className="text-[11px] font-medium text-white/40 tabular-nums">{episodes.length} bölüm</span>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 watch-scrollbar space-y-1 min-h-0">
          <WatchEpisodeList
            episodes={episodes}
            currentEpisodeNumber={currentEpisodeNumber}
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
