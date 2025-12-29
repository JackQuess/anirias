import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Hls from 'hls.js';
import { Play, Pause, Rewind, FastForward, Volume2, VolumeX, Maximize, Minimize2, SkipForward } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  animeSlug?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  initialTime?: number;
  onSeek?: (time: number) => void;
  introStart?: number;
  introEnd?: number;
  onSkipIntro?: () => void;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
  onPlayerReady?: () => void; // NEW: Called when video is ready to play
}

type PlayerBootState = 'IDLE' | 'LOADING' | 'READY' | 'PLAYING';

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  title,
  animeSlug,
  onTimeUpdate,
  onEnded,
  onError,
  initialTime = 0,
  onSeek,
  introStart,
  introEnd,
  onSkipIntro,
  hasNextEpisode = false,
  onNextEpisode,
  onPlayerReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Boot state management
  const [bootState, setBootState] = useState<PlayerBootState>('IDLE');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showNextEpisodeOverlay, setShowNextEpisodeOverlay] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(10);
  const nextEpisodeCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showResumeCard, setShowResumeCard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootStateRef = useRef<PlayerBootState>('IDLE');
  
  // Persistent flags (useRef to prevent re-triggering)
  const durationSetRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);
  const resumeCardShownRef = useRef(false);
  const resumeCardTriggeredRef = useRef(false);
  const previousSrcRef = useRef<string>(''); // Track src changes for smooth episode switching
  const isEpisodeSwitchingRef = useRef(false); // Prevent state reset during episode switch
  const listenersAddedRef = useRef(false); // Track if event listeners are already added
  const lastTapRef = useRef<number>(0); // Track last tap time for double tap detection

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    bootStateRef.current = bootState;
  }, [bootState]);

  // Store callbacks in refs to avoid re-creating handlers
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const hasNextEpisodeRef = useRef(hasNextEpisode);
  const initialTimeRef = useRef(initialTime);
  const durationRef = useRef(duration);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
    onNextEpisodeRef.current = onNextEpisode;
    onPlayerReadyRef.current = onPlayerReady;
    hasNextEpisodeRef.current = hasNextEpisode;
    initialTimeRef.current = initialTime;
    durationRef.current = duration;
  }, [onTimeUpdate, onEnded, onError, onNextEpisode, onPlayerReady, hasNextEpisode, initialTime, duration]);

  // Auto-hide controls after 2 seconds
  const showControlsTemporary = useCallback(() => {
    setHasInteracted(true);
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2000);
  }, [isPlaying]);

  // Memoized event handlers using refs to avoid re-creating
  // CRITICAL: loadedmetadata is NOT enough to consider video ready
  // Only canplay or canplaythrough events mark video as ready
  const handleLoadedMetadata = useCallback(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    
    if (import.meta.env.DEV) {
      console.log('[VideoPlayer] Metadata loaded:', {
        duration: currentVideo.duration,
        readyState: currentVideo.readyState,
      });
    }
    // Set duration but DO NOT set to READY - wait for canplay/canplaythrough
    if (!durationSetRef.current && currentVideo.duration && isFinite(currentVideo.duration)) {
      setDuration(currentVideo.duration);
      durationSetRef.current = true;
      durationRef.current = currentVideo.duration;
    }
    // DO NOT set bootState to READY here - only canplay/canplaythrough should do that
    isEpisodeSwitchingRef.current = false;
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    
    const time = currentVideo.currentTime;
    if (Math.abs(time - lastTimeUpdateRef.current) > 0.1 || lastTimeUpdateRef.current === 0) {
      setCurrentTime(time);
      lastTimeUpdateRef.current = time;
    }
    
    const videoDuration = currentVideo.duration || durationRef.current || 0;
    onTimeUpdateRef.current?.(time, videoDuration);
    
    // Show resume card 90 seconds before end (only once)
    if (initialTimeRef.current > 0 && !resumeCardShownRef.current && videoDuration > 0) {
      const remaining = videoDuration - time;
      if (remaining <= 90 && remaining > 0) {
        resumeCardShownRef.current = true;
        setShowResumeCard(true);
      }
    }
    
    // Show next episode overlay 10 seconds before end
    if (hasNextEpisodeRef.current && onNextEpisodeRef.current && videoDuration > 0) {
      const remaining = videoDuration - time;
      if (remaining <= 10 && remaining > 0) {
        setShowNextEpisodeOverlay((prev) => {
          if (!prev) {
            setNextEpisodeCountdown(Math.ceil(remaining));
            if (nextEpisodeCountdownRef.current) {
              clearInterval(nextEpisodeCountdownRef.current);
            }
            nextEpisodeCountdownRef.current = setInterval(() => {
              setNextEpisodeCountdown((prevCount) => {
                if (prevCount <= 1) {
                  if (nextEpisodeCountdownRef.current) {
                    clearInterval(nextEpisodeCountdownRef.current);
                    nextEpisodeCountdownRef.current = null;
                  }
                  onNextEpisodeRef.current?.();
                  return 0;
                }
                return prevCount - 1;
              });
            }, 1000);
            return true;
          }
          return prev;
        });
        setNextEpisodeCountdown(Math.ceil(remaining));
      } else if (remaining > 10) {
        setShowNextEpisodeOverlay((prev) => {
          if (prev) {
            if (nextEpisodeCountdownRef.current) {
              clearInterval(nextEpisodeCountdownRef.current);
              nextEpisodeCountdownRef.current = null;
            }
            return false;
          }
          return prev;
        });
      } else {
        setNextEpisodeCountdown(Math.ceil(remaining));
      }
    }
  }, []);

  const handleProgress = useCallback(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    
    if (currentVideo.buffered.length > 0) {
      const bufferedEnd = currentVideo.buffered.end(currentVideo.buffered.length - 1);
      const videoDuration = currentVideo.duration || durationRef.current;
      if (videoDuration > 0) {
        setBuffered((bufferedEnd / videoDuration) * 100);
      }
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setBootState('READY');
    onEndedRef.current?.();
  }, []);

  // CRITICAL: Error handling with detailed MediaError information
  // Never log "Object" - always log specific error codes and messages
  const handleError = useCallback(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    
    const error = currentVideo.error;
    let errorMsg = 'Video yüklenemedi.';
    let errorCodeName = 'UNKNOWN';
    
    if (error) {
      // CRITICAL: Use MediaError constants for clear error identification
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED: // 1
          errorMsg = 'Video yükleme iptal edildi.';
          errorCodeName = 'MEDIA_ERR_ABORTED';
          break;
        case MediaError.MEDIA_ERR_NETWORK: // 2
          errorMsg = 'Ağ hatası. Lütfen internet bağlantınızı kontrol edin.';
          errorCodeName = 'MEDIA_ERR_NETWORK';
          break;
        case MediaError.MEDIA_ERR_DECODE: // 3
          errorMsg = 'Video formatı desteklenmiyor.';
          errorCodeName = 'MEDIA_ERR_DECODE';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: // 4
          // This usually means: video file not found (404), CORS issue, or unsupported format
          errorMsg = 'Video dosyası bulunamadı veya erişilemiyor. Lütfen daha sonra tekrar deneyin.';
          errorCodeName = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
          break;
        default:
          errorMsg = 'Video oynatılamadı.';
          errorCodeName = `UNKNOWN_${error.code}`;
      }
    }
    
    // CRITICAL: Always log detailed error information, never "Object"
    const fullVideoSrc = currentVideo.src || currentVideo.currentSrc || 'No src';
    console.error('[VideoPlayer] Video error:', {
      code: error?.code,
      codeName: errorCodeName,
      message: error?.message || 'No error message',
      readyState: currentVideo.readyState,
      videoSrc: fullVideoSrc,
      videoSrcLength: fullVideoSrc.length,
      // Additional debugging info
      networkState: currentVideo.networkState,
      canPlayType: currentVideo.canPlayType('video/mp4') ? 'supported' : 'not supported',
    });
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setBootState('IDLE');
    setErrorMessage(errorMsg);
    isEpisodeSwitchingRef.current = false;
    onErrorRef.current?.(errorMsg);
  }, []);

  // CRITICAL: Video is ready when canplay or canplaythrough fires
  // This is the ONLY way to mark video as ready (not loadedmetadata)
  const handleCanPlay = useCallback(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    
    // CRITICAL: Always set to READY when canplay fires
    // This ensures loading overlay disappears
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setBootState('READY');
    onPlayerReadyRef.current?.();
    if (import.meta.env.DEV) {
      console.log('[VideoPlayer] Video ready to play (canplay)');
    }
  }, []);

  // CRITICAL: canplaythrough also marks video as ready
  // This event fires when enough data is loaded to play through without stopping
  const handleCanPlayThrough = useCallback(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setBootState('READY');
    onPlayerReadyRef.current?.();
    if (import.meta.env.DEV) {
      console.log('[VideoPlayer] Video ready to play through (canplaythrough)');
    }
  }, []);

  // CRITICAL: waiting event fires when video is buffering
  // Show loading overlay again when buffering occurs
  const handleWaiting = useCallback(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    
    // Only show loading if video was playing or ready
    if (bootStateRef.current === 'PLAYING' || bootStateRef.current === 'READY') {
      setBootState('LOADING');
      if (import.meta.env.DEV) {
        console.log('[VideoPlayer] Video buffering (waiting)');
      }
    }
  }, []);

  // loadeddata fires when first frame is loaded, but video may not be ready to play
  // DO NOT set to READY here - only canplay/canplaythrough should do that
  const handleLoadedData = useCallback(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    
    // Do not set to READY - wait for canplay or canplaythrough
    // This ensures video is truly ready to play before hiding loading overlay
    if (import.meta.env.DEV) {
      console.log('[VideoPlayer] Data loaded, waiting for canplay event');
    }
  }, []);

  const handlePlay = useCallback(() => {
    setBootState('PLAYING');
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      // CRITICAL: Hard stop - ensure video is paused and audio stops
      if (!video.paused) {
        video.pause();
      }
      // Safety guard: Force pause if video thinks it's playing
      if (video.readyState >= 2) {
        video.pause();
      }
    }
    setIsPlaying(false);
  }, []);

  // Add event listeners once when video element is mounted
  useEffect(() => {
    const video = videoRef.current;
    if (!video || listenersAddedRef.current) return;

    if (import.meta.env.DEV) {
      console.log('[VideoPlayer] Adding event listeners');
    }
    // CRITICAL: Event listeners for video state management
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough); // CRITICAL: Also marks video as ready
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('waiting', handleWaiting); // CRITICAL: Show loading when buffering
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    listenersAddedRef.current = true;

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      listenersAddedRef.current = false;
    };
  }, [handleLoadedMetadata, handleCanPlay, handleCanPlayThrough, handleLoadedData, handleWaiting, handlePlay, handlePause, handleTimeUpdate, handleProgress, handleEnded, handleError]);

  // CRITICAL: Episode switching - update video src without remounting
  useEffect(() => {
    const isValidSrc = src && src.trim() !== '';
    const srcChanged = previousSrcRef.current !== src;

    // If src is invalid, set to IDLE
    if (!isValidSrc) {
      if (previousSrcRef.current) {
        // Only reset if we had a valid src before
        setBootState('IDLE');
      }
      previousSrcRef.current = '';
      return;
    }

    // If src hasn't changed and we're not in IDLE state, don't do anything
    if (!srcChanged && bootStateRef.current !== 'IDLE') {
      return;
    }

    // Get video element (will be null if not mounted yet)
    const video = videoRef.current;
    
    // If video element is not mounted yet, wait a bit and retry
    if (!video) {
      const timeoutId = setTimeout(() => {
        // Retry after video element is mounted
        const retryVideo = videoRef.current;
        if (retryVideo && isValidSrc) {
          // Video element is now mounted, trigger setup
          const retrySrcChanged = previousSrcRef.current !== src;
          if (retrySrcChanged) {
            previousSrcRef.current = src;
            setBootState('LOADING');
          }
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    // Episode switch detected - preserve UI state
    if (srcChanged && previousSrcRef.current && bootStateRef.current !== 'IDLE') {
      isEpisodeSwitchingRef.current = true;
    }

    // Update previous src
    previousSrcRef.current = src;

    // Reset only necessary state for new episode
    if (srcChanged) {
      if (import.meta.env.DEV) {
        console.log('[VideoPlayer] Source changed, loading new video');
      }
      
      // CRITICAL: Cleanup old video before loading new one
      // This ensures audio from previous episode stops completely
      if (video) {
        video.pause();
        video.currentTime = 0;
        // Don't remove src here - we'll set new src below
        // But ensure audio stops
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      }
      
      setBootState('LOADING');
      setErrorMessage(null); // Clear any previous error
      durationSetRef.current = false;
      lastTimeUpdateRef.current = 0;
      resumeCardShownRef.current = false;
      resumeCardTriggeredRef.current = false;
      setShowNextEpisodeOverlay(false);
      setIntroSkipped(false);
      if (nextEpisodeCountdownRef.current) {
        clearInterval(nextEpisodeCountdownRef.current);
        nextEpisodeCountdownRef.current = null;
      }
      // CRITICAL: Set timeout to close loading overlay if video doesn't load within 10 seconds
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        setBootState((prev) => {
          if (prev === 'LOADING' && previousSrcRef.current === src) {
            if (import.meta.env.DEV) {
              console.warn('[VideoPlayer] Loading timeout - video may not be ready');
            }
            onPlayerReadyRef.current?.();
            return 'READY';
          }
          return prev;
        });
        loadingTimeoutRef.current = null;
      }, 10000); // 10 second timeout
    }

    // Handle video source change
    const isHls = /\.m3u8($|[?#])/i.test(src);
    
    if (!isHls) {
      // Direct MP4 or other formats
      if (video.src !== src || srcChanged) {
        hlsRef.current?.destroy();
        video.src = src;
        // CRITICAL: Always call load() on episode change to ensure events fire
        video.load();
        // CRITICAL: Do NOT autoplay - wait for user interaction
        // Autoplay policy requires user gesture, we respect that
      }
    } else {
      // HLS handling
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        if (video.src !== src || srcChanged) {
          video.src = src;
          // CRITICAL: Always call load() on episode change
          video.load();
          // CRITICAL: Do NOT autoplay - wait for user interaction
          // Autoplay policy requires user gesture, we respect that
        }
      } else if (Hls.isSupported()) {
        // HLS.js for other browsers
        if (hlsRef.current) {
          // If HLS instance exists and src changed, update source
          if (hlsRef.current.media === video) {
            // Same instance, same media - update source
            // CRITICAL: Re-attach event listeners for MANIFEST_PARSED
            hlsRef.current.off(Hls.Events.MANIFEST_PARSED);
            hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
              handleLoadedMetadata();
              handleLoadedData();
            });
            hlsRef.current.loadSource(src);
          } else {
            hlsRef.current.destroy();
            const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
            hlsRef.current = hls;
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) {
                onErrorRef.current?.('Video yüklenemedi (HLS fatal error)');
                hls.destroy();
                setBootState('IDLE');
                isEpisodeSwitchingRef.current = false;
              }
            });
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              handleLoadedMetadata();
              // CRITICAL: Also trigger loadedData handler for HLS
              handleLoadedData();
            });
            hls.loadSource(src);
            hls.attachMedia(video);
          }
        } else {
          // Create new HLS instance
          const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
          hlsRef.current = hls;
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (import.meta.env.DEV) {
              console.error('[VideoPlayer] HLS ERROR:', {
                fatal: data.fatal,
                type: data.type,
                details: data.details,
              });
            }
            if (data.fatal) {
              onErrorRef.current?.('Video yüklenemedi (HLS fatal error)');
              hls.destroy();
              setBootState('IDLE');
              isEpisodeSwitchingRef.current = false;
            }
          });
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            handleLoadedMetadata();
            // CRITICAL: Also trigger loadedData handler for HLS
            handleLoadedData();
          });
          hls.loadSource(src);
          hls.attachMedia(video);
        }
      } else {
        console.error('[VideoPlayer] Browser does not support HLS');
        onErrorRef.current?.('Tarayıcı HLS desteklemiyor');
        setBootState('IDLE');
      }
    }

    return () => {
      // Only cleanup loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Only cleanup HLS on unmount, not on src change
      // HLS instance is reused for episode switching
    };
  }, [src]); // Only depend on src - callbacks are stored in refs

  // CRITICAL: Cleanup on component unmount - MUST stop audio completely
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      
      // CRITICAL: Hard stop video and audio
      if (video) {
        // Pause video immediately
        video.pause();
        
        // Stop all audio streams
        video.currentTime = 0;
        video.volume = 0;
        video.muted = true;
        
        // Remove source to stop all network activity
        video.removeAttribute('src');
        video.load();
        
        // Clear all event listeners by removing src
        // This ensures no audio continues playing
      }
      
      // Cleanup HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // Cleanup intervals and timeouts
      if (nextEpisodeCountdownRef.current) {
        clearInterval(nextEpisodeCountdownRef.current);
        nextEpisodeCountdownRef.current = null;
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // CRITICAL: Fullscreen change handling for all browsers (iOS Safari, Android, Desktop)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenActive = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFullscreenActive);
    };

    // Listen to all fullscreen change events (cross-browser support)
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // CRITICAL: Mobile orientation change handling
  // Do NOT auto-fullscreen on orientation change
  // User must manually trigger fullscreen via double tap or button
  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationChange = () => {
      // Just update fullscreen state if it changed, don't auto-trigger
      const isFullscreenActive = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFullscreenActive);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [isMobile]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || (bootState !== 'READY' && bootState !== 'PLAYING')) return;

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            showControlsTemporary();
          })
          .catch((error) => {
            if (error.name !== 'AbortError' && import.meta.env.DEV) {
              console.warn('[VideoPlayer] Play error:', error);
            }
          });
      }
    } else {
      // CRITICAL: Hard stop - ensure video and audio stop completely
      video.pause();
      // Safety guard: Force pause if video thinks it's playing
      if (video.readyState >= 2 && !video.paused) {
        video.pause();
      }
      setIsPlaying(false);
      setShowControls(true);
    }
  }, [bootState, showControlsTemporary]);

  const skipTime = useCallback((seconds: number, silent = false) => {
    const video = videoRef.current;
    if (!video || (bootState !== 'READY' && bootState !== 'PLAYING')) return;

    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    if (!silent) {
      showControlsTemporary();
    }
  }, [bootState, showControlsTemporary]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar || (bootState !== 'READY' && bootState !== 'PLAYING')) return;

    const videoDuration = video.duration || duration || 0;
    if (videoDuration === 0) return;

    const rect = bar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    if (!clientX) return;
    
    const percent = (clientX - rect.left) / rect.width;
    const newTime = percent * videoDuration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
    lastTimeUpdateRef.current = newTime;
    onSeek?.(newTime);
    showControlsTemporary();
  }, [bootState, duration, onSeek, showControlsTemporary]);

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const slider = volumeSliderRef.current;
    if (!video || !slider) return;

    const rect = slider.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    if (!clientX) return;
    
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    setVolume(percent);
    video.volume = percent;
    if (percent === 0) {
      setIsMuted(true);
      video.muted = true;
    } else {
      setIsMuted(false);
      video.muted = false;
    }
    showControlsTemporary();
  }, [showControlsTemporary]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted || volume === 0) {
      // Unmute
      setIsMuted(false);
      video.muted = false;
      if (volume === 0) {
        const newVolume = 0.5;
        setVolume(newVolume);
        video.volume = newVolume;
      }
    } else {
      // Mute
      setIsMuted(true);
      video.muted = true;
    }
    showControlsTemporary();
  }, [volume, isMuted, showControlsTemporary]);

  // CRITICAL: Fullscreen implementation for iOS Safari, Android, and Desktop
  // iOS Safari requires video.webkitEnterFullscreen() instead of container.requestFullscreen()
  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video && !container) return;

    // Check if already in fullscreen
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      // Enter fullscreen - try iOS Safari first, then standard API
      if (video && (video as any).webkitEnterFullscreen) {
        // iOS Safari native fullscreen
        (video as any).webkitEnterFullscreen();
        setIsFullscreen(true);
      } else if (video && video.requestFullscreen) {
        // Standard video fullscreen
        video.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {
          // Fallback to container fullscreen
          if (container && container.requestFullscreen) {
            container.requestFullscreen().then(() => {
              setIsFullscreen(true);
            }).catch(() => {
              // Fullscreen failed
            });
          }
        });
      } else if (container && container.requestFullscreen) {
        // Container fullscreen fallback
        container.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {
          // Fullscreen failed
        });
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    }
    showControlsTemporary();
  }, [showControlsTemporary]);

  const handleMouseMove = useCallback(() => {
    if (!isMobile) {
      showControlsTemporary();
    }
  }, [isMobile, showControlsTemporary]);

  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (bootState === 'READY' || bootState === 'PLAYING') {
      togglePlay();
    }
  }, [bootState, togglePlay]);

  // CRITICAL: Mobile touch handling with double tap detection for fullscreen
  // Double tap (within 300ms) → toggle fullscreen
  // Single tap → toggle play/pause or show/hide controls
  const handleVideoTouch = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    // Double tap detection (within 300ms)
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      e.preventDefault();
      e.stopPropagation();
      // Double tap → toggle fullscreen
      toggleFullscreen();
      lastTapRef.current = 0; // Reset to prevent triple tap
    } else {
      // Single tap → toggle play/pause or show/hide controls
      lastTapRef.current = now;
      
      // If video is ready, toggle play/pause
      if (bootState === 'READY' || bootState === 'PLAYING') {
        togglePlay();
      } else {
        // Otherwise, just show/hide controls
        setShowControls((prev) => !prev);
        if (showControls) {
          showControlsTemporary();
        }
      }
    }
  }, [isMobile, bootState, showControls, showControlsTemporary, togglePlay, toggleFullscreen]);

  const handleResume = useCallback(() => {
    const video = videoRef.current;
    if (!video || initialTime <= 0 || bootState !== 'READY' || resumeCardTriggeredRef.current) return;
    
    resumeCardTriggeredRef.current = true;
    setShowResumeCard(false);
    
    const seekAndPlay = () => {
      if (!video) return;
      
      if (video.readyState < 2) {
        const checkReady = () => {
          if (video && video.readyState >= 2) {
            video.currentTime = initialTime;
            setCurrentTime(initialTime);
            lastTimeUpdateRef.current = initialTime;
            onSeek?.(initialTime);
            
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                  showControlsTemporary();
                })
                .catch((error) => {
                  if (error.name !== 'AbortError' && import.meta.env.DEV) {
                    console.warn('[VideoPlayer] Resume play error:', error);
                  }
                });
            }
          } else if (video) {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      } else {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        lastTimeUpdateRef.current = initialTime;
        onSeek?.(initialTime);
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              showControlsTemporary();
            })
            .catch((error) => {
              if (error.name !== 'AbortError' && import.meta.env.DEV) {
                console.warn('[VideoPlayer] Resume play error:', error);
              }
            });
        }
      }
    };
    
    seekAndPlay();
  }, [bootState, initialTime, onSeek, showControlsTemporary]);

  const handleResumeCancel = useCallback(() => {
    resumeCardTriggeredRef.current = true;
    setShowResumeCard(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const video = videoRef.current;
      if (!video || (bootState !== 'READY' && bootState !== 'PLAYING')) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10, true);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10, true);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newVolumeUp = Math.min(1, volume + 0.1);
          setVolume(newVolumeUp);
          setIsMuted(false);
          if (video.muted) {
            video.muted = false;
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          const newVolumeDown = Math.max(0, volume - 0.1);
          setVolume(newVolumeDown);
          if (newVolumeDown === 0) {
            setIsMuted(true);
            if (!video.muted) {
              video.muted = true;
            }
          } else {
            setIsMuted(false);
            if (video.muted) {
              video.muted = false;
            }
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bootState, togglePlay, skipTime, toggleFullscreen, toggleMute]);

  // Sync video element volume and muted state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || (bootState !== 'READY' && bootState !== 'PLAYING')) return;

    // Sync volume from state to video element
    if (Math.abs(video.volume - volume) > 0.01) {
      video.volume = volume;
    }
    
    // Sync muted from state to video element
    if (video.muted !== isMuted) {
      video.muted = isMuted;
    }
  }, [volume, isMuted, bootState]);

  // CRITICAL: Safety guard - ensure video is paused when isPlaying is false
  // This prevents audio from continuing when video should be paused
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // If state says not playing but video is not paused, force pause
    if (!isPlaying && !video.paused) {
      video.pause();
    }
    
    // Additional safety: if video is paused but state says playing, sync state
    if (video.paused && isPlaying) {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Memoize computed values
  const isValidSrc = useMemo(() => src && src.trim() !== '', [src]);
  const isMetadataLoaded = useMemo(() => bootState === 'READY' || bootState === 'PLAYING', [bootState]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden shadow-2xl ${
        isMobile 
          ? 'rounded-none' 
          : 'max-w-[1200px] mx-auto rounded-[16px] aspect-video'
      }`}
      style={{
        aspectRatio: '16 / 9',
        minHeight: isMobile ? 'auto' : '0',
        zIndex: 10, // Ensure player is below episode list (z-20)
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying && !isMobile) {
          setShowControls(false);
        }
      }}
    >
      {/* Loading Overlay - Only shown when src exists but video is not ready yet */}
      {/* CRITICAL: This overlay will disappear on onCanPlay or onLoadedData events */}
      {bootState === 'LOADING' && isValidSrc && !errorMessage && (
        <div className="absolute inset-0 w-full h-full bg-black/90 flex items-center justify-center z-10 transition-opacity duration-200 pointer-events-none">
          <div className="text-white/50 text-sm font-semibold">Video yükleniyor...</div>
        </div>
      )}

      {/* Error Overlay */}
      {errorMessage && (
        <div className="absolute inset-0 w-full h-full bg-black/95 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="text-white text-center px-4">
            <div className="text-red-500 text-lg font-semibold mb-2">Hata</div>
            <div className="text-white/70 text-sm">{errorMessage}</div>
            <button
              onClick={() => {
                setErrorMessage(null);
                setBootState('LOADING');
                const video = videoRef.current;
                if (video) {
                  video.load();
                }
              }}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors pointer-events-auto"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      )}

      {/* Static Placeholder Layer */}
      {(!isValidSrc || bootState !== 'READY' && bootState !== 'PLAYING') && (
        <div
          className="absolute inset-0 w-full h-full bg-black transition-opacity duration-300"
          style={{
            opacity: isMetadataLoaded ? 0 : 1,
            visibility: isMetadataLoaded ? 'hidden' : 'visible',
            zIndex: 1,
            aspectRatio: '16 / 9',
          }}
        >
          {poster && (
            <img
              src={poster}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
      )}

      {/* Video Element - ALWAYS mounted, only visibility changes */}
      {isValidSrc && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
          style={{
            opacity: isMetadataLoaded ? 1 : 0,
            visibility: isMetadataLoaded ? 'visible' : 'hidden',
            zIndex: 2,
          }}
          preload="metadata"
          playsInline
          webkit-playsinline="true"
          disablePictureInPicture
          onClick={handleVideoClick}
          onTouchStart={handleVideoTouch}
        />
      )}

      {/* Resume Watching Card */}
      {showResumeCard && initialTime > 0 && bootState === 'READY' && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center ${
            isMobile ? 'bg-black/95' : 'bg-black/80'
          } backdrop-blur-sm transition-opacity duration-300`}
        >
          <div
            className={`bg-black/90 backdrop-blur-md rounded-lg border border-white/20 shadow-2xl ${
              isMobile 
                ? 'w-full mx-4 p-6' 
                : 'min-w-[320px] p-6'
            }`}
          >
            <div className="text-white mb-4">
              <p className="text-lg font-semibold mb-2">İzlemeye Devam Et</p>
              <p className="text-sm text-white/70">
                {formatTime(initialTime)} konumundan devam et
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleResume}
                className="flex-1 bg-[#e5193e] hover:bg-[#c41735] text-white px-4 py-3 rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Play size={16} strokeWidth={2.5} />
                <span>Devam Et</span>
              </button>
              <button
                onClick={handleResumeCancel}
                className="px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors text-sm font-semibold"
              >
                Baştan Başla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Overlay - Title */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 transition-opacity duration-300 pointer-events-none ${
          showControls || !hasInteracted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={`absolute ${isMobile ? 'top-3 left-3' : 'top-5 left-5 md:top-6 md:left-6'}`}>
          {animeSlug ? (
            <Link
              to={`/anime/${animeSlug}`}
              className="group cursor-pointer pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className={`text-white font-semibold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] group-hover:text-[#e5193e] transition-colors ${
                isMobile ? 'text-sm' : 'text-base md:text-lg'
              }`}>
                {title}
              </h2>
            </Link>
          ) : (
            <h2 className={`text-white font-semibold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] ${
              isMobile ? 'text-sm' : 'text-base md:text-lg'
            }`}>
              {title}
            </h2>
          )}
        </div>
      </div>

      {/* Intro Skip Button */}
      {introStart !== undefined && introEnd !== undefined && introStart < introEnd && !introSkipped && currentTime >= introStart && currentTime < introEnd && bootState === 'READY' && (
        <div className={`absolute ${isMobile ? 'bottom-20 right-3' : 'bottom-24 right-6'} z-40 pointer-events-auto`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current && introEnd !== undefined) {
                videoRef.current.currentTime = introEnd;
                setIntroSkipped(true);
                onSkipIntro?.();
              }
            }}
            className="bg-black/80 hover:bg-black/90 backdrop-blur-md text-white px-4 py-2 rounded-lg font-semibold text-sm border border-white/20 hover:border-[#e5193e] transition-all shadow-lg flex items-center gap-2 group"
          >
            <span>Girişi Atla</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
              <polygon points="5 3 19 12 5 21 5 3" />
              <line x1="19" y1="12" x2="5" y2="12" />
            </svg>
          </button>
        </div>
      )}

      {/* Next Episode Overlay (10 seconds before end) */}
      {showNextEpisodeOverlay && hasNextEpisode && onNextEpisode && bootState === 'READY' && (
        <div
          className={`absolute z-40 pointer-events-auto ${
            isMobile
              ? 'bottom-0 left-0 right-0 animate-slide-up'
              : 'bottom-6 right-6'
          }`}
        >
          <div
            className={`bg-black/90 backdrop-blur-md rounded-lg border border-white/20 shadow-2xl ${
              isMobile
                ? 'w-full rounded-t-2xl rounded-b-none p-4'
                : 'min-w-[320px] p-6'
            }`}
          >
            <div className="text-white mb-3">
              <p className={`font-semibold mb-1 ${isMobile ? 'text-sm' : 'text-base'}`}>Sonraki Bölüm</p>
              <p className={`text-white/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {nextEpisodeCountdown > 0 
                  ? `${nextEpisodeCountdown} saniye sonra otomatik oynatılacak` 
                  : 'Oynatılıyor...'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNextEpisodeOverlay(false);
                  if (nextEpisodeCountdownRef.current) {
                    clearInterval(nextEpisodeCountdownRef.current);
                    nextEpisodeCountdownRef.current = null;
                  }
                  onNextEpisode();
                }}
                className={`flex-1 bg-[#e5193e] hover:bg-[#c41735] text-white px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                  isMobile ? 'py-3' : ''
                }`}
              >
                <Play size={16} strokeWidth={2.5} />
                <span>Şimdi Geç</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNextEpisodeOverlay(false);
                  if (nextEpisodeCountdownRef.current) {
                    clearInterval(nextEpisodeCountdownRef.current);
                    nextEpisodeCountdownRef.current = null;
                  }
                }}
                className={`text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors font-semibold text-sm ${
                  isMobile ? 'px-4 py-3' : 'w-10 h-10 flex items-center justify-center'
                }`}
                aria-label="İptal"
              >
                {isMobile ? 'İptal' : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls - Always mounted, visibility controlled by opacity */}
      {(bootState === 'READY' || bootState === 'PLAYING') && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className={`${isMobile ? 'px-3 pb-3' : 'px-4 md:px-6 pb-4 md:pb-6'} space-y-3`}>
            {/* Seek Bar */}
            <div
              ref={seekBarRef}
              className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group"
              onClick={handleSeek}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseMove={(e) => {
                if (isDragging) {
                  handleSeek(e);
                }
              }}
              onTouchStart={(e) => {
                if (isMobile) {
                  setIsDragging(true);
                  handleSeek(e);
                }
              }}
              onTouchMove={(e) => {
                if (isMobile && isDragging) {
                  handleSeek(e);
                }
              }}
              onTouchEnd={() => {
                if (isMobile) {
                  setIsDragging(false);
                }
              }}
            >
              {/* Buffered */}
              <div
                className="absolute top-0 left-0 h-full bg-white/25 rounded-full"
                style={{ width: `${buffered}%` }}
              />
              {/* Progress */}
              <div
                className="absolute top-0 left-0 h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              {/* Hover indicator */}
              {!isMobile && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 shadow-lg"
                  style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              )}
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Left: Play/Pause, Skip, Time */}
              <div className="flex items-center gap-3 md:gap-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className={`flex items-center justify-center text-white hover:text-white/90 transition-colors ${
                    isMobile ? 'w-10 h-10' : 'w-10 h-10'
                  }`}
                  aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
                >
                  {isPlaying ? (
                    <Pause size={22} strokeWidth={2.5} />
                  ) : (
                    <Play size={22} strokeWidth={2.5} className="ml-0.5" />
                  )}
                </button>

                {/* Skip -10s */}
                <button
                  onClick={() => skipTime(-10)}
                  className={`flex flex-col items-center justify-center text-white/70 hover:text-white transition-colors ${
                    isMobile ? 'w-8 h-8' : 'w-9 h-9'
                  }`}
                  aria-label="10 saniye geri"
                >
                  <Rewind size={18} strokeWidth={2.5} />
                  {!isMobile && <span className="text-[9px] font-semibold mt-0.5 leading-none">10</span>}
                </button>

                {/* Skip +10s */}
                <button
                  onClick={() => skipTime(10)}
                  className={`flex flex-col items-center justify-center text-white/70 hover:text-white transition-colors ${
                    isMobile ? 'w-8 h-8' : 'w-9 h-9'
                  }`}
                  aria-label="10 saniye ileri"
                >
                  <FastForward size={18} strokeWidth={2.5} />
                  {!isMobile && <span className="text-[9px] font-semibold mt-0.5 leading-none">10</span>}
                </button>

                {/* Time Display */}
                <div className={`text-white/90 font-medium tabular-nums ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right: Volume, Next Episode, Fullscreen */}
              <div className="flex items-center gap-3">
                {/* Volume - Slider slides left on hover (desktop) or tap (mobile) */}
                <div className="flex items-center gap-2 group relative">
                  <button
                    onClick={toggleMute}
                    className={`flex items-center justify-center text-white/70 hover:text-[#e5193e] transition-colors z-10 ${
                      isMobile ? 'w-9 h-9' : 'w-9 h-9'
                    }`}
                    aria-label={isMuted ? 'Sesi aç' : 'Sessize al'}
                    onTouchStart={(e) => {
                      if (isMobile) {
                        e.stopPropagation();
                        const slider = volumeSliderRef.current;
                        if (slider) {
                          const isVisible = slider.classList.contains('opacity-100');
                          if (isVisible) {
                            slider.classList.remove('opacity-100', 'w-20');
                            slider.classList.add('opacity-0', 'w-0');
                          } else {
                            slider.classList.remove('opacity-0', 'w-0');
                            slider.classList.add('opacity-100', 'w-20');
                          }
                        }
                      }
                    }}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={20} strokeWidth={2.5} />
                    ) : (
                      <Volume2 size={20} strokeWidth={2.5} />
                    )}
                  </button>
                  <div
                    ref={volumeSliderRef}
                    className={`h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden absolute left-full ml-2 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out ${
                      isMobile 
                        ? 'w-0 opacity-0'
                        : 'w-0 opacity-0 group-hover:w-20 group-hover:opacity-100'
                    }`}
                    onClick={handleVolumeChange}
                    onMouseDown={() => setIsVolumeDragging(true)}
                    onMouseUp={() => setIsVolumeDragging(false)}
                    onMouseMove={(e) => {
                      if (isVolumeDragging) {
                        handleVolumeChange(e);
                      }
                    }}
                    onTouchStart={(e) => {
                      if (isMobile) {
                        e.stopPropagation();
                        setIsVolumeDragging(true);
                        handleVolumeChange(e);
                      }
                    }}
                    onTouchMove={(e) => {
                      if (isMobile && isVolumeDragging) {
                        handleVolumeChange(e);
                      }
                    }}
                    onTouchEnd={() => {
                      if (isMobile) {
                        setIsVolumeDragging(false);
                      }
                    }}
                  >
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Next Episode */}
                {hasNextEpisode && onNextEpisode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNextEpisodeOverlay(false);
                      if (nextEpisodeCountdownRef.current) {
                        clearInterval(nextEpisodeCountdownRef.current);
                        nextEpisodeCountdownRef.current = null;
                      }
                      onNextEpisode();
                    }}
                    className={`flex items-center justify-center text-white/70 hover:text-[#e5193e] transition-colors ${
                      isMobile ? 'w-9 h-9' : 'w-9 h-9'
                    }`}
                    aria-label="Sonraki Bölüm"
                  >
                    <SkipForward size={20} strokeWidth={2.5} />
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className={`flex items-center justify-center text-white/70 hover:text-[#e5193e] transition-colors ${
                    isMobile ? 'w-9 h-9' : 'w-9 h-9'
                  }`}
                  aria-label="Tam ekran"
                >
                  {isFullscreen ? (
                    <Minimize2 size={20} strokeWidth={2.5} />
                  ) : (
                    <Maximize size={20} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
