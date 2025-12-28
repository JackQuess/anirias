import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { useLoad } from '../services/useLoad';
import { db } from '../services/db';
import { useAuth } from '../services/auth';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Comments from '../components/Comments';
import PlayerOverlay from '../components/PlayerOverlay';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { WatchProgress } from '../types';
import NotFound from './NotFound';

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [showAutoPlayOverlay, setShowAutoPlayOverlay] = useState(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showContinueWatching, setShowContinueWatching] = useState(false);
  const [savedProgress, setSavedProgress] = useState<WatchProgress | null>(null);
  const progressSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const { data: anime, loading: animeLoading, error: animeError } = useLoad(
    () => {
      if (!animeSlug) throw new Error('Anime slug required');
      return db.getAnimeBySlug(animeSlug);
    },
    [animeSlug]
  );

  const { data: season, loading: seasonLoading, error: seasonError } = useLoad(
    () => {
      if (!anime?.id || !seasonNum) throw new Error('Anime and season required');
      return db.getSeasonByAnimeAndNumber(anime.id, seasonNum);
    },
    [anime?.id, seasonNum]
  );

  const { data: episode, loading: episodeLoading, error: episodeError } = useLoad(
    () => {
      if (!season?.id || !episodeNum) throw new Error('Season and episode required');
      return db.getEpisodeBySeasonAndNumber(season.id, episodeNum);
    },
    [season?.id, episodeNum]
  );

  const { data: seasons } = useLoad(
    () => {
      if (!anime?.id) throw new Error('Anime required');
      return db.getSeasons(anime.id);
    },
    [anime?.id]
  );

  const { data: episodes } = useLoad(
    () => {
      if (!season?.id) throw new Error('Season required');
      return db.getEpisodesBySeasonId(season.id);
    },
    [season?.id]
  );

  const { data: progressList } = useLoad(
    () => {
      if (!user || !anime?.id) return Promise.resolve([]);
      return db.getWatchProgressForAnime(user.id, anime.id);
    },
    [user, anime?.id]
  );

  const isNotFound = useMemo(() => {
    if (animeLoading || seasonLoading || episodeLoading) return false;
    if (animeError || !anime) return true;
    if (seasonError || !season) return true;
    if (episodeError || !episode) return true;
    if (!anime.slug) return true;
    return false;
  }, [animeLoading, seasonLoading, episodeLoading, animeError, seasonError, episodeError, anime, season, episode]);

  const navigateToEpisode = useCallback((targetSeasonNum: number, targetEpisodeNum: number) => {
    if (!anime?.slug) return;
    navigate(`/watch/${anime.slug}/${targetSeasonNum}/${targetEpisodeNum}`);
  }, [anime?.slug, navigate]);

  const prevEpisode = useMemo(() => {
    if (!episodes || !episodeNum) return null;
    if (episodeNum > 1) {
      return { seasonNumber: seasonNum!, episodeNumber: episodeNum - 1 };
    }
    if (seasons && seasonNum && seasonNum > 1) {
      const prevSeason = seasons.find(s => s.season_number === seasonNum - 1);
      if (prevSeason) {
        return { seasonNumber: prevSeason.season_number, episodeNumber: 1 };
      }
    }
    return null;
  }, [episodes, episodeNum, seasonNum, seasons]);

  const nextEpisode = useMemo(() => {
    if (!episodes || !episodeNum) return null;
    if (episodes.length > episodeNum) {
      return { seasonNumber: seasonNum!, episodeNumber: episodeNum + 1 };
    }
    if (seasons && seasonNum) {
      const nextSeason = seasons.find(s => s.season_number === seasonNum + 1);
      if (nextSeason) {
        return { seasonNumber: nextSeason.season_number, episodeNumber: 1 };
      }
    }
    return null;
  }, [episodes, episodeNum, seasonNum, seasons]);

  const progressMap = useMemo(() => {
    const map = new Map<string, { progress: number; duration: number }>();
    if (progressList) {
      progressList.forEach((p: any) => {
        map.set(p.episode_id, { progress: p.progress_seconds || 0, duration: p.duration_seconds || 0 });
      });
    }
    return map;
  }, [progressList]);

  const playbackUrl = useMemo(() => {
    if (!episode) return null;
    return episode.video_url || episode.hls_url || null;
  }, [episode]);

  useEffect(() => {
    setHasStarted(false);
    setIsPlaying(false);
    setShowControls(false);
    setIsBuffering(false);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsUserSeeking(false);
    setIntroSkipped(false);
    setAutoPlayCountdown(null);
    setShowAutoPlayOverlay(false);
    setShowContinueWatching(false);
    setSavedProgress(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (progressSaveIntervalRef.current) {
      clearInterval(progressSaveIntervalRef.current);
      progressSaveIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [episode?.id]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const syncDuration = useCallback(() => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;
    if (dur !== duration) {
      setDuration(dur);
    }
  }, [duration]);

  const showControlsTemporary = useCallback(() => {
    if (isUserSeeking) return;
    setShowControls(true);
    document.body.style.cursor = 'default';
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSpeedMenu && !showQualityMenu && !showVolumeSlider) {
        setShowControls(false);
        if (isFullscreen) document.body.style.cursor = 'none';
      }
    }, isMobile ? 2200 : 2500);
  }, [isPlaying, isFullscreen, isMobile, isUserSeeking, showSpeedMenu, showQualityMenu, showVolumeSlider]);

  const togglePlay = useCallback((e?: React.MouseEvent | KeyboardEvent, skipControls?: boolean) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setHasStarted(true);
        setIsPlaying(true);
        if (!skipControls) showControlsTemporary();
      }).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (!skipControls) showControlsTemporary();
    }
  }, [showControlsTemporary]);

  const skipTime = useCallback((amount: number) => {
    if (!videoRef.current) return;
    setIsUserSeeking(true);
    videoRef.current.currentTime += amount;
    setTimeout(() => {
      setIsUserSeeking(false);
    }, 100);
  }, []);

  const goToEpisode = useCallback((targetSeasonNum: number, targetEpisodeNum: number) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoPlayCountdown(null);
    setShowAutoPlayOverlay(false);
    navigateToEpisode(targetSeasonNum, targetEpisodeNum);
  }, [navigateToEpisode]);

  const handleCancelAutoPlay = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoPlayCountdown(null);
    setShowAutoPlayOverlay(false);
  }, []);

  const handleNextEpisodeNow = useCallback(() => {
    if (nextEpisode) {
      goToEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber);
    }
  }, [nextEpisode, goToEpisode]);

  const handlePrevEpisodeNow = useCallback(() => {
    if (prevEpisode) {
      goToEpisode(prevEpisode.seasonNumber, prevEpisode.episodeNumber);
    }
  }, [prevEpisode, goToEpisode]);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (!newMuted && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
      showControlsTemporary();
    }
  };

  const cyclePlaybackRate = useCallback(() => {
    if (!videoRef.current) return;
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    videoRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
    showControlsTemporary();
  }, [playbackSpeed, showControlsTemporary]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (playerContainerRef.current?.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen();
        } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    } catch {
      // ignore
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      const newTime = videoRef.current.currentTime;
      setCurrentTime(newTime);
      if (duration > 0 && nextEpisode && !autoPlayCountdown && !showAutoPlayOverlay) {
        const progressPercent = (newTime / duration) * 100;
        if (progressPercent >= 95) {
          setShowAutoPlayOverlay(true);
          setAutoPlayCountdown(10);
        }
      }
    }
  };

  const showNextEpisodeButton = useMemo(() => {
    if (!nextEpisode || !duration) return false;
    const remaining = duration - currentTime;
    return remaining <= 90 && remaining > 0;
  }, [nextEpisode, duration, currentTime]);

  const onProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered(bufferedEnd);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleDurationChange = () => syncDuration();
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleDurationChange);
    video.playbackRate = playbackSpeed;
    return () => {
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleDurationChange);
    };
  }, [syncDuration, playbackSpeed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable || target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }
      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay(undefined, true);
          break;
        case 'ArrowRight':
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(e.code === 'ArrowRight' ? 10 : -10);
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            e.preventDefault();
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen();
            }
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;
    setPlaybackError(null);
    setIsBuffering(true);
    const isHls = playbackUrl.endsWith('.m3u8');
    if (!isHls) {
      hlsRef.current?.destroy();
      video.src = playbackUrl;
      video.load();
      setIsBuffering(false);
      return () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      };
    }
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl;
      video.load();
      return () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      };
    }
    if (Hls.isSupported()) {
      hlsRef.current?.destroy();
      const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setPlaybackError('Video yüklenemedi (HLS fatal error)');
          hls.destroy();
        }
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        syncDuration();
      });
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
    } else {
      setPlaybackError('Tarayıcı HLS desteklemiyor');
    }
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [playbackUrl, syncDuration]);

  useEffect(() => {
    const handleFull = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFull);
    return () => document.removeEventListener('fullscreenchange', handleFull);
  }, []);

  useEffect(() => {
    if (user && videoRef.current && episode) {
      progressSaveIntervalRef.current = setInterval(() => {
        if (!videoRef.current?.paused && videoRef.current.duration > 0) {
          const currentProgress = Math.floor(videoRef.current.currentTime);
          const totalDuration = Math.floor(videoRef.current.duration);
          const progressPercent = (currentProgress / totalDuration) * 100;
          if (progressPercent >= 90) {
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: anime!.id,
              episode_id: episode.id,
              progress_seconds: 0,
              duration_seconds: totalDuration
            });
          } else {
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: anime!.id,
              episode_id: episode.id,
              progress_seconds: currentProgress,
              duration_seconds: totalDuration
            });
          }
        }
      }, 10000);
      return () => {
        if (progressSaveIntervalRef.current) {
          clearInterval(progressSaveIntervalRef.current);
          progressSaveIntervalRef.current = null;
        }
      };
    }
  }, [user, episode, anime]);

  useEffect(() => {
    if (user && episode && videoRef.current && duration > 0) {
      db.getWatchProgress(user.id, anime!.id, episode.id).then(prog => {
        if (prog && prog.duration_seconds > 0) {
          const progressPercent = (prog.progress_seconds / prog.duration_seconds) * 100;
          if (progressPercent >= 90) {
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: anime!.id,
              episode_id: episode.id,
              progress_seconds: 0,
              duration_seconds: prog.duration_seconds
            });
            setSavedProgress(null);
            setShowContinueWatching(false);
          } else if (prog.progress_seconds > 0 && progressPercent < 90) {
            setSavedProgress(prog);
            setShowContinueWatching(true);
          } else {
            setSavedProgress(null);
            setShowContinueWatching(false);
          }
        } else {
          setSavedProgress(null);
          setShowContinueWatching(false);
        }
      });
    } else {
      setSavedProgress(null);
      setShowContinueWatching(false);
    }
  }, [user, episode, anime, duration]);

  useEffect(() => {
    if (autoPlayCountdown !== null && autoPlayCountdown > 0) {
      countdownTimerRef.current = setInterval(() => {
        setAutoPlayCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            if (nextEpisode) {
              handleNextEpisodeNow();
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      };
    }
  }, [autoPlayCountdown, nextEpisode, handleNextEpisodeNow]);

  const introStart = episode?.intro_start ?? null;
  const introEnd = episode?.intro_end ?? null;

  const handleSkipIntro = useCallback(() => {
    if (!videoRef.current || !introEnd) return;
    videoRef.current.currentTime = introEnd;
    setIntroSkipped(true);
  }, [introEnd]);

  const handleContinueWatching = useCallback(() => {
    if (!videoRef.current || !savedProgress) return;
    videoRef.current.currentTime = savedProgress.progress_seconds;
    setShowContinueWatching(false);
  }, [savedProgress]);

  const handleStartFromBeginning = useCallback(() => {
    if (!videoRef.current || !savedProgress || !user || !episode || !anime) return;
    db.saveWatchProgress({
      user_id: user.id,
      anime_id: anime.id,
      episode_id: episode.id,
      progress_seconds: 0,
      duration_seconds: savedProgress.duration_seconds
    });
    videoRef.current.currentTime = 0;
    setShowContinueWatching(false);
    setSavedProgress(null);
  }, [savedProgress, user, episode, anime]);

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  if (isNotFound) {
    return <NotFound />;
  }

  if (animeLoading || seasonLoading || episodeLoading || !anime || !season || !episode) {
    return (
      <div className="min-h-screen bg-brand-black pt-20">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  if (!playbackUrl) {
    return (
      <div className="pt-40 text-center text-white font-black uppercase space-y-4">
        <div>Video henüz eklenmemiş.</div>
        <div className="text-gray-400 text-sm mt-2">Bölüm {episodeNum} - Sezon {seasonNum}</div>
      </div>
    );
  }

  const titleString = getDisplayTitle(anime.title);
  const episodeTitle = episode.title || `Bölüm ${episode.episode_number}`;
  const fallbackPoster = '/banners/hsdxd_rias_banner.webp';
  const rawPoster = anime.banner_image || anime.cover_image || null;
  const poster = proxyImage(rawPoster || fallbackPoster);
  const shouldShowControls = !hasStarted || !isPlaying || showControls || isBuffering || !!playbackError;
  const hasIntro = introStart !== null && introEnd !== null && introStart < introEnd;
  const isInIntro = hasIntro && !introSkipped && currentTime >= introStart && currentTime < introEnd;

  return (
    <div className="min-h-screen bg-brand-black">
      <div className="z-[130] mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 pt-20 lg:pt-32 pb-40">
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-10 min-w-0">
          <div className="flex-1 space-y-4 lg:space-y-6 w-full min-w-0 overflow-hidden">
            <div
              ref={playerContainerRef}
              className="w-full aspect-video bg-black lg:rounded-[1.5rem] overflow-hidden lg:border border-white/5 shadow-2xl select-none sticky top-0 lg:static z-50 ring-1 ring-white/5 max-h-[80vh]"
              onDoubleClick={toggleFullscreen}
            >
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain z-10"
                  playsInline
                  crossOrigin="anonymous"
                  poster={poster}
                  onLoadedMetadata={syncDuration}
                  onTimeUpdate={onTimeUpdate}
                  onProgress={onProgress}
                  onWaiting={() => setIsBuffering(true)}
                  onPlaying={() => { setIsBuffering(false); setIsPlaying(true); setHasStarted(true); syncDuration(); }}
                  onPause={() => setIsPlaying(false)}
                  onEnded={handleEnded}
                  onError={() => setPlaybackError('Video oynatılamadı.')}
                  onClick={(e) => { e.stopPropagation(); togglePlay(e as any); }}
                  controls={false}
                />

                <PlayerOverlay
                  title={titleString}
                  episodeLabel={`${episode.episode_number}. Bölüm`}
                  duration={duration}
                  currentTime={currentTime}
                  paused={!isPlaying}
                  muted={isMuted}
                  playbackRate={playbackSpeed}
                  onTogglePlay={() => togglePlay()}
                  onSeek={skipTime}
                  onSeekTo={(percent) => {
                    if (videoRef.current && duration) {
                      const newTime = percent * duration;
                      videoRef.current.currentTime = newTime;
                      setCurrentTime(newTime);
                    }
                  }}
                  onNextEpisode={handleNextEpisodeNow}
                  onPrevEpisode={handlePrevEpisodeNow}
                  onToggleMute={toggleMute}
                  onToggleFullscreen={toggleFullscreen}
                  onCyclePlaybackRate={cyclePlaybackRate}
                  hasNextEpisode={showNextEpisodeButton && !!nextEpisode}
                  hasPrevEpisode={!!prevEpisode}
                  onMouseMove={showControlsTemporary}
                />

                {isInIntro && (
                  <div className="absolute bottom-6 right-6 z-50 pointer-events-auto transition-opacity duration-300 opacity-100">
                    <button
                      onClick={handleSkipIntro}
                      className="bg-black/75 hover:bg-black/90 backdrop-blur-md text-white px-6 py-3 rounded-lg font-black uppercase tracking-widest text-xs border border-white/20 hover:border-white/40 transition-all duration-300 shadow-2xl flex items-center gap-2 group"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                        <polygon points="5 3 19 12 5 21 5 3" />
                        <line x1="19" y1="12" x2="5" y2="12" />
                      </svg>
                      <span>Girişi Atla</span>
                    </button>
                  </div>
                )}

                {showContinueWatching && savedProgress && (
                  <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-auto">
                    <div className="bg-black/90 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full mx-4 transition-opacity duration-300 opacity-100">
                      <div className="text-center space-y-6">
                        <div>
                          <h3 className="text-white font-black text-xl uppercase tracking-tight mb-2">
                            Kaldığın Yerden Devam Et
                          </h3>
                          <p className="text-gray-300 text-sm font-bold">
                            {formatTime(savedProgress.progress_seconds)} / {formatTime(savedProgress.duration_seconds)}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={handleStartFromBeginning}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs rounded-lg border border-white/20 transition-all"
                          >
                            Baştan İzle
                          </button>
                          <button
                            onClick={handleContinueWatching}
                            className="px-8 py-3 bg-brand-red hover:bg-brand-redHover text-white font-black uppercase tracking-widest text-xs rounded-lg shadow-lg shadow-brand-red/20 transition-all"
                          >
                            Devam Et
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showAutoPlayOverlay && nextEpisode && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
                    <div className="bg-black/80 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full mx-4 transition-opacity duration-300 opacity-100">
                      <div className="text-center space-y-6">
                        <div>
                          <h3 className="text-white font-black text-xl uppercase tracking-tight mb-2">
                            Sonraki Bölüm
                          </h3>
                          <p className="text-gray-300 text-sm font-bold">
                            Bölüm {nextEpisode.episodeNumber}
                            {episodes?.find(e => e.episode_number === nextEpisode.episodeNumber)?.title && `: ${episodes.find(e => e.episode_number === nextEpisode.episodeNumber)?.title}`}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={handleCancelAutoPlay}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs rounded-lg border border-white/20 transition-all"
                          >
                            İptal
                          </button>
                          <button
                            onClick={handleNextEpisodeNow}
                            className="px-8 py-3 bg-brand-red hover:bg-brand-redHover text-white font-black uppercase tracking-widest text-xs rounded-lg shadow-lg shadow-brand-red/20 transition-all flex items-center gap-2"
                          >
                            <span>Şimdi İzle</span>
                            {autoPlayCountdown !== null && autoPlayCountdown > 0 && (
                              <span className="text-xs font-black">
                                ({autoPlayCountdown}s)
                              </span>
                            )}
                          </button>
                        </div>
                        {autoPlayCountdown !== null && autoPlayCountdown > 0 && (
                          <p className="text-gray-400 text-xs font-bold">
                            {autoPlayCountdown} saniye sonra otomatik oynatılacak
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isBuffering && !playbackError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}

                {playbackError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-sm font-black uppercase tracking-widest z-30 text-center px-6">
                    {playbackError}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 lg:px-0">
              <Comments animeId={anime.id} episodeId={episode.id} />
            </div>
          </div>

          <aside className="hidden xl:block w-[320px] 2xl:w-[360px] flex-shrink-0 max-w-full space-y-8">
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 h-[600px] flex flex-col shadow-xl overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 flex-shrink-0">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-l-4 border-brand-red pl-3">BÖLÜM LİSTESİ</h3>
                <span className="text-[9px] font-black text-gray-500 uppercase">{episodes?.length || 0} BÖLÜM</span>
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar space-y-1.5 min-h-0 w-full">
                {episodes?.map((ep) => {
                  const isCurrent = ep.episode_number === episodeNum;
                  return (
                    <button
                      key={`${ep.season_id}-${ep.episode_number}`}
                      onClick={() => navigateToEpisode(seasonNum!, ep.episode_number)}
                      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all w-full max-w-full text-left h-[56px] flex-shrink-0 ${
                        isCurrent
                          ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                          : 'hover:bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black flex-shrink-0 ${isCurrent ? 'bg-black/20' : 'bg-white/5'}`}>
                        {ep.episode_number}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[9px] font-black uppercase truncate leading-tight">{ep.title || `Bölüm ${ep.episode_number}`}</p>
                        <p className={`text-[7px] font-bold uppercase mt-0.5 ${isCurrent ? 'text-white/70' : 'text-gray-600'}`}>24 DK</p>
                        {progressMap.has(ep.id) && (
                          <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400"
                              style={{
                                width: `${(() => {
                                  const p = progressMap.get(ep.id);
                                  if (!p || !p.duration) return 0;
                                  return Math.min(100, (p.progress / p.duration) * 100);
                                })()}%`
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

            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 flex gap-4 items-center">
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
                className="w-16 h-24 object-cover rounded-xl shadow-lg"
                alt={titleString}
              />
              <div>
                <p className="text-[9px] font-black text-brand-red uppercase tracking-widest mb-1">ŞİMDİ İZLENİYOR</p>
                <h4 className="text-sm font-black text-white uppercase italic leading-tight line-clamp-2">{titleString}</h4>
              </div>
            </div>
          </aside>

          <div className="xl:hidden fixed bottom-4 left-0 right-0 z-[120] px-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowMobileSheet((p) => !p)}
                className="bg-brand-red text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-2xl shadow-lg shadow-brand-red/30"
              >
                Bölüm Listesi
              </button>
            </div>
            {showMobileSheet && (
              <div className="mt-3 bg-brand-surface border border-brand-border rounded-3xl p-3 max-h-[50vh] overflow-y-auto overflow-x-hidden shadow-2xl">
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10 flex-shrink-0 mb-1.5">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">BÖLÜMLER</h3>
                    <button onClick={() => setShowMobileSheet(false)} className="text-gray-400 text-xs">✕</button>
                  </div>
                  <div className="flex flex-col space-y-1.5 w-full">
                    {episodes?.map((ep) => {
                      const isCurrent = ep.episode_number === episodeNum;
                      return (
                        <button
                          key={`${ep.season_id}-${ep.episode_number}`}
                          onClick={() => { navigateToEpisode(seasonNum!, ep.episode_number); setShowMobileSheet(false); }}
                          className={`w-full max-w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left h-[56px] flex-shrink-0 ${
                            isCurrent ? 'bg-brand-red text-white' : 'bg-white/5 text-gray-300'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black flex-shrink-0 ${isCurrent ? 'bg-black/20' : 'bg-black/30'}`}>
                            {ep.episode_number}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-[9px] font-black uppercase truncate leading-tight">{ep.title || `Bölüm ${ep.episode_number}`}</p>
                            <p className="text-[7px] text-gray-400 mt-0.5">24 DK</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchSlug;
