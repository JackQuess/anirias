import React from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Episode } from '@/types';
import type { WatchProgressChunk } from './WatchEpisodeList';

export interface WatchZipEpisodeRailProps {
  episodes: Episode[];
  animeSlug: string;
  seasonNum: number;
  currentEpisodeNumber: number;
  posterFallback: string;
  progressMap: Map<string, WatchProgressChunk>;
  onSelect: (ep: Episode) => void;
  blockWithoutVideo?: boolean;
}

/** zip (2) / prod küçük resimli bölüm satırları */
const WatchZipEpisodeRail: React.FC<WatchZipEpisodeRailProps> = ({
  episodes,
  animeSlug,
  seasonNum,
  currentEpisodeNumber,
  posterFallback,
  progressMap,
  onSelect,
  blockWithoutVideo = false,
}) => {
  return (
    <>
      {episodes.map((ep, i) => {
        const epNum = ep.episode_number;
        const epTitle = ep.title?.replace(/<[^>]*>/g, '') || `${epNum}. Bölüm`;
        const isCurrent = currentEpisodeNumber === epNum;
        const noVideo = blockWithoutVideo && !ep.video_url && !ep.hls_url;
        const thumb =
          posterFallback ||
          `https://loremflickr.com/320/180/anime,scene?lock=${encodeURIComponent(animeSlug + String(i))}`;
        const durLabel = ep.duration_seconds
          ? `${Math.floor(ep.duration_seconds / 60)}:00`
          : '24:00';
        const prog = progressMap.get(ep.id);

        return (
          <Link
            replace
            key={ep.id || `${ep.season_id}-${epNum}`}
            to={`/watch/${encodeURIComponent(animeSlug)}/${seasonNum}/${epNum}`}
            onClick={(e) => {
              if (noVideo) e.preventDefault();
              else onSelect(ep);
            }}
            className={cn(
              'flex gap-3 p-2 rounded-lg transition-all',
              isCurrent
                ? 'bg-[#1a1a24] border border-white/10'
                : 'hover:bg-[#1a1a24] border border-transparent',
              noVideo && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="relative w-32 aspect-video rounded overflow-hidden shrink-0 bg-black">
              <img
                src={thumb}
                alt=""
                className={cn(
                  'w-full h-full object-cover transition-all duration-500',
                  isCurrent ? 'opacity-100' : 'opacity-60'
                )}
                referrerPolicy="no-referrer"
              />
              {isCurrent && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
              )}
              <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-[10px] font-bold rounded">
                {durLabel}
              </div>
              {prog && prog.duration > 0 ? (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                  <div
                    className="h-full bg-emerald-400"
                    style={{
                      width: `${Math.min(100, (prog.progress / prog.duration) * 100)}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div className="flex flex-col justify-center py-1 min-w-0">
              <h4
                className={cn(
                  'font-bold text-sm line-clamp-2',
                  isCurrent ? 'text-white' : 'text-white/80'
                )}
              >
                {epTitle}
              </h4>
              <p className="text-xs text-white/50 mt-1">Türkçe Altyazılı</p>
            </div>
          </Link>
        );
      })}
    </>
  );
};

export default WatchZipEpisodeRail;
