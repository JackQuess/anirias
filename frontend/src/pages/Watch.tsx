import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { useLoad } from '../services/useLoad';
import { db } from '../services/db';
import { useAuth } from '../services/auth';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Comments from '../components/Comments';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';

const PlayIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const VolumeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const VolumeMuteIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const SettingsIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
  </svg>
);

const ChevronDownIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MaximizeIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const MinimizeIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const ChevronRightIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6" />
  </svg>
);

const SkipPrevIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5v14m2-7l11 7V5L7 12z" />
  </svg>
);

const SkipNextIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 5v14m-2-7L6 5v14l11-7z" />
  </svg>
);

const Watch: React.FC = () => {
  const { animeId, episodeId } = useParams<{ animeId: string; episodeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  
  // UX State
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
  
  // Netflix-style player features
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Data Loading
  const { data: anime } = useLoad(() => db.getAnimeById(animeId!), [animeId]);
  const { data: seasons } = useLoad(() => db.getSeasons(animeId!), [animeId]);
  const { data: progressList } = useLoad(() => user ? db.getWatchProgressForAnime(user.id, animeId!) : Promise.resolve([]), [user, animeId]);

  const queryEpisode = searchParams.get('episode');
  const querySeason = searchParams.get('season');
  const currentEpNum = parseInt(episodeId || queryEpisode || '1');
  const querySeasonNumber = querySeason ? parseInt(querySeason) : null;

  const [selectedSeasonId, setSelectedSeasonId] = useState('');

  useEffect(() => {
    if (!seasons || seasons.length === 0) return;
    if (!querySeasonNumber) {
      // Strict: require season param, no fallback
      return;
    }
    const target = seasons.find((s) => s.season_number === querySeasonNumber);
    if (target && target.id !== selectedSeasonId) {
      setSelectedSeasonId(target.id);
    }
  }, [seasons, querySeasonNumber, selectedSeasonId]);

  const { data: episodes, reload: reloadEpisodes } = useLoad(
    () => selectedSeasonId ? db.getEpisodes(animeId!, selectedSeasonId) : Promise.resolve([]),
    [animeId, selectedSeasonId]
  );

  const seasonNumber = useMemo(() => {
    if (!querySeasonNumber) return null; // Strict: require season param
    const currentSeason = seasons?.find((s) => s.id === selectedSeasonId);
    return currentSeason?.season_number || querySeasonNumber;
  }, [seasons, selectedSeasonId, querySeasonNumber]);

  const currentEpisode = (episodes || []).find(e => e.episode_number === currentEpNum);
  const prevEpisode = (episodes || []).find(e => e.episode_number === currentEpNum - 1);
  const nextEpisode = (episodes || []).find(e => e.episode_number === currentEpNum + 1);
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
    const chosen =
      currentEpisode?.video_url ||
      currentEpisode?.hls_url ||
      null;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('Playback URL', { chosen, episode: currentEpisode });
    }
    return chosen;
  }, [currentEpisode]);

  useEffect(() => {
    setHasStarted(false);
    setIsPlaying(false);
    setShowControls(false);
    setIsBuffering(false);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsUserSeeking(false); // Reset seeking flag on episode change
    setIntroSkipped(false); // Reset intro skipped flag on episode change
    setAutoPlayCountdown(null); // Reset auto-play countdown
    setShowAutoPlayOverlay(false); // Reset auto-play overlay
    setShowContinueWatching(false); // Reset continue watching modal
    setSavedProgress(null); // Reset saved progress
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
  }, [currentEpisode?.id]);

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
    // Do NOT show controls if user is seeking (Netflix-style UX)
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

  const handleSeekStart = () => {
    setIsDragging(true);
    setIsUserSeeking(true);
  };
  
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };
  
  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const time = parseFloat((e.target as HTMLInputElement).value);
    if (videoRef.current) videoRef.current.currentTime = time;
    setIsDragging(false);
    // Do NOT show controls after seeking - Netflix-style UX
    // Reset seeking flag after a short delay to allow time updates to settle
    setTimeout(() => {
      setIsUserSeeking(false);
    }, 100);
  };

  const skipTime = useCallback((amount: number) => {
    if (!videoRef.current) return;
    // Set seeking flag to prevent controls from showing
    setIsUserSeeking(true);
    videoRef.current.currentTime += amount;
    // Reset seeking flag after a short delay
    setTimeout(() => {
      setIsUserSeeking(false);
    }, 100);
  }, []);

  const goToEpisode = useCallback((episode?: { episode_number: number; season_number?: number } | null) => {
    if (!episode || !seasonNumber) return;
    // Clear auto-play countdown when navigating
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoPlayCountdown(null);
    setShowAutoPlayOverlay(false);
    navigate(`/watch/${animeId}?season=${seasonNumber}&episode=${episode.episode_number}`);
  }, [navigate, animeId, seasonNumber]);
  
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
      goToEpisode({ episode_number: nextEpisode.episode_number, season_number: seasonNumber });
    }
  }, [nextEpisode, seasonNumber, goToEpisode]);

  // Strict: Do NOT auto-redirect to first episode if currentEpisode not found
  // User must explicitly select an episode from the active season

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
      showControlsTemporary();
    }
  };

  const handleQualityChange = (q: string) => {
    setQuality(q);
    setShowQualityMenu(false);
    // Quality switching would require HLS.js level switching
    // For now, just update the UI state
    showControlsTemporary();
  };

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
    // Update time silently - do NOT trigger controls during seeking
    if (videoRef.current && !isDragging) {
      const newTime = videoRef.current.currentTime;
      setCurrentTime(newTime);
      
      // Check for auto-play next episode (Netflix-style) - at 95%
      if (duration > 0 && nextEpisode && !autoPlayCountdown && !showAutoPlayOverlay) {
        const progressPercent = (newTime / duration) * 100;
        if (progressPercent >= 95) {
          setShowAutoPlayOverlay(true);
          setAutoPlayCountdown(10);
        }
      }
    }
  };

  // Check if we're in the last 90 seconds for Next Episode button
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
    // Initialize playback speed
    video.playbackRate = playbackSpeed;
    return () => {
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleDurationChange);
    };
  }, [syncDuration, playbackSpeed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable shortcuts when typing in inputs, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable="true"]')
      ) {
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
          // Keyboard seeking - skipTime already sets isUserSeeking to prevent controls from showing
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
          // Exit fullscreen
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

  // Save watch progress every 10 seconds
  useEffect(() => {
    if (user && videoRef.current && currentEpisode) {
      progressSaveIntervalRef.current = setInterval(() => {
        if (!videoRef.current?.paused && videoRef.current.duration > 0) {
          const currentProgress = Math.floor(videoRef.current.currentTime);
          const totalDuration = Math.floor(videoRef.current.duration);
          const progressPercent = (currentProgress / totalDuration) * 100;
          
          // Auto-reset progress if >= 90%
          if (progressPercent >= 90) {
            // Delete progress by setting it to 0
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: animeId!,
              episode_id: currentEpisode.id,
              progress_seconds: 0,
              duration_seconds: totalDuration
            });
          } else {
            // Save progress normally
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: animeId!,
              episode_id: currentEpisode.id,
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
  }, [user, currentEpisode, animeId]);

  // Check for saved progress on episode load
  useEffect(() => {
    if (user && currentEpisode && videoRef.current && duration > 0) {
      db.getWatchProgress(user.id, animeId!, currentEpisode.id).then(prog => {
        if (prog && prog.duration_seconds > 0) {
          const progressPercent = (prog.progress_seconds / prog.duration_seconds) * 100;
          
          // If progress >= 90%, reset it automatically
          if (progressPercent >= 90) {
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: animeId!,
              episode_id: currentEpisode.id,
              progress_seconds: 0,
              duration_seconds: prog.duration_seconds
            });
            setSavedProgress(null);
            setShowContinueWatching(false);
          } 
          // If progress exists and < 90%, show continue watching prompt
          else if (prog.progress_seconds > 0 && progressPercent < 90) {
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
  }, [user, currentEpisode, animeId, duration]);

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  if (!anime) return <div className="pt-40 text-center"><LoadingSkeleton type="banner" /></div>;
  if (!querySeasonNumber) {
    return <div className="pt-40 text-center text-white font-black uppercase">Sezon parametresi gerekli. URL: /watch/{animeId}?season=1&episode=1</div>;
  }
  if (!selectedSeasonId || !episodes) {
    return <div className="pt-40 text-center text-white font-black uppercase">Sezon {querySeasonNumber} yükleniyor...</div>;
  }
  if (episodes.length === 0) {
    return <div className="pt-40 text-center text-white font-black uppercase">Sezon {querySeasonNumber} için henüz bölüm bulunmuyor.</div>;
  }
  if (!currentEpisode) {
    return <div className="pt-40 text-center text-white font-black uppercase">Sezon {querySeasonNumber} - Bölüm {currentEpNum} bulunamadı. Lütfen geçerli bir bölüm numarası seçin.</div>;
  }
  if (!playbackUrl) {
    return (
      <div className="pt-40 text-center text-white font-black uppercase space-y-4">
        <div>Video henüz eklenmemiş.</div>
        <div className="text-gray-400 text-sm mt-2">Bölüm {currentEpNum} - Sezon {seasonNumber}</div>
      </div>
    );
  }

  const titleString = getDisplayTitle(anime.title);
  const episodeTitle = currentEpisode.title || `Bölüm ${currentEpisode.episode_number}`;
  const fallbackPoster = '/banners/hsdxd_rias_banner.webp';
  const rawPoster = anime.banner_image || anime.cover_image || null;
  const poster = proxyImage(rawPoster || fallbackPoster);
  // Show controls when: not started, paused, buffering, error, or user interaction
  const shouldShowControls = !hasStarted || !isPlaying || showControls || isBuffering || !!playbackError;
  
  // Skip Intro logic - Netflix-style
  const introStart = currentEpisode.intro_start ?? null;
  const introEnd = currentEpisode.intro_end ?? null;
  const hasIntro = introStart !== null && introEnd !== null && introStart < introEnd;
  const isInIntro = hasIntro && !introSkipped && currentTime >= introStart && currentTime < introEnd;
  
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
    if (!videoRef.current || !savedProgress || !user || !currentEpisode) return;
    // Reset progress to 0
    db.saveWatchProgress({
      user_id: user.id,
      anime_id: animeId!,
      episode_id: currentEpisode.id,
      progress_seconds: 0,
      duration_seconds: savedProgress.duration_seconds
    });
    videoRef.current.currentTime = 0;
    setShowContinueWatching(false);
    setSavedProgress(null);
  }, [savedProgress, user, currentEpisode, animeId]);

  return (
    <div className="min-h-screen bg-brand-black">
      <div className="z-[130] mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 pt-20 lg:pt-32 pb-40">
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-10 min-w-0">
          
          <div className="flex-1 space-y-4 lg:space-y-6 w-full min-w-0 overflow-hidden">
            <div 
              ref={playerContainerRef}
              className="w-full aspect-video bg-black lg:rounded-[1.5rem] overflow-hidden lg:border border-white/5 shadow-2xl select-none sticky top-0 lg:static z-50 ring-1 ring-white/5 max-h-[80vh]"
              onMouseMove={showControlsTemporary}
              onTouchStart={showControlsTemporary}
              onDoubleClick={toggleFullscreen}
            >
              <div className="relative w-full h-full">
                <video 
                  ref={videoRef}
                  className="w-full h-full object-contain"
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

                {/* Skip Intro Button - Netflix-style */}
                <div 
                  className={`absolute bottom-6 right-6 z-50 pointer-events-auto transition-opacity duration-300 ${
                    isInIntro ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
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

                {/* Continue Watching Modal - Netflix-style */}
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

                {/* Auto Next Episode Overlay - Netflix-style */}
                {showAutoPlayOverlay && nextEpisode && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
                    <div className="bg-black/80 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full mx-4 transition-opacity duration-300 opacity-100">
                      <div className="text-center space-y-6">
                        <div>
                          <h3 className="text-white font-black text-xl uppercase tracking-tight mb-2">
                            Sonraki Bölüm
                          </h3>
                          <p className="text-gray-300 text-sm font-bold">
                            Bölüm {nextEpisode.episode_number}
                            {nextEpisode.title && `: ${nextEpisode.title}`}
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

                {/* Top-Center Episode Badge - Netflix-style */}
                {shouldShowControls && (
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto transition-opacity duration-300">
                    <Link
                      to={`/anime/${animeId}`}
                      className="bg-black/60 backdrop-blur-xl border border-white/20 rounded-lg px-4 py-2 shadow-2xl"
                    >
                      <div className="text-white text-xs md:text-sm font-bold uppercase tracking-wide text-center">
                        {titleString}
                      </div>
                      <div className="text-white/80 text-[10px] md:text-xs mt-0.5 font-semibold tracking-wide text-center">
                        Bölüm {currentEpisode.episode_number}
                      </div>
                    </Link>
                  </div>
                )}

                {/* Minimal Bottom Controls Bar - Netflix-style */}
                {shouldShowControls && (
                  <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none transition-opacity duration-300">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent h-32" />
                    
                    {/* Controls container */}
                    <div className="relative px-4 md:px-6 pb-4 md:pb-6 pointer-events-auto">
                      {/* Timeline - Thin with hover glow */}
                      <div 
                        className="relative h-1 bg-white/20 rounded-full mb-3 group cursor-pointer transition-all duration-200 hover:h-1.5"
                        onMouseEnter={() => setShowControls(true)}
                      >
                        {/* Buffered progress */}
                        <div 
                          className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all duration-200" 
                          style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} 
                        />
                        {/* Current progress */}
                        <div 
                          className="absolute top-0 left-0 h-full bg-brand-red rounded-full transition-all duration-200 group-hover:shadow-[0_0_8px_rgba(229,9,20,0.8)]" 
                          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} 
                        />
                        {/* Seek input */}
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          step="0.1"
                          value={currentTime}
                          onMouseDown={handleSeekStart}
                          onChange={handleSeekChange}
                          onMouseUp={handleSeekEnd}
                          onTouchStart={handleSeekStart}
                          onTouchEnd={handleSeekEnd}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-pan-x"
                        />
                      </div>

                      {/* Control buttons row */}
                      <div className="flex items-center justify-between gap-2 md:gap-4">
                        {/* Left side: Play/Pause, Time, Volume */}
                        <div className="flex items-center gap-2 md:gap-3">
                          <button
                            onClick={(e) => togglePlay(e as any)}
                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white hover:scale-110 transition-transform"
                          >
                            {isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                          </button>
                          
                          <div className="text-white text-xs md:text-sm font-medium tabular-nums">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </div>

                          {/* Volume control */}
                          <div 
                            className="relative flex items-center"
                            onMouseEnter={() => setShowVolumeSlider(true)}
                            onMouseLeave={() => setShowVolumeSlider(false)}
                          >
                            <button
                              onClick={toggleMute}
                              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white hover:scale-110 transition-transform"
                            >
                              {isMuted ? <VolumeMuteIcon size={20} /> : <VolumeIcon size={20} />}
                            </button>
                            {showVolumeSlider && (
                              <div className="absolute left-0 bottom-full mb-2 bg-black/90 backdrop-blur-xl rounded-lg p-3 border border-white/20 shadow-2xl">
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={volume}
                                  onChange={handleVolumeChange}
                                  className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer volume-slider"
                                  style={{
                                    background: `linear-gradient(to right, #e50914 0%, #e50914 ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right side: Speed, Quality, Fullscreen */}
                        <div className="flex items-center gap-2 md:gap-3">
                          {/* Playback Speed */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowSpeedMenu(!showSpeedMenu);
                                setShowQualityMenu(false);
                              }}
                              className="px-2 md:px-3 py-1.5 text-white text-xs md:text-sm font-medium hover:bg-white/10 rounded transition-colors"
                            >
                              {playbackSpeed}x
                            </button>
                            {showSpeedMenu && (
                              <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-xl rounded-lg border border-white/20 shadow-2xl min-w-[100px] overflow-hidden">
                                {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                  <button
                                    key={speed}
                                    onClick={() => handlePlaybackSpeedChange(speed)}
                                    className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors ${
                                      playbackSpeed === speed ? 'bg-brand-red/30' : ''
                                    }`}
                                  >
                                    {speed}x
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quality Selector */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowQualityMenu(!showQualityMenu);
                                setShowSpeedMenu(false);
                              }}
                              className="px-2 md:px-3 py-1.5 text-white text-xs md:text-sm font-medium hover:bg-white/10 rounded transition-colors flex items-center gap-1"
                            >
                              {quality === 'auto' ? 'Otomatik' : quality}
                              <ChevronDownIcon size={12} />
                            </button>
                            {showQualityMenu && (
                              <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-xl rounded-lg border border-white/20 shadow-2xl min-w-[120px] overflow-hidden">
                                {['auto', '1080p', '4K'].map((q) => (
                                  <button
                                    key={q}
                                    onClick={() => handleQualityChange(q)}
                                    className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors ${
                                      quality === q ? 'bg-brand-red/30' : ''
                                    }`}
                                  >
                                    {q === 'auto' ? 'Otomatik' : q}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Fullscreen */}
                          <button
                            onClick={toggleFullscreen}
                            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white hover:scale-110 transition-transform"
                          >
                            {isFullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Episode Button - Bottom-right (last 90 seconds) */}
                {showNextEpisodeButton && nextEpisode && !showAutoPlayOverlay && (
                  <div className="absolute bottom-6 right-6 z-50 pointer-events-auto transition-opacity duration-300">
                    <button
                      onClick={handleNextEpisodeNow}
                      className="bg-black/75 hover:bg-black/90 backdrop-blur-md text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold uppercase tracking-wide text-xs md:text-sm border border-white/20 hover:border-white/40 transition-all duration-300 shadow-2xl flex items-center gap-2 group"
                    >
                      <span>Sonraki Bölüm</span>
                      <ChevronRightIcon size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}

              </div>
            </div>

            <div className="px-4 lg:px-0">
              <Comments animeId={animeId!} episodeId={currentEpisode.id} />
            </div>
          </div>

          <aside className="hidden xl:block w-[320px] 2xl:w-[360px] flex-shrink-0 max-w-full space-y-8">
             <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 h-[600px] flex flex-col shadow-xl overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 flex-shrink-0">
                   <h3 className="text-xs font-black text-white uppercase tracking-widest border-l-4 border-brand-red pl-3">BÖLÜM LİSTESİ</h3>
                   <span className="text-[9px] font-black text-gray-500 uppercase">{episodes?.length} BÖLÜM</span>
                </div>
                
                <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar space-y-1.5 min-h-0 w-full">
                   {episodes?.map((ep) => {
                     const isCurrent = ep.episode_number === currentEpNum;
                     return (
                       <button 
                          key={`${ep.season_id}-${ep.episode_number}`} 
                          onClick={() => goToEpisode({ episode_number: ep.episode_number, season_number: seasonNumber })}
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

          {/* Mobile bottom sheet for episode list */}
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
                      const isCurrent = ep.episode_number === currentEpNum;
                      return (
                        <button
                          key={`${ep.season_id}-${ep.episode_number}`}
                          onClick={() => { goToEpisode({ episode_number: ep.episode_number, season_number: seasonNumber }); setShowMobileSheet(false); }}
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

export default Watch;
