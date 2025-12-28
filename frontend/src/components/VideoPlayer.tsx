import React, { useRef, useState, useEffect, useCallback } from 'react';
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
}

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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // State management
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
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(90);
  const nextEpisodeCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  const [showResumeCard, setShowResumeCard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const durationSetRef = useRef(false);
  const lastTimeUpdateRef = useRef(0); // Prevent time flickering

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show resume card if initialTime > 0
  useEffect(() => {
    if (initialTime > 0 && isMetadataLoaded) {
      setShowResumeCard(true);
    }
  }, [initialTime, isMetadataLoaded]);

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

  // Initialize video and HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      setIsMetadataLoaded(false);
      return;
    }

    // Reset metadata state when src changes
    setIsMetadataLoaded(false);
    durationSetRef.current = false;
    lastTimeUpdateRef.current = 0;

    const handleLoadedMetadata = () => {
      // Set duration ONLY ONCE from loadedmetadata event
      if (!durationSetRef.current && video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
        durationSetRef.current = true;
      }
      setIsMetadataLoaded(true);
      // Don't set initialTime here - let resume card handle it
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      // Prevent flickering: only update if change is significant (>0.1s) or first update
      if (Math.abs(time - lastTimeUpdateRef.current) > 0.1 || lastTimeUpdateRef.current === 0) {
        setCurrentTime(time);
        lastTimeUpdateRef.current = time;
      }
      
      const videoDuration = video.duration || duration || 0;
      onTimeUpdate?.(time, videoDuration);
      
      // Show next episode overlay 90 seconds before end
      if (hasNextEpisode && onNextEpisode && videoDuration > 0) {
        const remaining = videoDuration - time;
        if (remaining <= 90 && remaining > 0 && !showNextEpisodeOverlay) {
          setShowNextEpisodeOverlay(true);
          setNextEpisodeCountdown(Math.ceil(remaining));
          
          // Start countdown
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
        } else if (remaining > 90 && showNextEpisodeOverlay) {
          // Hide overlay if user seeks back
          setShowNextEpisodeOverlay(false);
          if (nextEpisodeCountdownRef.current) {
            clearInterval(nextEpisodeCountdownRef.current);
            nextEpisodeCountdownRef.current = null;
          }
        } else if (showNextEpisodeOverlay && remaining > 0) {
          // Update countdown
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
      onEnded?.();
    };

    const handleError = () => {
      onError?.('Video oynatılamadı.');
    };

    const handleCanPlay = () => {
      // Video is ready to play - ensure no pending play() errors
      // This helps prevent AbortError when video becomes ready
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // HLS handling
    const isHls = src.endsWith('.m3u8');
    if (!isHls) {
      hlsRef.current?.destroy();
      video.src = src;
      video.load();
      return () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      };
    }

    // Native HLS support (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.load();
      return () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      };
    }

    // HLS.js for other browsers
    if (Hls.isSupported()) {
      hlsRef.current?.destroy();
      const hls = new Hls({ capLevelToPlayerSize: true, autoStartLoad: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          onError?.('Video yüklenemedi (HLS fatal error)');
          hls.destroy();
        }
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        handleLoadedMetadata();
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      onError?.('Tarayıcı HLS desteklemiyor');
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      
      // Cancel any pending play() requests to prevent AbortError
      if (!video.paused) {
        video.pause();
      }
      
      hlsRef.current?.destroy();
      hlsRef.current = null;
      if (nextEpisodeCountdownRef.current) {
        clearInterval(nextEpisodeCountdownRef.current);
        nextEpisodeCountdownRef.current = null;
      }
    };
  }, [src, hasNextEpisode, onNextEpisode, showNextEpisodeOverlay, duration, onTimeUpdate, onEnded, onError]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            showControlsTemporary();
          })
          .catch((error) => {
            // Ignore AbortError - video was interrupted by new load
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
  }, [showControlsTemporary]);

  const skipTime = useCallback((seconds: number, silent = false) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    // Silent seek: don't show controls on keyboard seek
    if (!silent) {
      showControlsTemporary();
    }
  }, [showControlsTemporary]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar) return;

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
  }, [duration, onSeek, showControlsTemporary]);

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
    togglePlay();
  }, [togglePlay]);

  const handleResume = useCallback(() => {
    const video = videoRef.current;
    if (!video || initialTime <= 0) return;
    
    setShowResumeCard(false);
    
    // Wait for video to be ready before seeking and playing
    const seekAndPlay = () => {
      if (!video || !video.readyState) {
        // Wait for video to be ready
        const checkReady = () => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA
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
                  // Ignore AbortError - video was interrupted
                  if (error.name !== 'AbortError' && import.meta.env.DEV) {
                    console.warn('[VideoPlayer] Resume play error:', error);
                  }
                });
            }
          } else {
            // Retry after a short delay
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      } else {
        // Video is ready, seek and play immediately
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
              // Ignore AbortError - video was interrupted
              if (error.name !== 'AbortError' && import.meta.env.DEV) {
                console.warn('[VideoPlayer] Resume play error:', error);
              }
            });
        }
      }
    };
    
    seekAndPlay();
  }, [initialTime, onSeek, showControlsTemporary]);

  const handleResumeCancel = useCallback(() => {
    setShowResumeCard(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10, true); // Silent - no UI flash
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10, true); // Silent - no UI flash
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
  }, [togglePlay, skipTime, toggleFullscreen, toggleMute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (nextEpisodeCountdownRef.current) {
        clearInterval(nextEpisodeCountdownRef.current);
        nextEpisodeCountdownRef.current = null;
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden shadow-2xl ${
        isMobile 
          ? 'rounded-none' // Edge-to-edge on mobile
          : 'max-w-[1200px] mx-auto rounded-[16px] aspect-video'
      }`}
      style={{
        // Fixed 16:9 aspect ratio - prevents flash
        aspectRatio: '16 / 9',
        minHeight: isMobile ? 'auto' : '0', // Let aspect-ratio handle height
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying && !isMobile) {
          setShowControls(false);
        }
      }}
      onTouchStart={() => {
        if (isMobile) {
          showControlsTemporary();
        }
      }}
    >
      {/* Static Placeholder Layer - Fixed height, prevents flash */}
      <div
        className="absolute inset-0 w-full h-full bg-black transition-opacity duration-300"
        style={{
          opacity: isMetadataLoaded ? 0 : 1,
          visibility: isMetadataLoaded ? 'hidden' : 'visible',
          zIndex: 1,
          aspectRatio: '16 / 9', // Maintain aspect ratio
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

      {/* Video Element - Mounted once, hidden until metadata loads */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
        style={{
          opacity: isMetadataLoaded ? 1 : 0,
          visibility: isMetadataLoaded ? 'visible' : 'hidden',
          zIndex: 2,
        }}
        playsInline
        onClick={handleVideoClick}
      />

      {/* Resume Watching Card */}
      {showResumeCard && initialTime > 0 && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center ${
            isMobile ? 'bg-black/95' : 'bg-black/80'
          } backdrop-blur-sm transition-opacity duration-300`}
          style={{
            opacity: showResumeCard ? 1 : 0,
          }}
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
        className={`absolute top-0 left-0 right-0 z-30 transition-opacity duration-300 ${
          showControls || !hasInteracted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={`absolute ${isMobile ? 'top-3 left-3' : 'top-5 left-5 md:top-6 md:left-6'}`}>
          {animeSlug ? (
            <Link
              to={`/anime/${animeSlug}`}
              className="group cursor-pointer"
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
      {introStart !== undefined && introEnd !== undefined && introStart < introEnd && !introSkipped && currentTime >= introStart && currentTime < introEnd && (
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

      {/* Next Episode Overlay (90 seconds before end) */}
      {showNextEpisodeOverlay && hasNextEpisode && onNextEpisode && (
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
                  ? `${formatTime(nextEpisodeCountdown)} sonra otomatik oynatılacak` 
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

      {/* Bottom Controls */}
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
                      // Toggle volume slider on mobile tap
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
                      ? 'w-0 opacity-0' // Hidden by default on mobile, shown on tap
                      : 'w-0 opacity-0 group-hover:w-20 group-hover:opacity-100' // Desktop: slide left on hover
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
    </div>
  );
};

export default VideoPlayer;
