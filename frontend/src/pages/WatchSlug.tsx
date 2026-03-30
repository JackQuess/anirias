import React, { useRef, useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Subtitles, Share2, ChevronLeft, Plus, Check, ThumbsUp, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimeCard from '@/components/AnimeCard';
import { useLoad } from '../services/useLoad';
import { db } from '../services/db';
import { useAuth } from '../services/auth';
import LoadingSkeleton from '../components/LoadingSkeleton';
import VideoPlayer from '../components/VideoPlayer';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import type { WatchProgress, Anime, Season, Episode, WatchlistStatus } from '../types';
import NotFound from './NotFound';
import { parseSeasonSlug } from '@/utils/seasonSlug';
import WatchSidebar from '@/components/watch/WatchSidebar';
import WatchMobileEpisodeSheet from '@/components/watch/WatchMobileEpisodeSheet';
import ReportWatchModal from '@/components/ReportWatchModal';
import { computeAnimeMatchPercent, formatMatchLabel } from '@/lib/matchScore';

const Comments = lazy(() => import('../components/Comments'));

type WatchInfoPanelProps = {
  anime: Anime;
  episode: Episode;
  seasonNum: number;
  titleString: string;
  synopsis: string;
  scorePct: number;
  inList: boolean;
  onToggleList: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
  hasSubtitles: boolean;
  user: { id: string } | null;
  onReport: () => void;
  episodeLikeCount: number;
  episodeLiked: boolean;
  onToggleEpisodeLike: () => void | Promise<void>;
};

const WatchInfoPanel: React.FC<WatchInfoPanelProps> = ({
  anime,
  episode: _episode,
  seasonNum: _seasonNum,
  titleString,
  synopsis,
  scorePct,
  inList,
  onToggleList,
  onShare,
  hasSubtitles,
  user,
  onReport,
  episodeLikeCount,
  episodeLiked,
  onToggleEpisodeLike,
}) => {
  const detailPath = `/anime/${anime.slug || anime.id}`;
  const [shareLabel, setShareLabel] = React.useState('Paylaş');

  const handleShare = () => {
    void onShare();
    setShareLabel('Kopyalandı!');
    setTimeout(() => setShareLabel('Paylaş'), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={detailPath}
        className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors w-fit"
      >
        <ChevronLeft className="w-4 h-4 shrink-0" />
        Dizi sayfasına dön
      </Link>

      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{titleString}</h1>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm text-white/70">
          <span className="text-green-400 font-bold">{formatMatchLabel(scorePct)}</span>
          {anime.year ? <span>{anime.year}</span> : null}
          {anime.is_adult ? (
            <span className="px-1.5 py-0.5 border border-white/20 rounded text-xs">18+</span>
          ) : null}
          <span className="px-1.5 py-0.5 border border-white/20 rounded text-xs">HD</span>
          {hasSubtitles ? (
            <span className="flex items-center gap-1.5 text-white/60 text-xs">
              <Subtitles className="w-4 h-4 shrink-0" />
              TR altyazı
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              if (!user) {
                alert('Beğenmek için giriş yapın.');
                return;
              }
              void onToggleEpisodeLike();
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded transition-colors',
              episodeLiked ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-white'
            )}
          >
            <ThumbsUp className={cn('w-5 h-5', episodeLiked && 'fill-current')} />
            <span className="text-sm font-medium">
              {episodeLiked ? 'Beğenildi' : 'Beğen'}
              {episodeLikeCount > 0 ? ` · ${episodeLikeCount}` : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded transition-colors text-white"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-sm font-medium">{shareLabel}</span>
          </button>
          <button
            type="button"
            onClick={onReport}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded transition-colors text-white"
          >
            <Flag className="w-5 h-5" />
            <span className="text-sm font-medium">Bildir</span>
          </button>
        </div>
      </div>

      {synopsis.trim() ? (
        <p className="text-white/80 text-sm md:text-base leading-relaxed">{synopsis}</p>
      ) : null}

      {user ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => void onToggleList()}
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white border border-white/10 rounded-lg px-3 py-2"
          >
            {inList ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {inList ? 'Listemde' : 'Listeme ekle'}
          </button>
        </div>
      ) : null}
    </div>
  );
};

interface WatchPagePayload {
  anime: Anime;
  season: Season;
  episode: Episode;
  seasons: Season[];
  episodes: Episode[];
}

const getApiBase = (): string | null => {
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (!apiBase || typeof apiBase !== 'string' || !apiBase.trim()) return null;
  return apiBase.replace(/\/+$/, '');
};

const WatchSlug: React.FC = () => {
  const { animeSlug, seasonNumber, episodeNumber } = useParams<{
    animeSlug: string;
    seasonNumber: string;
    episodeNumber: string;
  }>();

  const navigate = useNavigate();
  const { user } = useAuth();

  const seasonNum = seasonNumber ? parseInt(seasonNumber, 10) : null;
  const episodeNum = episodeNumber ? parseInt(episodeNumber, 10) : null;

  if (!animeSlug || !seasonNum || !episodeNum || isNaN(seasonNum) || isNaN(episodeNum) || seasonNum < 1 || episodeNum < 1) {
    return <NotFound />;
  }

  const progressSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [savedProgress, setSavedProgress] = useState<WatchProgress | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // CRITICAL: Episode state management - single source of truth
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  
  // Mobile bottom sheet state
  const [showMobileEpisodeSheet, setShowMobileEpisodeSheet] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Parse season slug to get anime slug
  const seasonSlugInfo = useMemo(() => {
    if (!animeSlug) return null;
    const parsed = parseSeasonSlug(animeSlug);
    if (!parsed) {
      return { animeSlug: animeSlug, seasonNumber: 1 };
    }
    return parsed;
  }, [animeSlug]);

  const { data: watchData, loading: watchLoading, error: watchError } = useLoad<WatchPagePayload | null>(
    async () => {
      if (!seasonSlugInfo) throw new Error('Invalid season slug');
      if (!seasonNum || !episodeNum) throw new Error('Invalid season/episode');
      const apiBase = getApiBase();
      if (!apiBase) throw new Error('Izleme servisi yapilandirilmamis (VITE_API_BASE_URL).');
      const res = await fetch(
        `${apiBase}/api/watch/${encodeURIComponent(seasonSlugInfo.animeSlug)}/${seasonNum}/${episodeNum}`
      );
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('NOT_FOUND');
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as WatchPagePayload;
    },
    [seasonSlugInfo?.animeSlug, seasonNum, episodeNum]
  );

  const anime = watchData?.anime ?? null;
  const season = watchData?.season ?? null;
  const seasons = watchData?.seasons ?? [];
  const episodes = watchData?.episodes ?? [];
  const episode = watchData?.episode ?? null;

  const [activeTab, setActiveTab] = useState<'episodes' | 'comments'>('episodes');
  const { data: recSource } = useLoad(() => db.getAllAnimes('view_count', 24), []);
  const recommendations = useMemo(() => {
    if (!recSource?.length) return [];
    const aid = anime?.id;
    if (!aid) return recSource.slice(0, 4);
    return recSource.filter((a) => a.id !== aid).slice(0, 4);
  }, [recSource, anime?.id]);

  const { data: progressList } = useLoad(
    () => {
      if (!user || !anime?.id) return Promise.resolve([]);
      return db.getWatchProgressForAnime(user.id, anime.id);
    },
    [user, anime?.id]
  );

  const { data: watchlistRows } = useLoad(
    () => (user?.id ? db.getWatchlist(user.id) : Promise.resolve([])),
    [user?.id]
  );

  const { data: episodeLikeSummary, reload: reloadEpisodeLikes } = useLoad(
    () => {
      if (!episode?.id) return Promise.resolve({ count: 0, liked: false });
      return db.getEpisodeLikeSummary(episode.id, user?.id ?? null);
    },
    [episode?.id, user?.id]
  );

  const toggleEpisodeLikeSlug = useCallback(async () => {
    if (!user || !episode?.id) return;
    try {
      await db.toggleEpisodeLike(user.id, episode.id);
      reloadEpisodeLikes();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[WatchSlug] episode like:', err);
      alert('Beğeni kaydedilemedi. episode_likes tablosu ve RLS politikalarını kontrol edin.');
    }
  }, [user, episode?.id, reloadEpisodeLikes]);

  const [listStatus, setListStatus] = useState<WatchlistStatus | 'none'>('none');

  useEffect(() => {
    if (!watchlistRows) return;
    if (!anime?.id) {
      setListStatus('none');
      return;
    }
    const row = watchlistRows.find((w) => w.anime_id === anime.id);
    setListStatus(row?.status ?? 'none');
  }, [anime?.id, watchlistRows]);

  const scorePct = useMemo(() => {
    if (!anime) return 0;
    return computeAnimeMatchPercent({
      watchlist: watchlistRows ?? null,
      targetAnime: anime,
      userId: user?.id ?? null,
    });
  }, [anime, watchlistRows, user?.id]);

  const toggleWatchlist = useCallback(async () => {
    if (!user || !anime?.id) {
      alert('Lütfen önce giriş yapın.');
      return;
    }
    try {
      if (listStatus !== 'none') {
        await db.removeWatchlistEntry(user.id, anime.id);
        setListStatus('none');
      } else {
        await db.updateWatchlist(user.id, anime.id, 'watching');
        setListStatus('watching');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[WatchSlug] watchlist:', err);
    }
  }, [user, anime?.id, listStatus]);

  const shareWatch = useCallback(async () => {
    if (!anime || !episode || seasonNum == null) return;
    const url = window.location.href;
    const t = `${getDisplayTitle(anime.title)} · S${seasonNum} B${episode.episode_number}`;
    try {
      if (navigator.share) await navigator.share({ title: t, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }, [anime, episode, seasonNum]);

  // CRITICAL: Update currentEpisodeId when episode changes (for episode switch optimization)
  useEffect(() => {
    if (episode?.id && episode.id !== currentEpisodeId) {
      setCurrentEpisodeId(episode.id);
      setPlayerReady(false); // Reset player ready state on episode change
    }
  }, [episode?.id, currentEpisodeId]);

  const isNotFound = useMemo(() => {
    if (watchLoading) return false;
    if (watchError?.message === 'NOT_FOUND') return true;
    if (watchError) return false;
    if (!anime || !season || !episode) return true;
    if (!anime.slug) return true;
    return false;
  }, [watchLoading, watchError, anime, season, episode]);

  // OPTIMIZED: Episode switch - instant switching with React Router
  const navigateToEpisode = useCallback((targetSeasonNum: number, targetEpisodeNum: number) => {
    if (!anime?.slug) return;
    navigate(`/watch/${encodeURIComponent(anime.slug)}/${targetSeasonNum}/${targetEpisodeNum}`, { replace: true });
  }, [anime?.slug, navigate]);

  /** Eski /watch/foo-season-4/4/1 adreslerini /watch/foo/4/1 yap */
  useEffect(() => {
    if (!anime?.slug || !seasonNum || !episodeNum || !animeSlug) return;
    const parsed = parseSeasonSlug(animeSlug);
    if (!parsed || parsed.animeSlug !== anime.slug) return;
    if (animeSlug === anime.slug) return;
    navigate(`/watch/${encodeURIComponent(anime.slug)}/${seasonNum}/${episodeNum}`, { replace: true });
  }, [anime?.slug, animeSlug, seasonNum, episodeNum, navigate]);

  const progressMap = useMemo(() => {
    const map = new Map<string, { progress: number; duration: number }>();
    if (progressList) {
      progressList.forEach((p: any) => {
        map.set(p.episode_id, { progress: p.progress_seconds || 0, duration: p.duration_seconds || 0 });
      });
    }
    return map;
  }, [progressList]);

  // CRITICAL: playbackUrl - single source of truth
  const playbackUrl = useMemo(() => {
    if (!episode) return null;
    return episode.video_url || episode.hls_url || null;
  }, [episode]);

  // Reset progress tracking when episode changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setSavedProgress(null);
    if (progressSaveIntervalRef.current) {
      clearInterval(progressSaveIntervalRef.current);
      progressSaveIntervalRef.current = null;
    }
  }, [episode?.id]);

  // Load saved progress for current episode
  useEffect(() => {
    if (!user || !episode?.id || !progressList) return;

    const progress = progressList.find((p: any) => p.episode_id === episode.id);
    if (progress) {
      setSavedProgress(progress);
    } else {
      setSavedProgress(null);
    }
  }, [user, episode?.id, progressList]);

  // Save watch progress
  useEffect(() => {
    if (!user || !episode || !anime || currentTime === 0 || duration === 0) return;

    if (progressSaveIntervalRef.current) {
      clearInterval(progressSaveIntervalRef.current);
    }

    progressSaveIntervalRef.current = setInterval(async () => {
      try {
        const progressPercent = (currentTime / duration) * 100;
        const isCompleted = progressPercent >= 90;

        await db.saveWatchProgress({
          user_id: user.id,
          episode_id: episode.id,
          anime_id: anime.id,
          progress_seconds: currentTime,
          duration_seconds: duration,
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error('[WatchSlug] Failed to save progress:', error);
      }
    }, 10000); // Save every 10 seconds

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    };
  }, [user, episode, anime, currentTime, duration]);

  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  // Find next episode
  const nextEpisode = useMemo(() => {
    if (!episodes || !episodeNum) return null;
    if (episodes.length > episodeNum) {
      return { seasonNumber: seasonNum!, episodeNumber: episodeNum + 1 };
    }
    // Check if there's a next season
    if (seasons && seasonNum) {
      const nextSeason = seasons.find((s) => s.season_number === seasonNum + 1);
      if (nextSeason) {
        return { seasonNumber: nextSeason.season_number, episodeNumber: 1 };
      }
    }
    return null;
  }, [episodes, episodeNum, seasonNum, seasons]);

  // CRITICAL: Preload next episode video for instant switching (Animely.net style)
  useEffect(() => {
    if (!nextEpisode || !episodes || !seasons) return;

    // Find the actual next episode object
    let nextEp = null;
    if (nextEpisode.seasonNumber === seasonNum) {
      // Same season, next episode
      nextEp = episodes.find(ep => ep.episode_number === nextEpisode.episodeNumber);
    } else {
      // Next season, first episode
      const nextSeason = seasons.find(s => s.season_number === nextEpisode.seasonNumber);
      if (nextSeason) {
        // We need to fetch episodes for next season, but for now just preload if we have the URL
        // This is a simplified version - full implementation would fetch next season episodes
      }
    }

    // Preload video URL if available
    if (nextEp && (nextEp.video_url || nextEp.hls_url)) {
      const videoUrl = nextEp.video_url || nextEp.hls_url;
      if (videoUrl) {
        // Prefetch video metadata and segments
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = videoUrl;
        link.as = 'video';
        document.head.appendChild(link);

        // For HLS, also prefetch the manifest
        if (videoUrl.includes('.m3u8')) {
          fetch(videoUrl, { method: 'HEAD' }).catch(() => {
            // Ignore errors, just trigger CDN cache
          });
        }

        if (import.meta.env.DEV) {
          console.log('[WatchSlug] Preloading next episode:', videoUrl);
        }

        return () => {
          // Cleanup prefetch link
          const existingLink = document.head.querySelector(`link[href="${videoUrl}"]`);
          if (existingLink) {
            existingLink.remove();
          }
        };
      }
    }
  }, [nextEpisode, episodes, seasons, seasonNum]);

  const handleEnded = useCallback(() => {
    // Auto-play next episode
    if (nextEpisode) {
      navigateToEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber);
    }
  }, [nextEpisode, navigateToEpisode]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handlePlayerReady = useCallback(() => {
    setPlayerReady(true);
  }, []);

  if (isNotFound) {
    return <NotFound />;
  }

  if (watchError && !watchLoading) {
    return (
      <div className="min-h-screen bg-black font-inter flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-xl border border-white/10 bg-[#121214] p-8 text-center shadow-xl">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.25em] mb-3">İzleme verisi alınamadı</p>
          <h2 className="text-white text-2xl font-black uppercase tracking-tight mb-3">Sayfa şu an yüklenemiyor</h2>
          <p className="text-gray-300 text-sm mb-6">
            {watchError.message === 'NOT_FOUND'
              ? 'İstenen bölüm veya sezon bulunamadı.'
              : `Bağlantı hatası: ${watchError.message}`}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-primary hover:opacity-90 text-white font-black text-xs uppercase tracking-[0.2em]"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  if (watchLoading || !anime || !season || !episode) {
    return (
      <div className="min-h-screen bg-[#08080c] font-inter pt-20">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  // CRITICAL: Don't render player if playbackUrl is null
  // Player will mount only when video_url is available
  const shouldRenderPlayer = playbackUrl !== null && playbackUrl.trim() !== '';

  const titleString = getDisplayTitle(anime.title);
  const episodeLineForPlayer =
    episode.title?.replace(/<[^>]*>/g, '') || `Bölüm ${episode.episode_number}`;
  const fallbackPoster = '/banners/hsdxd_rias_banner.webp';
  const rawPoster = anime.banner_image || anime.cover_image || null;
  const poster = proxyImage(rawPoster || fallbackPoster);
  const initialTime = savedProgress && savedProgress.progress_seconds > 0 ? savedProgress.progress_seconds : 0;

  const subtitleFiles = episode.subtitle_tracks?.length
    ? episode.subtitle_tracks.map((t) => ({
        src: t.url,
        label: t.label,
        srclang: t.lang,
      }))
    : undefined;

  const synopsis = (anime.description || '').replace(/<[^>]*>/g, '');
  const hasSubtitles = !!(subtitleFiles && subtitleFiles.length > 0);

  const commentsFallback = (
    <div className="text-white/40 text-sm font-semibold py-10 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
      Yorumlar yükleniyor…
    </div>
  );

  const watchSlug = anime.slug || anime.id;

  return (
    <div
      className="w-full min-h-screen bg-[#08080c] text-white flex flex-col font-inter antialiased pt-14 sm:pt-16 md:pt-20"
      data-watch-page
    >
      <div
        className="flex flex-col lg:flex-row w-full max-w-[1800px] mx-auto px-3 sm:px-4 md:px-8 gap-4 sm:gap-6 pb-10 sm:pb-16 md:pb-24"
        data-watch-layout
      >
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="relative w-full aspect-video rounded-lg border border-white/5 bg-black shadow-2xl overflow-hidden">
            {shouldRenderPlayer ? (
              <VideoPlayer
                src={playbackUrl}
                poster={poster}
                title={titleString}
                episodeLine={episodeLineForPlayer}
                animeSlug={anime.slug || undefined}
                onBack={() => navigate(-1)}
                subtitleFiles={subtitleFiles}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onSeek={handleSeek}
                initialTime={initialTime}
                introStart={episode.intro_start || undefined}
                introEnd={episode.intro_end || undefined}
                onSkipIntro={() => {}}
                hasNextEpisode={!!nextEpisode}
                onNextEpisode={() => {
                  if (nextEpisode) {
                    navigateToEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber);
                  }
                }}
                onPlayerReady={handlePlayerReady}
                externalPause={showMobileEpisodeSheet}
              />
            ) : (
              <div className="w-full h-full min-h-[12rem] flex items-center justify-center">
                <div className="text-white/50 text-sm font-semibold">Video yükleniyor...</div>
              </div>
            )}
          </div>

          <WatchInfoPanel
            anime={anime}
            episode={episode}
            seasonNum={seasonNum}
            titleString={titleString}
            synopsis={synopsis}
            scorePct={scorePct}
            inList={listStatus !== 'none'}
            onToggleList={toggleWatchlist}
            onShare={shareWatch}
            hasSubtitles={hasSubtitles}
            user={user}
            onReport={() => setReportModalOpen(true)}
            episodeLikeCount={episodeLikeSummary?.count ?? 0}
            episodeLiked={episodeLikeSummary?.liked ?? false}
            onToggleEpisodeLike={toggleEpisodeLikeSlug}
          />

          <div className="lg:hidden flex border-b border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('episodes')}
              className={cn(
                'flex-1 py-3 text-sm font-bold border-b-2 transition-colors',
                activeTab === 'episodes' ? 'border-primary text-white' : 'border-transparent text-white/50'
              )}
            >
              BÖLÜMLER
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={cn(
                'flex-1 py-3 text-sm font-bold border-b-2 transition-colors',
                activeTab === 'comments' ? 'border-primary text-white' : 'border-transparent text-white/50'
              )}
            >
              YORUMLAR
            </button>
          </div>

          <div className={cn(activeTab === 'comments' ? 'block' : 'hidden lg:block')}>
            <div className="rounded-lg border border-white/5 bg-[#0c0c10] p-5 md:p-6 shadow-xl">
              <Suspense fallback={commentsFallback}>
                <Comments animeId={anime.id} episodeId={episode.id} variant="watch" />
              </Suspense>
            </div>
          </div>

          {recommendations.length > 0 ? (
            <div className="mt-6 mb-8 lg:mt-10">
              <h3 className="text-xl font-bold mb-4">Önerilen İçerikler</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recommendations.map((item) => (
                  <AnimeCard key={item.id} anime={item} layout="poster" />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            'w-full lg:w-96 shrink-0 flex flex-col',
            activeTab === 'episodes' ? 'flex' : 'hidden lg:flex'
          )}
          data-watch-episode-column
        >
          <WatchSidebar
            episodes={episodes}
            animeSlug={watchSlug}
            seasonNum={seasonNum!}
            currentEpisodeNumber={episodeNum}
            posterFallback={poster}
            progressMap={progressMap}
            blockWithoutVideo
            onEpisodeSelect={(ep) => navigateToEpisode(seasonNum!, ep.episode_number)}
          />
        </div>
      </div>

      <div className="lg:hidden fixed bottom-4 left-0 right-0 z-[120] flex justify-end px-4 pointer-events-none">
        <button
          type="button"
          onClick={() => setShowMobileEpisodeSheet(true)}
          className="pointer-events-auto bg-primary text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-2xl shadow-lg shadow-primary/35 hover:opacity-95 transition-opacity"
        >
          Bölüm listesi
        </button>
      </div>

      <WatchMobileEpisodeSheet
        open={showMobileEpisodeSheet}
        onClose={() => setShowMobileEpisodeSheet(false)}
        episodes={episodes}
        animeSlug={watchSlug}
        seasonNum={seasonNum!}
        currentEpisodeNumber={episodeNum}
        posterFallback={poster}
        progressMap={progressMap}
        blockWithoutVideo
        onEpisodeSelect={(ep) => navigateToEpisode(seasonNum!, ep.episode_number)}
      />

      <ReportWatchModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        context={
          anime && episode && seasonNum != null && episodeNum != null
            ? {
                userId: user?.id ?? null,
                animeId: anime.id,
                animeTitle: titleString,
                animeSlug: anime.slug ?? null,
                seasonNumber: seasonNum,
                episodeNumber: episodeNum,
                episodeId: episode.id,
              }
            : null
        }
      />
    </div>
  );
};

export default WatchSlug;
