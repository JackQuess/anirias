import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard from '@/components/AnimeCard';
import { cn } from '@/lib/utils';
import { db } from '@/services/db';
import { useAuth } from '@/services/auth';
import type { Anime, Episode, WatchProgress, WatchlistEntry } from '@/types';

export type HomeRailType = 'continue' | 'new' | 'trending' | 'recommended' | 'list' | 'popular';

export interface HomeContentRailProps {
  title: string;
  type: HomeRailType;
  seeAllHref?: string;
  seeAllLabel?: string;
}

/**
 * Horizontal content strip from zip design: accent bar, italic title, hover arrows.
 */
const HomeContentRail: React.FC<HomeContentRailProps> = ({
  title,
  type,
  seeAllHref,
  seeAllLabel = 'Tümünü gör',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [continueItems, setContinueItems] = useState<WatchProgress[]>([]);
  const [episodeItems, setEpisodeItems] = useState<(Episode & { anime: Anime })[]>([]);
  const [animeItems, setAnimeItems] = useState<Anime[]>([]);
  const [ranked, setRanked] = useState<Anime[]>([]);
  const [listEntries, setListEntries] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        if (type === 'continue') {
          if (!user) {
            setContinueItems([]);
            return;
          }
          const data = await db.getContinueWatching(user.id);
          if (!cancelled) setContinueItems(data || []);
          return;
        }
        if (type === 'new') {
          const eps = await db.getLatestEpisodes(16);
          if (!cancelled) setEpisodeItems((eps || []).filter((e) => e.anime));
          return;
        }
        if (type === 'trending') {
          const all = await db.getAllAnimes('view_count', 24);
          const top = (all || []).slice(0, 10);
          if (!cancelled) setRanked(top);
          return;
        }
        if (type === 'recommended') {
          if (user) {
            const hist = await db.getWatchHistory(user.id, 40);
            const rec = await db.getPersonalizedRecommendations(hist);
            if (!cancelled) {
              setAnimeItems(rec.length ? rec : (await db.getAllAnimes('score', 15)) || []);
            }
          } else {
            const all = await db.getAllAnimes('score', 15);
            if (!cancelled) setAnimeItems(all || []);
          }
          return;
        }
        if (type === 'list') {
          if (!user) {
            setListEntries([]);
            return;
          }
          const w = await db.getWatchlist(user.id);
          const active = (w || []).filter((e) => ['watching', 'planning'].includes(e.status));
          if (!cancelled) setListEntries(active);
          return;
        }
        if (type === 'popular') {
          const all = await db.getAllAnimes('view_count', 18);
          if (!cancelled) setAnimeItems(all || []);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[HomeContentRail]', type, e);
        if (!cancelled) {
          setContinueItems([]);
          setEpisodeItems([]);
          setAnimeItems([]);
          setRanked([]);
          setListEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [type, user]);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth } = el;
    el.scrollTo({ left: dir === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth, behavior: 'smooth' });
  };

  const isLandscape = type === 'continue';
  const cardWidth = isLandscape
    ? 'w-[160px] sm:w-[200px] md:w-[240px] lg:w-[280px]'
    : 'w-[100px] sm:w-[130px] md:w-[160px] lg:w-[180px]';

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 md:px-12 lg:px-16 mb-10 sm:mb-12 font-inter">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mb-6" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={cn('bg-white/5 rounded-md animate-pulse shrink-0', cardWidth, isLandscape ? 'aspect-video' : 'aspect-[2/3]')}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'continue' && (!user || continueItems.length === 0)) return null;
  if (type === 'list' && (!user || listEntries.length === 0)) return null;

  const isEmpty =
    (type === 'new' && episodeItems.length === 0) ||
    (type === 'trending' && ranked.length === 0) ||
    (type === 'recommended' && animeItems.length === 0) ||
    (type === 'popular' && animeItems.length === 0);

  if (isEmpty) return null;

  return (
    <div
      className="relative w-full group/rail mb-10 md:mb-14 font-inter"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 md:px-12 lg:px-16 mb-4 sm:mb-6 min-w-0">
        <div className="w-1 h-7 sm:h-8 shrink-0 bg-primary shadow-[0_0_10px_rgba(229,9,20,0.35)]" />
        <h2 className="text-lg sm:text-xl md:text-3xl font-black text-white uppercase italic tracking-tighter min-w-0 line-clamp-2 sm:line-clamp-none leading-tight">
          {title}
        </h2>
        <div className="flex-1 h-px bg-white/5" />
        {seeAllHref ? (
          <Link
            to={seeAllHref}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45 hover:text-primary transition-colors shrink-0"
          >
            {seeAllLabel}
          </Link>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Sola kaydır"
          onClick={() => scrollBy('left')}
          className={cn(
            'hidden md:flex absolute left-0 top-0 bottom-0 w-16 z-40 bg-gradient-to-r from-background to-transparent items-center justify-center transition-all duration-300 hover:w-20',
            hovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-primary hover:border-primary transition-all">
            <ChevronLeft className="w-6 h-6 text-white" />
          </div>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto overflow-y-hidden px-4 sm:px-6 md:px-12 lg:px-16 pb-8 sm:pb-10 pt-2 no-scrollbar snap-x snap-mandatory scroll-pl-4 sm:scroll-pl-6 [-webkit-overflow-scrolling:touch]"
        >
          {type === 'continue' &&
            continueItems.map((item) => {
              const a = item.anime;
              const ep = item.episode;
              if (!a) return null;
              const pct =
                item.duration_seconds > 0 ? Math.min(100, (item.progress_seconds / item.duration_seconds) * 100) : 0;
              return (
                <div key={item.episode_id} className={cn('snap-start shrink-0', cardWidth)}>
                  <AnimeCard anime={a} episode={ep} layout="landscape" progressPercent={pct} />
                </div>
              );
            })}

          {type === 'new' &&
            episodeItems.map((ep) =>
              ep.anime ? (
                <div key={ep.id} className={cn('snap-start shrink-0', cardWidth)}>
                  <AnimeCard anime={ep.anime} episode={ep} />
                </div>
              ) : null
            )}

          {type === 'trending' &&
            ranked.map((anime) => (
              <div key={anime.id} className={cn('snap-start shrink-0', cardWidth)}>
                <AnimeCard anime={anime} />
              </div>
            ))}

          {(type === 'recommended' || type === 'popular') &&
            animeItems.map((anime) => (
              <div key={anime.id} className={cn('snap-start shrink-0', cardWidth)}>
                <AnimeCard anime={anime} />
              </div>
            ))}

          {type === 'list' &&
            listEntries.map((entry) =>
              entry.anime ? (
                <div key={entry.id} className={cn('snap-start shrink-0', cardWidth)}>
                  <AnimeCard anime={entry.anime} />
                </div>
              ) : null
            )}
        </div>

        <button
          type="button"
          aria-label="Sağa kaydır"
          onClick={() => scrollBy('right')}
          className={cn(
            'hidden md:flex absolute right-0 top-0 bottom-0 w-16 z-40 bg-gradient-to-l from-background to-transparent items-center justify-center transition-all duration-300 hover:w-20',
            hovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-primary hover:border-primary transition-all">
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default HomeContentRail;
