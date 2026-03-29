import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Subtitles, Check } from 'lucide-react';
import { Anime, Episode } from '@/types';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { translateGenre } from '@/utils/genreTranslations';
import { cn } from '@/lib/utils';
import { useAuth } from '@/services/auth';
import { db } from '@/services/db';

export interface AnimeCardProps {
  anime: Anime;
  episode?: Episode;
  /** Legacy; zip home rails do not use rank numbers */
  featured?: boolean;
  layout?: 'poster' | 'landscape';
  /** 0–100 watch progress (continue watching) */
  progressPercent?: number;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, episode, layout = 'poster', progressPercent }) => {
  const [imgErrorCount, setImgErrorCount] = useState(0);
  const [inList, setInList] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const displayTitle = getDisplayTitle(anime.title);
  const slug = anime.slug || anime.id;
  const isLandscape = layout === 'landscape';
  const rawPortrait = proxyImage(anime.cover_image || '');
  const rawLandscape = proxyImage(anime.banner_image || anime.cover_image || '');
  const displayImage = isLandscape ? rawLandscape : rawPortrait;

  const pct = Math.min(100, Math.round((Number(anime.score) || 0) * 10));

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) {
        setInList(false);
        return;
      }
      const ok = await db.isAnimeInWatchlist(user.id, anime.id);
      if (!cancelled) setInList(ok);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, anime.id]);

  const getImageUrl = useCallback(() => {
    if (imgErrorCount === 0) return displayImage;
    if (imgErrorCount === 1 && displayImage) {
      return `https://images.weserv.nl/?url=${encodeURIComponent(displayImage.replace(/^https?:\/\//, ''))}&w=${isLandscape ? 1280 : 600}&h=${isLandscape ? 720 : 900}&fit=cover&q=80`;
    }
    return isLandscape
      ? `https://picsum.photos/seed/${encodeURIComponent(anime.id)}c/1280/720`
      : `https://picsum.photos/seed/${encodeURIComponent(anime.id)}p/600/900`;
  }, [imgErrorCount, displayImage, isLandscape, anime.id]);

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Lütfen önce giriş yapın.');
      return;
    }
    try {
      if (inList) {
        await db.removeWatchlistEntry(user.id, anime.id);
        setInList(false);
      } else {
        await db.updateWatchlist(user.id, anime.id, 'planning');
        setInList(true);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Watchlist toggle', err);
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const season = episode?.season_number ?? 1;
    const epNum = episode?.episode_number ?? 1;
    navigate(`/watch/${slug}/${season}/${epNum}`);
  };

  const showProgress = typeof progressPercent === 'number' && progressPercent >= 0;

  return (
    <Link
      to={`/anime/${slug}`}
      className={cn(
        'group relative w-full rounded-md overflow-hidden bg-app-surface transition-all duration-300 hover:scale-105 hover:z-20 hover:shadow-xl hover:shadow-black/50 block',
        isLandscape ? 'aspect-video' : 'aspect-[2/3]'
      )}
    >
      <img
        src={getImageUrl()}
        alt={displayTitle}
        onError={() => setImgErrorCount((prev) => prev + 1)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        referrerPolicy="no-referrer"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
        {anime.is_featured ? (
          <span className="px-1.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-sm uppercase tracking-wider">
            Vitrin
          </span>
        ) : null}
        {episode ? (
          <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-sm uppercase tracking-wider border border-white/10">
            S{episode.season_number ?? 1} E{episode.episode_number}
          </span>
        ) : null}
      </div>

      <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        <h3 className="text-white font-bold text-sm md:text-base line-clamp-2 mb-2 leading-tight drop-shadow-md">
          {displayTitle}
        </h3>

        <div className="flex items-center gap-2 mb-3 text-[11px] font-medium text-white/80 flex-wrap">
          <span className="text-green-400 font-bold">%{pct}</span>
          {anime.is_adult ? (
            <span className="px-1 border border-white/30 rounded text-white/70">18+</span>
          ) : null}
          <span>
            {episode
              ? `Bölüm ${episode.episode_number}`
              : anime.genres?.[0]
                ? translateGenre(anime.genres[0])
                : 'Anime'}
          </span>
          <span className="flex items-center gap-0.5 text-white/60">
            <Subtitles className="w-3 h-3" /> TR
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlay}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/80 transition-colors"
            aria-label="Oynat"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
          <button
            type="button"
            onClick={handleAction}
            className="w-8 h-8 rounded-full bg-black/50 border border-white/30 text-white flex items-center justify-center hover:border-white transition-colors"
            aria-label={inList ? 'Listeden çıkar' : 'Listeye ekle'}
          >
            {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showProgress ? (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div className="h-full bg-primary" style={{ width: `${Math.min(100, progressPercent)}%` }} />
        </div>
      ) : null}
    </Link>
  );
};

export default React.memo(AnimeCard);
