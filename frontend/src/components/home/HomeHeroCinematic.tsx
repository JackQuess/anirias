import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Info,
  Subtitles,
  MonitorPlay,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { db } from '@/services/db';
import { useAuth } from '@/services/auth';
import { useLoad } from '@/services/useLoad';
import { getDisplayTitle } from '@/utils/title';
import { computeAnimeMatchPercent, formatMatchLabel } from '@/lib/matchScore';
import { proxyImage } from '@/utils/proxyImage';
import { translateGenre } from '@/utils/genreTranslations';
import { cn } from '@/lib/utils';
import type { Anime } from '@/types';

/**
 * Zip (cinematic) hero: slide transitions, left gradients, next preview, rail-style controls.
 */
const HomeHeroCinematic: React.FC = () => {
  const { user } = useAuth();
  const { data: watchlistHero } = useLoad(
    () => (user?.id ? db.getWatchlist(user.id) : Promise.resolve([])),
    [user?.id]
  );

  const [heroPool, setHeroPool] = useState<Anime[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);

  const currentPreview = heroPool[currentIndex];
  const scorePct = useMemo(() => {
    if (!currentPreview) return 0;
    return computeAnimeMatchPercent({
      watchlist: watchlistHero ?? null,
      targetAnime: currentPreview,
      userId: user?.id ?? null,
    });
  }, [currentPreview, watchlistHero, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let featured = await db.getFeaturedAnimes();
        if (!featured?.length) {
          featured = await db.getAllAnimes('view_count', 10);
        }
        if (!cancelled) setHeroPool(featured || []);
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[HomeHeroCinematic]', e);
        if (!cancelled) setHeroPool([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const nextSlide = useCallback(() => {
    if (heroPool.length === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % heroPool.length);
  }, [heroPool.length]);

  const prevSlide = useCallback(() => {
    if (heroPool.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + heroPool.length) % heroPool.length);
  }, [heroPool.length]);

  useEffect(() => {
    if (heroPool.length <= 1) return;
    const t = setInterval(nextSlide, 8000);
    return () => clearInterval(t);
  }, [nextSlide, heroPool.length]);

  if (loading) {
    return (
      <div className="relative w-full h-[70vh] min-h-[380px] sm:h-[80vh] sm:min-h-[480px] md:h-[85vh] md:min-h-[600px] bg-surface-elevated animate-pulse flex items-end pb-20 sm:pb-24 md:pb-32 px-4 md:px-12 font-inter">
        <div className="space-y-6 w-full max-w-2xl">
          <div className="h-16 md:h-24 bg-white/5 rounded-lg w-3/4" />
          <div className="h-6 bg-white/5 rounded w-1/2" />
          <div className="h-24 bg-white/5 rounded w-full" />
          <div className="flex gap-4">
            <div className="h-12 bg-white/5 rounded w-32" />
            <div className="h-12 bg-white/5 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (heroPool.length === 0) {
    return (
      <div className="relative w-full min-h-[40vh] flex flex-col items-center justify-center px-6 py-16 text-center text-white/70 font-inter bg-background">
        <p className="text-lg font-semibold text-white mb-2">Vitrin içeriği yüklenemedi</p>
        <p className="max-w-md text-sm text-white/60">
          Öne çıkan veya listelenecek anime bulunamadı. Bağlantı ve Supabase ayarlarını kontrol edin.
        </p>
      </div>
    );
  }

  const current = heroPool[currentIndex];
  const nextAnime = heroPool[(currentIndex + 1) % heroPool.length];
  const title = getDisplayTitle(current.title);
  const slug = current.slug || current.id;
  const banner = proxyImage(current.banner_image || current.cover_image || '');
  const nextBanner = proxyImage(nextAnime.banner_image || nextAnime.cover_image || '');
  const genreLabel = current.genres?.[0] ? translateGenre(current.genres[0]) : 'Anime';
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (dir: number) => ({ zIndex: 0, x: dir < 0 ? 1000 : -1000, opacity: 0 }),
  };

  return (
    <div className="relative w-full h-[72vh] min-h-[420px] sm:h-[82vh] sm:min-h-[520px] md:h-[85vh] md:min-h-[600px] max-h-[920px] flex items-end pb-16 sm:pb-20 md:pb-24 overflow-hidden group font-inter bg-background">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.4 },
          }}
          className="absolute inset-0 w-full h-full"
        >
          <div className="absolute inset-0 w-full h-full bg-black">
            <img
              src={banner}
              alt={title}
              className="w-full h-full object-cover opacity-70"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent w-[80%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent h-full" />
          </div>

          <div className="relative z-30 w-full h-full px-4 sm:px-6 md:px-12 flex flex-col md:flex-row justify-between items-end pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-20 md:pb-24 gap-6 sm:gap-10">
            <div className="max-w-2xl min-w-0 flex flex-col gap-3 sm:gap-5">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-black text-xl tracking-tighter">A</span>
                  <span className="text-white/80 font-bold tracking-[0.2em] text-xs">
                    S E R İ S İ
                  </span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <span className="text-primary font-bold text-xs tracking-widest uppercase">VİTRİN ÖZEL</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.05] sm:leading-none drop-shadow-lg uppercase break-words">
                {title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/90 drop-shadow-md">
                <span className="text-green-400 font-bold">{formatMatchLabel(scorePct)}</span>
                <span>{current.year || '2024'}</span>
                <span className="px-1.5 py-0.5 border border-white/20 rounded text-[11px] font-bold text-white/80">18+</span>
                <span className="px-1.5 py-0.5 border border-white/20 rounded text-[11px] font-bold text-white/80 uppercase">
                  {genreLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <Subtitles className="w-4 h-4" />
                  Türkçe
                </span>
              </div>

              <p className="text-base md:text-lg text-white/90 line-clamp-3 max-w-xl font-normal leading-relaxed drop-shadow-md">
                {current.description?.replace(/<[^>]*>/g, '') || ''}
              </p>

              <div className="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mt-3 sm:mt-4 w-full sm:w-auto">
                <Link
                  to={`/watch/${slug}/1/1`}
                  className="flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 bg-white text-black px-6 sm:px-8 py-3 rounded font-bold text-sm sm:text-base hover:bg-white/80 transition-colors active:scale-95 touch-manipulation"
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current shrink-0" />
                  Hemen İzle
                </Link>
                <Link
                  to={`/anime/${slug}`}
                  className="flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 bg-gray-500/40 backdrop-blur-sm text-white px-6 sm:px-8 py-3 rounded font-bold text-sm sm:text-base hover:bg-gray-500/60 transition-colors active:scale-95 touch-manipulation"
                >
                  <Info className="w-6 h-6" />
                  Detaylar
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-end gap-6 mb-4">
              <div className="flex flex-col gap-2">
                <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase text-right">SIRADAKİ</span>
                <Link
                  to={`/anime/${nextAnime.slug || nextAnime.id}`}
                  className="group/next relative w-48 aspect-video rounded-md overflow-hidden border border-white/10 hover:border-primary/50 transition-colors"
                >
                  <img
                    src={nextBanner}
                    alt={getDisplayTitle(nextAnime.title)}
                    className="w-full h-full object-cover opacity-60 group-hover/next:opacity-100 group-hover/next:scale-110 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[10px] font-bold text-white line-clamp-1 uppercase tracking-tight">
                      {getDisplayTitle(nextAnime.title)}
                    </p>
                  </div>
                </Link>
              </div>

              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded p-4 flex flex-col gap-3 min-w-[200px] text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Bölümler</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <MonitorPlay className="w-4 h-4 text-primary" />
                    24
                  </span>
                </div>
                <div className="h-px w-full bg-white/10" />
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Durum</span>
                  <span className="text-white font-bold text-right">Devam Ediyor</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {heroPool.length > 1 && (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom,0px)+0.5rem)] right-4 sm:right-6 md:right-12 z-50 flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 mr-2">
            {heroPool.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Slayt ${idx + 1}`}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={cn(
                  'h-1 transition-all duration-300 rounded-full',
                  idx === currentIndex ? 'w-8 bg-primary' : 'w-4 bg-white/20 hover:bg-white/40'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Önceki"
              onClick={prevSlide}
              className="p-2 rounded-full border border-white/20 bg-black/25 backdrop-blur-sm text-white hover:bg-white hover:text-black transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Sonraki"
              onClick={nextSlide}
              className="p-2 rounded-full border border-white/20 bg-black/25 backdrop-blur-sm text-white hover:bg-white hover:text-black transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeHeroCinematic;
