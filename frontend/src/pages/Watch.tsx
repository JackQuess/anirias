import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { ThumbsUp, Share2, Flag, Play } from 'lucide-react';
import { useLoad } from '../services/useLoad';
import { db } from '../services/db';
import { useAuth } from '../services/auth';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Comments from '../components/Comments';
import PlayerOverlay from '../components/PlayerOverlay';
import AnimeCard from '@/components/AnimeCard';
import ReportWatchModal from '@/components/ReportWatchModal';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { cn } from '@/lib/utils';
import { WatchProgress } from '../types';
import { computeAnimeMatchPercent, formatMatchLabel } from '@/lib/matchScore';

const Watch: React.FC = () => {
  const { animeId, episodeId } = useParams<{ animeId: string; episodeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // BACKWARD COMPATIBILITY: Redirect old UUID-based URLs to slug format
  useEffect(() => {
    const seasonParam = searchParams.get('season');
    const episodeParam = searchParams.get('episode');
    
    // If this looks like a UUID-based URL, fetch anime and redirect
    if (animeId && (seasonParam || episodeParam)) {
      db.getAnimeByIdOrSlug(animeId).then((anime) => {
        if (anime?.slug) {
          const season = seasonParam ? parseInt(seasonParam, 10) : 1;
          const episode = episodeParam ? parseInt(episodeParam, 10) : 1;
          navigate(`/watch/${anime.slug}/${season}/${episode}`, { replace: true });
        }
      }).catch(() => {
        // If fetch fails, stay on current page (will show error)
      });
    } else if (animeId && !episodeId) {
      // Just /watch/{uuid} - redirect to anime detail page
      db.getAnimeByIdOrSlug(animeId).then((anime) => {
        if (anime?.slug) {
          navigate(`/anime/${anime.slug}`, { replace: true });
        } else {
          navigate(`/anime/${animeId}`, { replace: true });
        }
      }).catch(() => {
        navigate('/browse', { replace: true });
      });
    }
  }, [animeId, episodeId, searchParams, navigate]);
  
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
  const [activeTab, setActiveTab] = useState<'episodes' | 'comments'>('episodes');
  const [shareLabel, setShareLabel] = useState('Paylaş');
  const [reportModalOpen, setReportModalOpen] = useState(false);
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
  const { data: anime } = useLoad(() => db.getAnimeByIdOrSlug(animeId!), [animeId]);
  const { data: seasons } = useLoad(() => db.getSeasons(animeId!), [animeId]);
  const { data: progressList } = useLoad(
    () => (user && anime?.id ? db.getWatchProgressForAnime(user.id, anime.id) : Promise.resolve([])),
    [user, anime?.id]
  );

  const { data: recSource } = useLoad(() => db.getAllAnimes('view_count', 16), []);
  const recommendations = useMemo(() => {
    if (!recSource?.length) return [];
    const sid = anime?.id;
    const list = sid ? recSource.filter((a) => a.id !== sid) : [...recSource];
    return list.slice(0, 4);
  }, [recSource, anime?.id]);

  const { data: watchlistForMatch } = useLoad(
    () => (user?.id ? db.getWatchlist(user.id) : Promise.resolve([])),
    [user?.id]
  );

  const scorePct = useMemo(() => {
    if (!anime) return 0;
    return computeAnimeMatchPercent({
      watchlist: watchlistForMatch ?? null,
      targetAnime: anime,
      userId: user?.id ?? null,
    });
  }, [anime, watchlistForMatch, user?.id]);

  const synopsisPlain = useMemo(
    () => (anime?.description || '').replace(/<[^>]*>/g, ''),
    [anime?.description]
  );

  const handleShareZip = useCallback(async () => {
    try {
      if (navigator.share && anime) {
        await navigator.share({
          title: getDisplayTitle(anime.title),
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
      setShareLabel('Kopyalandı!');
      setTimeout(() => setShareLabel('Paylaş'), 2000);
    } catch {
      setShareLabel('Paylaş');
    }
  }, [anime]);

  const queryEpisode = searchParams.get('episode');
  const querySeason = searchParams.get('season');
  const currentEpNum = parseInt(episodeId || queryEpisode || '1');
  const querySeasonNumber = querySeason ? parseInt(querySeason) : null;

  // Fetch ALL episodes - no season_id filter
  const { data: allEpisodes, reload: reloadEpisodes } = useLoad(
    () => db.getEpisodes(animeId!),
    [animeId]
  );

  // Filter episodes by season_number from URL
  const episodes = useMemo(() => {
    if (!allEpisodes || !querySeasonNumber) return [];
    return allEpisodes.filter(ep => ep.season_number === querySeasonNumber);
  }, [allEpisodes, querySeasonNumber]);

  const seasonNumber = querySeasonNumber;

  const currentEpisode = (episodes || []).find(e => e.episode_number === currentEpNum);
  const prevEpisode = (episodes || []).find(e => e.episode_number === currentEpNum - 1);
  const nextEpisode = (episodes || []).find(e => e.episode_number === currentEpNum + 1);

  const { data: episodeLikeSummary, reload: reloadEpisodeLikes } = useLoad(
    () => {
      if (!currentEpisode?.id) return Promise.resolve({ count: 0, liked: false });
      return db.getEpisodeLikeSummary(currentEpisode.id, user?.id ?? null);
    },
    [currentEpisode?.id, user?.id]
  );

  const toggleEpisodeLikeWatch = useCallback(async () => {
    if (!user || !currentEpisode?.id) {
      alert('Beğenmek için giriş yapın.');
      return;
    }
    try {
      await db.toggleEpisodeLike(user.id, currentEpisode.id);
      reloadEpisodeLikes();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Watch] episode like:', err);
      alert('Beğeni kaydedilemedi.');
    }
  }, [user, currentEpisode?.id, reloadEpisodeLikes]);
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
      // Pause video - audio will stop automatically with pause()
      videoRef.current.pause();
      
      // Set volume to 0 temporarily to ensure audio stops completely
      // This prevents audio from continuing in background without changing UI state
      const currentVolume = videoRef.current.volume;
      videoRef.current.volume = 0;
      
      // Restore volume after a short delay (audio buffer clears)
      setTimeout(() => {
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.volume = currentVolume;
        }
      }, 50);
      
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
    if (!episode || !seasonNumber || !anime) return;
    // Clear auto-play countdown when navigating
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoPlayCountdown(null);
    setShowAutoPlayOverlay(false);
    // Use slug-based URL
    const slug = anime.slug || anime.id;
    navigate(`/watch/${slug}/${episode.season_number || seasonNumber}/${episode.episode_number}`);
  }, [navigate, anime, seasonNumber]);
  
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

  const handlePrevEpisodeNow = useCallback(() => {
    if (prevEpisode) {
      goToEpisode({ episode_number: prevEpisode.episode_number, season_number: seasonNumber });
    }
  }, [prevEpisode, seasonNumber, goToEpisode]);

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
              anime_id: anime?.id || animeId!,
              episode_id: currentEpisode.id,
              progress_seconds: 0,
              duration_seconds: totalDuration
            });
          } else {
            // Save progress normally
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: anime?.id || animeId!,
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
      db.getWatchProgress(user.id, anime?.id || animeId!, currentEpisode.id).then(prog => {
        if (prog && prog.duration_seconds > 0) {
          const progressPercent = (prog.progress_seconds / prog.duration_seconds) * 100;
          
          // If progress >= 90%, reset it automatically
          if (progressPercent >= 90) {
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: anime?.id || animeId!,
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
  }, [user, currentEpisode, anime?.id, animeId, duration]);

  // Extract intro values safely (use optional chaining since currentEpisode may be null)
  const introStart = currentEpisode?.intro_start ?? null;
  const introEnd = currentEpisode?.intro_end ?? null;

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
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
      anime_id: anime?.id || animeId!,
      episode_id: currentEpisode.id,
      progress_seconds: 0,
      duration_seconds: savedProgress.duration_seconds
    });
    videoRef.current.currentTime = 0;
    setShowContinueWatching(false);
    setSavedProgress(null);
  }, [savedProgress, user, currentEpisode, anime?.id, animeId]);

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  // Redirect to slug-based URL if season param missing (MUST be before early returns)
  useEffect(() => {
    if (anime && !querySeasonNumber) {
      const slug = anime.slug || anime.id;
      navigate(`/watch/${slug}/1/1`, { replace: true });
    }
  }, [anime, querySeasonNumber, navigate]);

  // EARLY RETURNS - All hooks must be called before this point
  if (!anime) return <div className="pt-40 text-center"><LoadingSkeleton type="banner" /></div>;
  if (!querySeasonNumber) {
    return <div className="pt-40 text-center text-white font-black uppercase">Yönlendiriliyor...</div>;
  }
  if (!episodes) {
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

  // Computed values after early returns (safe - no hooks)
  const titleString = getDisplayTitle(anime.title);
  const episodeTitle = currentEpisode.title || `Bölüm ${currentEpisode.episode_number}`;
  const fallbackPoster = '/banners/hsdxd_rias_banner.webp';
  const rawPoster = anime.banner_image || anime.cover_image || null;
  const poster = proxyImage(rawPoster || fallbackPoster);
  const watchSlug = anime.slug || anime.id;
  const epThumb = (i: number) =>
    poster ||
    `https://loremflickr.com/320/180/anime,scene?lock=${encodeURIComponent(anime.id + String(i))}`;
  // Show controls when: not started, paused, buffering, error, or user interaction
  const shouldShowControls = !hasStarted || !isPlaying || showControls || isBuffering || !!playbackError;
  
  // Skip Intro logic - Netflix-style (using values computed before early returns)
  const hasIntro = introStart !== null && introEnd !== null && introStart < introEnd;
  const isInIntro = hasIntro && !introSkipped && currentTime >= introStart && currentTime < introEnd;

  return (
    <div className="w-full min-h-screen bg-[#08080c] text-white flex flex-col font-inter pt-16 md:pt-20">
      <div className="flex flex-col lg:flex-row w-full max-w-[1800px] mx-auto px-4 md:px-8 gap-6 pb-28">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div
            ref={playerContainerRef}
            className="relative w-full aspect-video bg-black rounded-lg border border-white/5 overflow-hidden group/player shadow-2xl select-none"
            onDoubleClick={toggleFullscreen}
          >
              <div className="relative w-full h-full">
                {(anime?.slug || anime?.id) && (
                  <div className="absolute top-3 left-3 md:top-5 md:left-5 z-[55] pointer-events-none">
                    <Link
                      to={`/anime/${anime.slug || anime.id}`}
                      className="pointer-events-auto group block text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h2 className="text-white font-bold text-sm md:text-base tracking-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)] group-hover:text-primary transition-colors leading-snug max-w-[80vw] md:max-w-md">
                        {titleString}
                      </h2>
                      <p className="text-white/75 text-xs font-medium mt-0.5 tabular-nums">
                        Sezon {querySeasonNumber} · Bölüm {currentEpNum}
                      </p>
                    </Link>
                  </div>
                )}
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

                {/* Premium Player Overlay */}
                <PlayerOverlay
                  title={titleString}
                  episodeLabel={`${currentEpisode.episode_number}. Bölüm`}
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
                            className="px-8 py-3 bg-primary hover:opacity-90 text-white font-black uppercase tracking-widest text-xs rounded-lg shadow-lg shadow-primary/25 transition-all"
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
                            className="px-8 py-3 bg-primary hover:opacity-90 text-white font-black uppercase tracking-widest text-xs rounded-lg shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
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

          <div className="flex flex-col gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">{titleString}</h1>
            <p className="text-sm text-white/70 font-medium -mt-2">{episodeTitle}</p>

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-white/70">
                <span className="text-green-400 font-bold">{formatMatchLabel(scorePct)}</span>
                <span>{anime.year || '—'}</span>
                {anime.is_adult ? (
                  <span className="px-1.5 py-0.5 border border-white/20 rounded text-xs">18+</span>
                ) : null}
                <span className="px-1.5 py-0.5 border border-white/20 rounded text-xs">HD</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => void toggleEpisodeLikeWatch()}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded transition-colors',
                    episodeLikeSummary?.liked ? 'bg-primary/20 text-primary' : 'hover:bg-white/10'
                  )}
                >
                  <ThumbsUp className={cn('w-5 h-5', episodeLikeSummary?.liked ? 'fill-current' : '')} />
                  <span className="text-sm font-medium">
                    {episodeLikeSummary?.liked ? 'Beğenildi' : 'Beğen'}
                    {(episodeLikeSummary?.count ?? 0) > 0 ? ` · ${episodeLikeSummary?.count}` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleShareZip}
                  className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">{shareLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded transition-colors"
                >
                  <Flag className="w-5 h-5" />
                  <span className="text-sm font-medium">Bildir</span>
                </button>
              </div>
            </div>

            {synopsisPlain ? (
              <p className="text-white/80 text-sm md:text-base leading-relaxed">{synopsisPlain}</p>
            ) : null}
          </div>

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
              <Comments animeId={animeId!} episodeId={currentEpisode.id} variant="watch" />
            </div>
          </div>

          {recommendations.length > 0 ? (
            <div className="mt-6 mb-8 lg:mt-12">
              <h3 className="text-xl font-bold mb-4">Önerilen içerikler</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recommendations.map((item) => (
                  <AnimeCard key={item.id} anime={item} layout="poster" />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {episodes && episodes.length > 0 ? (
          <div
            className={cn(
              'w-full lg:w-96 shrink-0 flex flex-col gap-4',
              activeTab === 'episodes' ? 'flex' : 'hidden lg:flex'
            )}
          >
            <div className="flex items-center justify-between bg-[#12121a] p-4 rounded-lg border border-white/5">
              <h3 className="font-bold text-lg">Bölümler</h3>
              <span className="text-sm text-white/60">{episodes.length} bölüm</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {episodes.map((ep, i) => {
                const epNum = ep.episode_number;
                const epTitle = ep.title || `${epNum}. Bölüm`;
                const sn = ep.season_number ?? querySeasonNumber ?? seasonNumber ?? 1;
                const isCurrent = currentEpNum === epNum;
                const prog = progressMap.get(ep.id);
                const durLabel = ep.duration_seconds
                  ? `${Math.floor(ep.duration_seconds / 60)}:00`
                  : '24:00';

                return (
                  <Link
                    key={ep.id || `${ep.season_id}-${epNum}`}
                    to={`/watch/${watchSlug}/${sn}/${epNum}`}
                    onClick={(e) => {
                      if (!ep.video_url && !ep.hls_url) e.preventDefault();
                    }}
                    className={cn(
                      'flex gap-3 p-2 rounded-lg transition-all',
                      isCurrent
                        ? 'bg-[#1a1a24] border border-white/10'
                        : 'hover:bg-[#1a1a24] border border-transparent',
                      !ep.video_url && !ep.hls_url && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="relative w-32 aspect-video rounded overflow-hidden shrink-0 bg-black">
                      <img
                        src={epThumb(i)}
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
                      <p className="text-xs text-white/50 mt-1">Türkçe altyazılı</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <ReportWatchModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        context={
          anime && currentEpisode && querySeasonNumber != null
            ? {
                userId: user?.id ?? null,
                animeId: anime.id,
                animeTitle: titleString,
                animeSlug: anime.slug ?? null,
                seasonNumber: querySeasonNumber,
                episodeNumber: currentEpNum,
                episodeId: currentEpisode.id,
              }
            : null
        }
      />
    </div>
  );
};

export default Watch;
