import React, { useRef, useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Subtitles, Share2, ChevronLeft, Plus, Check } from 'lucide-react';
import { useLoad } from '../services/useLoad';
import { db } from '../services/db';
import { useAuth } from '../services/auth';
import LoadingSkeleton from '../components/LoadingSkeleton';
import VideoPlayer from '../components/VideoPlayer';
import MascotLayer from '../components/decorative/MascotLayer';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { translateGenre } from '@/utils/genreTranslations';
import type { WatchProgress, Anime, Season, Episode, WatchlistStatus } from '../types';
import NotFound from './NotFound';
import { parseSeasonSlug, generateSeasonSlug } from '@/utils/seasonSlug';

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
};

const WatchInfoPanel: React.FC<WatchInfoPanelProps> = ({
  anime,
  episode,
  seasonNum,
  titleString,
  synopsis,
  scorePct,
  inList,
  onToggleList,
  onShare,
  hasSubtitles,
  user,
}) => {
  const detailPath = `/anime/${anime.slug || anime.id}`;
  const epTitle = episode.title?.replace(/<[^>]*>/g, '') || '';
  const epBlurb = episode.short_note?.replace(/<[^>]*>/g, '') || '';

  return (
    <div className="space-y-5">
      <Link
        to={detailPath}
        className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4 shrink-0" />
        Dizi sayfasına dön
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">{titleString}</h1>
        <p className="text-primary text-xs font-black uppercase tracking-widest mt-2">
          Sezon {seasonNum} · Bölüm {episode.episode_number}
          {epTitle ? ` · ${epTitle}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm font-medium text-white/85">
        <span className="text-emerald-400 font-bold">%{scorePct} uyum</span>
        {anime.year ? <span className="text-white/70">{anime.year}</span> : null}
        {anime.is_adult ? (
          <span className="px-1.5 py-0.5 border border-white/25 rounded text-[11px] text-white/75">18+</span>
        ) : null}
        <span className="px-1.5 py-0.5 border border-white/25 rounded text-[11px] text-white/75">4K HDR</span>
        {hasSubtitles ? (
          <span className="flex items-center gap-1.5 text-white/75">
            <Subtitles className="w-4 h-4 shrink-0" />
            Türkçe altyazı
          </span>
        ) : null}
      </div>

      {anime.genres?.length ? (
        <div className="flex flex-wrap gap-2">
          {anime.genres.slice(0, 8).map((g) => (
            <span
              key={g}
              className="text-[11px] font-semibold text-white/80 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
            >
              {translateGenre(g)}
            </span>
          ))}
        </div>
      ) : null}

      {epBlurb ? (
        <p className="text-sm text-white/65 leading-relaxed border-l-2 border-primary/60 pl-4">{epBlurb}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onShare()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Paylaş
        </button>
        {user ? (
          <button
            type="button"
            onClick={() => void onToggleList()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
          >
            {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {inList ? 'Listemde' : 'Listeme ekle'}
          </button>
        ) : null}
      </div>

      <section className="rounded-2xl border border-white/5 bg-surface-elevated p-5 md:p-6 shadow-lg">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
          <span className="text-lg leading-none">▍</span> Özet
        </h2>
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
          {synopsis.trim() ? synopsis : 'Bu içerik için özet henüz eklenmedi.'}
        </p>
      </section>
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
    
    // Always use navigate with replace: true for instant switching
    // This ensures React Router updates useParams and triggers useLoad
    const seasonSlug = generateSeasonSlug(anime.slug, targetSeasonNum);
    navigate(`/watch/${seasonSlug}/${targetSeasonNum}/${targetEpisodeNum}`, { replace: true });
  }, [anime?.slug, navigate]);

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
      <div className="min-h-screen bg-background font-inter flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-brand-surface/80 p-8 text-center">
          <p className="text-brand-red text-[10px] font-black uppercase tracking-[0.25em] mb-3">Izleme Verisi Alinamadi</p>
          <h2 className="text-white text-2xl font-black uppercase tracking-tight mb-3">Sayfa su an yuklenemiyor</h2>
          <p className="text-gray-300 text-sm mb-6">
            {watchError.message === 'NOT_FOUND'
              ? 'Istenen bolum veya sezon bulunamadi.'
              : `Baglanti hatasi: ${watchError.message}`}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-black text-xs uppercase tracking-[0.2em]"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  if (watchLoading || !anime || !season || !episode) {
    return (
      <div className="min-h-screen bg-background font-inter pt-20">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  // CRITICAL: Don't render player if playbackUrl is null
  // Player will mount only when video_url is available
  const shouldRenderPlayer = playbackUrl !== null && playbackUrl.trim() !== '';

  const titleString = getDisplayTitle(anime.title);
  const playerTitle = `${titleString.toUpperCase()} – Sezon ${seasonNum} • Bölüm ${episode.episode_number}`;
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
  const scorePct = Math.min(100, Math.round((Number(anime.score) || 0) * 10));
  const hasSubtitles = !!(subtitleFiles && subtitleFiles.length > 0);

  const commentsFallback = (
    <div className="text-muted text-sm font-semibold py-10 text-center rounded-2xl border border-white/5 bg-surface-elevated/50">
      Yorumlar yükleniyor…
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-inter" data-watch-page>
      {/* Mobile-First Layout */}
      <div className="xl:hidden">
        {/* Mobile Player - Full Width */}
        <div className="w-full bg-black">
          {shouldRenderPlayer ? (
            <VideoPlayer
              src={playbackUrl}
              poster={poster}
              title={playerTitle}
              animeSlug={anime.slug || undefined}
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
            <div className="w-full aspect-video bg-black flex items-center justify-center">
              <div className="text-white/50 text-sm font-semibold">Video yükleniyor...</div>
            </div>
          )}
        </div>

        <div className="px-4 py-8 bg-background border-t border-white/5">
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
          />
        </div>

        <div className="px-4 pb-6">
          <Suspense fallback={commentsFallback}>
            <Comments animeId={anime.id} episodeId={episode.id} />
          </Suspense>
        </div>

        {/* Mobile Episode List - Bottom Sheet */}
        <div className="fixed bottom-4 left-0 right-0 z-[120] px-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowMobileEpisodeSheet(true)}
              className="bg-primary text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-2xl shadow-lg shadow-primary/35 hover:opacity-95 transition-opacity"
            >
              Bölüm listesi
            </button>
          </div>
        </div>

        {/* Mobile Bottom Sheet Overlay */}
        {showMobileEpisodeSheet && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 z-[130] transition-opacity"
              onClick={() => setShowMobileEpisodeSheet(false)}
            />
            
            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-[140] bg-surface-elevated border-t border-white/10 rounded-t-[2rem] shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-white/20 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5 flex-shrink-0">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-l-4 border-primary pl-3">
                  Bölüm listesi
                </h3>
                <span className="text-[9px] font-black text-muted uppercase tracking-wide">
                  {episodes?.length || 0} bölüm
                </span>
              </div>
              
              {/* Episode List */}
              <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 custom-scrollbar space-y-1.5 min-h-0">
                {episodes?.map((ep) => {
                  const isCurrent = ep.episode_number === episodeNum;
                  const progress = progressMap.get(ep.id);
                  return (
                    <button
                      key={`${ep.season_id}-${ep.episode_number}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!ep.video_url && !ep.hls_url) return;
                        navigateToEpisode(seasonNum!, ep.episode_number);
                        setShowMobileEpisodeSheet(false);
                      }}
                      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all w-full max-w-full text-left h-[56px] flex-shrink-0 pointer-events-auto ${
                        isCurrent
                          ? 'bg-primary text-white shadow-md shadow-primary/25'
                          : 'hover:bg-white/5 text-gray-400 hover:text-white active:bg-white/10'
                      } ${(!ep.video_url && !ep.hls_url) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                        isCurrent ? 'bg-black/20' : 'bg-white/5'
                      }`}>
                        {ep.episode_number}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[9px] font-black uppercase truncate leading-tight">
                          {ep.title || `Bölüm ${ep.episode_number}`}
                        </p>
                        <p className={`text-[7px] font-bold uppercase mt-0.5 ${
                          isCurrent ? 'text-white/70' : 'text-gray-600'
                        }`}>
                          {ep.duration ? `${Math.floor(ep.duration / 60)} DK` : '24 DK'}
                        </p>
                        {progress && progress.duration > 0 && (
                          <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400"
                              style={{
                                width: `${Math.min(100, (progress.progress / progress.duration) * 100)}%`
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:block relative" data-watch-desktop>
        {/* Lightning Mascot - Far right background (1440px+ only, outside content) */}
        <div className="fixed top-20 right-0 z-0 pointer-events-none hidden 2xl:block">
          <MascotLayer type="lightning" />
        </div>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-20 lg:pt-32 pb-40 relative z-10">
          <div className="flex flex-col xl:flex-row gap-6 lg:gap-10 min-w-0">
            {/* Main Player Area */}
            <div className="flex-1 space-y-6 w-full min-w-0 overflow-hidden relative z-10 watch-player-area">
              {shouldRenderPlayer ? (
                <VideoPlayer
                  src={playbackUrl}
                  poster={poster}
                  title={playerTitle}
                  animeSlug={anime.slug || undefined}
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
                />
              ) : (
                <div className="w-full aspect-video bg-black flex items-center justify-center rounded-2xl border border-white/5">
                  <div className="text-white/50 text-sm font-semibold">Video yükleniyor...</div>
                </div>
              )}

              <div className="px-4 lg:px-0 pt-2">
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
                />
              </div>

              <div className="px-4 lg:px-0">
                <Suspense fallback={commentsFallback}>
                  <Comments animeId={anime.id} episodeId={episode.id} />
                </Suspense>
              </div>
            </div>

            {/* Episode List Sidebar */}
            <aside className="w-[320px] 2xl:w-[360px] flex-shrink-0 max-w-full space-y-6 relative z-20">
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5 h-[600px] flex flex-col shadow-xl overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 flex-shrink-0">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest border-l-4 border-primary pl-3">
                    Bölüm listesi
                  </h3>
                  <span className="text-[9px] font-black text-muted uppercase tracking-wide">
                    {episodes?.length || 0} bölüm
                  </span>
                </div>
                <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar space-y-1.5 min-h-0 w-full">
                  {episodes?.map((ep) => {
                    const isCurrent = ep.episode_number === episodeNum;
                    const progress = progressMap.get(ep.id);
                    return (
                      <button
                        key={`${ep.season_id}-${ep.episode_number}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!ep.video_url && !ep.hls_url) return;
                          navigateToEpisode(seasonNum!, ep.episode_number);
                        }}
                        className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all w-full max-w-full text-left h-[56px] flex-shrink-0 pointer-events-auto relative z-30 ${
                          isCurrent
                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                            : 'hover:bg-white/5 text-gray-400 hover:text-white'
                        } ${(!ep.video_url && !ep.hls_url) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                          isCurrent ? 'bg-black/20' : 'bg-white/5'
                        }`}>
                          {ep.episode_number}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-[9px] font-black uppercase truncate leading-tight">
                            {ep.title || `Bölüm ${ep.episode_number}`}
                          </p>
                          <p className={`text-[7px] font-bold uppercase mt-0.5 ${
                            isCurrent ? 'text-white/70' : 'text-gray-600'
                          }`}>
                            {ep.duration ? `${Math.floor(ep.duration / 60)} DK` : '24 DK'}
                          </p>
                          {progress && progress.duration > 0 && (
                            <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400"
                                style={{
                                  width: `${Math.min(100, (progress.progress / progress.duration) * 100)}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Now Watching Card */}
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
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">
                    Şimdi izleniyor
                  </p>
                  <h4 className="text-sm font-bold text-white leading-tight line-clamp-2">
                    {titleString}
                  </h4>
                  <p className="text-[10px] text-muted mt-1 font-semibold">
                    S{seasonNum} · B{episode.episode_number}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchSlug;
