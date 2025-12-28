import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Hls from 'hls.js';
import { Play, Pause, Rewind, FastForward, Volume2, VolumeX, Maximize, Minimize2, SkipForward } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string; // "JUJUTSU KAISEN – Sezon 2 • Bölüm 5"
  animeSlug?: string; // Anime slug for title link
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  initialTime?: number;
  onSeek?: (time: number) => void;
  introStart?: number; // Intro start time in seconds
  introEnd?: number; // Intro end time in seconds
  onSkipIntro?: () => void; // Callback when intro is skipped
  hasNextEpisode?: boolean; // Whether next episode exists
  onNextEpisode?: () => void; // Callback when next episode is requested
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false); // Hidden by default on initial load
  const [isDragging, setIsDragging] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showNextEpisodeOverlay, setShowNextEpisodeOverlay] = useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(10);
  const nextEpisodeCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  const durationSetRef = useRef(false); // Track if duration has been set to prevent multiple updates

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

    // Reset metadata state when src changes (hide video, show placeholder)
    setIsMetadataLoaded(false);
    durationSetRef.current = false; // Reset duration flag when src changes

    const handleLoadedMetadata = () => {
      // Set duration ONLY ONCE from loadedmetadata event
      if (!durationSetRef.current && video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
        durationSetRef.current = true;
      }
      setIsMetadataLoaded(true); // Mark metadata as loaded - video can now be shown
      if (initialTime > 0) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      // Use video.duration directly (source of truth), NOT state
      const videoDuration = video.duration || duration || 0;
      onTimeUpdate?.(time, videoDuration);
      
      // Show next episode overlay in last 10 seconds
      // Use video.duration directly, not state
      if (hasNextEpisode && onNextEpisode && videoDuration > 0) {
        const remaining = videoDuration - time;
        if (remaining <= 10 && remaining > 0 && !showNextEpisodeOverlay) {
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
                // Auto-play next episode
                onNextEpisode();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (remaining > 10 && showNextEpisodeOverlay) {
          // Hide overlay if user seeks back
          setShowNextEpisodeOverlay(false);
          if (nextEpisodeCountdownRef.current) {
            clearInterval(nextEpisodeCountdownRef.current);
            nextEpisodeCountdownRef.current = null;
          }
        }
      }
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        // Use video.duration directly, not state
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

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
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
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
    // CRITICAL: Remove showNextEpisodeOverlay from dependencies to prevent re-initialization
    // Only re-run when src or initialTime changes (episode change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, initialTime]);

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
      video.play().then(() => {
        setIsPlaying(true);
        showControlsTemporary();
      });
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, [showControlsTemporary]);

  const skipTime = useCallback((seconds: number, silent = false) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    if (!silent) {
      showControlsTemporary();
    }
  }, [showControlsTemporary]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
    onSeek?.(newTime);
    showControlsTemporary();
  }, [duration, onSeek, showControlsTemporary]);

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const slider = volumeSliderRef.current;
    if (!video || !slider) return;

    const rect = slider.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

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
    showControlsTemporary();
  }, [showControlsTemporary]);

  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlay();
  }, [togglePlay]);

  // Keyboard shortcuts (must be after callbacks are defined)
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
          skipTime(-10, true); // Silent seek - no UI flash
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10, true); // Silent seek - no UI flash
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (video.volume < 1) {
            video.volume = Math.min(1, video.volume + 0.1);
            setVolume(video.volume);
            setIsMuted(false);
          }
          // Don't show controls on keyboard volume changes (silent update)
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (video.volume > 0) {
            video.volume = Math.max(0, video.volume - 0.1);
            setVolume(video.volume);
            if (video.volume === 0) setIsMuted(true);
          }
          // Don't show controls on keyboard volume changes (silent update)
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

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (nextEpisodeCountdownRef.current) {
        clearInterval(nextEpisodeCountdownRef.current);
        nextEpisodeCountdownRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[1200px] mx-auto bg-black rounded-[16px] overflow-hidden shadow-2xl aspect-video"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }}
    >
      {/* Static Placeholder Layer - Always visible until metadata loads */}
      <div
        className="absolute inset-0 w-full h-full bg-black transition-opacity duration-300"
        style={{
          opacity: isMetadataLoaded ? 0 : 1,
          visibility: isMetadataLoaded ? 'hidden' : 'visible',
          zIndex: 1,
        }}
      >
        {poster && (
          <img
            src={poster}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide poster image on error, show black background
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Video Element - Mounted once, hidden until metadata loads */}
      {/* Note: src is set programmatically in useEffect for HLS compatibility */}
      <video
        ref={videoRef}
        poster={poster}
        className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
        style={{
          opacity: isMetadataLoaded ? 1 : 0,
          visibility: isMetadataLoaded ? 'visible' : 'hidden',
          zIndex: 2,
        }}
        playsInline
        onClick={handleVideoClick}
      />

      {/* Top Overlay - Title */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 transition-opacity duration-300 ${
          showControls || !hasInteracted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-5 left-5 md:top-6 md:left-6">
          {animeSlug ? (
            <Link
              to={`/anime/${animeSlug}`}
              className="group cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-white font-semibold text-base md:text-lg tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] group-hover:text-[#e5193e] transition-colors">
                {title}
              </h2>
            </Link>
          ) : (
            <h2 className="text-white font-semibold text-base md:text-lg tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {title}
            </h2>
          )}
        </div>
      </div>

      {/* Intro Skip Button */}
      {introStart !== undefined && introEnd !== undefined && introStart < introEnd && !introSkipped && currentTime >= introStart && currentTime < introEnd && (
        <div className="absolute bottom-24 right-6 z-40 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current && introEnd !== undefined) {
                videoRef.current.currentTime = introEnd;
                setIntroSkipped(true);
                onSkipIntro?.();
              }
            }}
            className="bg-black/80 hover:bg-black/90 backdrop-blur-md text-white px-5 py-2.5 rounded-lg font-semibold text-sm border border-white/20 hover:border-[#e5193e] transition-all shadow-lg flex items-center gap-2 group"
          >
            <span>Girişi Atla</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
              <polygon points="5 3 19 12 5 21 5 3" />
              <line x1="19" y1="12" x2="5" y2="12" />
            </svg>
          </button>
        </div>
      )}

      {/* Next Episode Overlay (Netflix-style) */}
      {showNextEpisodeOverlay && hasNextEpisode && onNextEpisode && (
        <div className="absolute bottom-6 right-6 z-40 pointer-events-auto">
          <div className="bg-black/90 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-2xl min-w-[280px]">
            <div className="text-white mb-3">
              <p className="text-sm font-semibold mb-1">Sonraki Bölüm</p>
              <p className="text-xs text-white/70">
                {nextEpisodeCountdown > 0 ? `${nextEpisodeCountdown} saniye sonra otomatik oynatılacak` : 'Oynatılıyor...'}
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
                className="flex-1 bg-[#e5193e] hover:bg-[#c41735] text-white px-4 py-2 rounded font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Play size={16} strokeWidth={2.5} />
                <span>Şimdi Oynat</span>
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
                className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                aria-label="İptal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
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
        <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-3">
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
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 shadow-lg"
              style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Play/Pause, Skip, Time */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center text-white hover:text-white/90 transition-colors"
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
                className="w-9 h-9 flex flex-col items-center justify-center text-white/70 hover:text-white transition-colors group"
                aria-label="10 saniye geri"
              >
                <Rewind size={18} strokeWidth={2.5} />
                <span className="text-[9px] font-semibold mt-0.5 leading-none">10</span>
              </button>

              {/* Skip +10s */}
              <button
                onClick={() => skipTime(10)}
                className="w-9 h-9 flex flex-col items-center justify-center text-white/70 hover:text-white transition-colors group"
                aria-label="10 saniye ileri"
              >
                <FastForward size={18} strokeWidth={2.5} />
                <span className="text-[9px] font-semibold mt-0.5 leading-none">10</span>
              </button>

              {/* Time Display */}
              <div className="text-white/90 text-sm font-medium tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Right: Volume, Next Episode, Fullscreen */}
            <div className="flex items-center gap-3">
              {/* Volume - Slider slides left on hover */}
              <div className="flex items-center gap-2 group relative">
                <button
                  onClick={toggleMute}
                  className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-[#e5193e] transition-colors z-10"
                  aria-label={isMuted ? 'Sesi aç' : 'Sessize al'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={20} strokeWidth={2.5} />
                  ) : (
                    <Volume2 size={20} strokeWidth={2.5} />
                  )}
                </button>
                <div
                  ref={volumeSliderRef}
                  className="w-0 h-1 bg-white/20 rounded-full cursor-pointer opacity-0 group-hover:w-20 group-hover:opacity-100 transition-all duration-150 ease-out overflow-hidden absolute left-full ml-2 top-1/2 -translate-y-1/2"
                  onClick={handleVolumeChange}
                  onMouseDown={() => setIsVolumeDragging(true)}
                  onMouseUp={() => setIsVolumeDragging(false)}
                  onMouseMove={(e) => {
                    if (isVolumeDragging) {
                      handleVolumeChange(e);
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
                  className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-[#e5193e] transition-colors"
                  aria-label="Sonraki Bölüm"
                >
                  <SkipForward size={20} strokeWidth={2.5} />
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-[#e5193e] transition-colors"
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

