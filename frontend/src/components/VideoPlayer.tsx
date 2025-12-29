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
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Persistent flags (useRef to prevent re-triggering)
  const durationSetRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);
  const resumeCardShownRef = useRef(false);
  const resumeCardTriggeredRef = useRef(false);
  const previousSrcRef = useRef<string>(''); // Track src changes for smooth episode switching
  const isEpisodeSwitchingRef = useRef(false); // Prevent state reset during episode switch

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (!srcChanged && bootState !== 'IDLE') {
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
    if (srcChanged && previousSrcRef.current && bootState !== 'IDLE') {
      isEpisodeSwitchingRef.current = true;
    }

    // Update previous src
    previousSrcRef.current = src;

    // Reset only necessary state for new episode
    if (srcChanged) {
      setBootState('LOADING');
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
        if (bootState === 'LOADING') {
          setBootState('READY');
          onPlayerReady?.();
        }
        loadingTimeoutRef.current = null;
      }, 10000); // 10 second timeout
    }

    const handleLoadedMetadata = () => {
      if (!durationSetRef.current && video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
        durationSetRef.current = true;
      }
      setBootState('READY');
      isEpisodeSwitchingRef.current = false;
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      if (Math.abs(time - lastTimeUpdateRef.current) > 0.1 || lastTimeUpdateRef.current === 0) {
        setCurrentTime(time);
        lastTimeUpdateRef.current = time;
      }
      
      const videoDuration = video.duration || duration || 0;
      onTimeUpdate?.(time, videoDuration);
      
      // Show resume card 90 seconds before end
      if (initialTime > 0 && !resumeCardShownRef.current && videoDuration > 0) {
        const remaining = videoDuration - time;
        if (remaining <= 90 && remaining > 0) {
          resumeCardShownRef.current = true;
          setShowResumeCard(true);
        }
      }
      
      // Show next episode overlay 10 seconds before end
      if (hasNextEpisode && onNextEpisode && videoDuration > 0) {
        const remaining = videoDuration - time;
        if (remaining <= 10 && remaining > 0 && !showNextEpisodeOverlay) {
          setShowNextEpisodeOverlay(true);
          setNextEpisodeCountdown(Math.ceil(remaining));
          
          if (nextEpisodeCountdownRef.current) {
            clearInterval(nextEpisodeCountdownRef.current);
          }
          nextEpisodeCountdownRef.current = setInterval(() => {
            setNextEpisodeCountdown((prev) => {
              if (prev <= 1) {
                if (nextEpisodeCountdownRef.current) {
                  clearInterval(nextEpisodeCountdownRef.current);
                  nextEpisodeCountdownRef.current = null;
                }
                onNextEpisode();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (remaining > 10 && showNextEpisodeOverlay) {
          setShowNextEpisodeOverlay(false);
          if (nextEpisodeCountdownRef.current) {
            clearInterval(nextEpisodeCountdownRef.current);
            nextEpisodeCountdownRef.current = null;
          }
        } else if (showNextEpisodeOverlay && remaining > 0) {
          setNextEpisodeCountdown(Math.ceil(remaining));
        }
      }
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const videoDuration = video.duration || duration;
        if (videoDuration > 0) {
          setBuffered((bufferedEnd / videoDuration) * 100);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setBootState('READY');
      onEnded?.();
    };

    const handleError = () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setBootState('IDLE');
      isEpisodeSwitchingRef.current = false;
      onError?.('Video oynatılamadı.');
    };

    const handleCanPlay = () => {
      if (bootState === 'LOADING') {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setBootState('READY');
        onPlayerReady?.(); // Notify parent that player is ready
      }
    };

    const handleLoadedData = () => {
      // CRITICAL: This event fires when video data is loaded and ready to play
      // This ensures loading overlay closes even if canplay doesn't fire immediately
      if (bootState === 'LOADING') {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setBootState('READY');
        onPlayerReady?.();
      }
    };

    const handlePlay = () => {
      setBootState('PLAYING');
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    // Add event listeners (only once, not on every src change)
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Handle video source change
    const isHls = src.endsWith('.m3u8');
    
    if (!isHls) {
      // Direct MP4 or other formats
      if (video.src !== src || srcChanged) {
        hlsRef.current?.destroy();
        video.src = src;
        // CRITICAL: Always call load() on episode change to ensure events fire
        video.load();
        // Try to play if autoPlay is desired (muted for autoplay policy)
        if (video.muted) {
          video.play().catch(() => {
            // Ignore autoplay errors
          });
        }
      }
    } else {
      // HLS handling
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        if (video.src !== src || srcChanged) {
          video.src = src;
          // CRITICAL: Always call load() on episode change
          video.load();
          // Try to play if autoPlay is desired (muted for autoplay policy)
          if (video.muted) {
            video.play().catch(() => {
              // Ignore autoplay errors
            });
          }
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
                onError?.('Video yüklenemedi (HLS fatal error)');
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
            if (data.fatal) {
              onError?.('Video yüklenemedi (HLS fatal error)');
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
        onError?.('Tarayıcı HLS desteklemiyor');
        setBootState('IDLE');
      }
    }

    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('progress', handleProgress);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('error', handleError);
      }
      
      // Cleanup loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Only cleanup HLS on unmount, not on src change
      // HLS instance is reused for episode switching
    };
  }, [src, hasNextEpisode, onNextEpisode, duration, onTimeUpdate, onEnded, onError, initialTime, bootState, onPlayerReady]);

  // Cleanup HLS only on component unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
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

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Mobile landscape auto-fullscreen
  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationChange = () => {
      if (window.orientation === 90 || window.orientation === -90) {
        // Landscape mode
        if (containerRef.current && !document.fullscreenElement) {
          containerRef.current.requestFullscreen().catch(() => {
            // Fullscreen failed (user may have blocked it)
          });
        }
      }
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [isMobile]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || bootState !== 'READY') return;

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
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, [bootState, showControlsTemporary]);

  const skipTime = useCallback((seconds: number, silent = false) => {
    const video = videoRef.current;
    if (!video || bootState !== 'READY') return;

    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    if (!silent) {
      showControlsTemporary();
    }
  }, [bootState, showControlsTemporary]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar || bootState !== 'READY') return;

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

    video.volume = percent;
    setVolume(percent);
    setIsMuted(percent === 0);
    showControlsTemporary();
  }, [showControlsTemporary]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted || volume === 0) {
      video.muted = false;
      if (volume === 0) {
        video.volume = 0.5;
        setVolume(0.5);
      }
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
    showControlsTemporary();
  }, [volume, showControlsTemporary]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        // Fullscreen failed
      });
    } else {
      document.exitFullscreen();
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
    if (bootState === 'READY') {
      togglePlay();
    }
  }, [bootState, togglePlay]);

  // Mobile tap to show/hide controls
  const handleVideoTouch = useCallback(() => {
    if (isMobile) {
      setShowControls((prev) => !prev);
      if (showControls) {
        showControlsTemporary();
      }
    }
  }, [isMobile, showControls, showControlsTemporary]);

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
      if (!video || bootState !== 'READY') return;

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
          if (video.volume < 1) {
            video.volume = Math.min(1, video.volume + 0.1);
            setVolume(video.volume);
            setIsMuted(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (video.volume > 0) {
            video.volume = Math.max(0, video.volume - 0.1);
            setVolume(video.volume);
            if (video.volume === 0) setIsMuted(true);
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
      onTouchStart={handleVideoTouch}
    >
      {/* Loading Overlay - Only shown until canplay/loadeddata event fires */}
      {bootState === 'LOADING' && isValidSrc && (
        <div className="absolute inset-0 w-full h-full bg-black/90 flex items-center justify-center z-10 transition-opacity duration-200 pointer-events-none">
          <div className="text-white/50 text-sm font-semibold">Video yükleniyor...</div>
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
          preload="auto"
          playsInline
          webkit-playsinline="true"
          disablePictureInPicture
          onClick={handleVideoClick}
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
