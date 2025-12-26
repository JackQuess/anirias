import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PlayerOverlayProps {
  title: string;
  episodeLabel: string;
  duration: number;
  currentTime: number;
  paused: boolean;
  muted: boolean;
  playbackRate: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSeekTo: (percent: number) => void;
  onNextEpisode?: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onCyclePlaybackRate: () => void;
  hasNextEpisode?: boolean;
  onMouseMove?: () => void;
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
  title,
  episodeLabel,
  duration,
  currentTime,
  paused,
  muted,
  playbackRate,
  onTogglePlay,
  onSeek,
  onSeekTo,
  onNextEpisode,
  onToggleMute,
  onToggleFullscreen,
  onCyclePlaybackRate,
  hasNextEpisode = false,
  onMouseMove,
}) => {
  const [visible, setVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showTimelineThumb, setShowTimelineThumb] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Auto-hide overlay after 2.5s (but not when paused)
  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    if (!paused) {
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 2500);
    } else {
      // When paused, keep visible
      setVisible(true);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [visible, paused, currentTime]);

  const handleMouseMove = useCallback(() => {
    setVisible(true);
    onMouseMove?.();
  }, [onMouseMove]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(duration, percent * duration));
    onSeekTo(newTime / duration);
  }, [duration, onSeekTo]);

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleTimelineClick(e);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!progressBarRef.current || !duration) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = (moveEvent.clientX - rect.left) / rect.width;
      const clampedPercent = Math.max(0, Math.min(1, percent));
      onSeekTo(clampedPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleTimelineClick, duration, onSeekTo]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!visible && !paused) {
    return (
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        onMouseMove={handleMouseMove}
        onTouchStart={handleMouseMove}
      />
    );
  }

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-300"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      style={{ opacity: visible || paused ? 1 : 0 }}
    >
      {/* Top Gradient Overlay */}
      <div className="absolute top-0 left-0 right-0 h-[35%] pointer-events-none bg-gradient-to-b from-black/55 to-transparent" />

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%] pointer-events-none bg-gradient-to-t from-black/75 to-transparent" />

      {/* Top Center - Title & Episode */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 pointer-events-auto text-center">
        <h1 className="text-white font-black text-xl md:text-2xl lg:text-3xl uppercase tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-1 max-w-[90vw] px-4">
          {title}
        </h1>
        <p className="text-white/90 text-sm md:text-base mt-1 font-bold uppercase tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
          {episodeLabel}
        </p>
      </div>

      {/* Top Right - Controls (Speed, Volume, Fullscreen) */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 md:gap-3 pointer-events-auto">
        {/* Playback Speed */}
        <button
          onClick={onCyclePlaybackRate}
          className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white hover:scale-110 transition-transform bg-black/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-black/50"
          title={`Hız: ${playbackRate}x`}
        >
          <span className="text-xs md:text-sm font-bold">{playbackRate}x</span>
        </button>

        {/* Volume */}
        <button
          onClick={onToggleMute}
          className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white hover:scale-110 transition-transform bg-black/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-black/50"
          title={muted ? 'Sesi Aç' : 'Sessize Al'}
        >
          {muted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white hover:scale-110 transition-transform bg-black/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-black/50"
          title="Tam Ekran"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>

      {/* Center - Play/Pause Button */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        <button
          onClick={onTogglePlay}
          className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex items-center justify-center text-white bg-black/40 backdrop-blur-md rounded-full border-2 border-white/30 hover:scale-110 hover:bg-black/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-200"
          aria-label={paused ? 'Oynat' : 'Duraklat'}
        >
          {paused ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          )}
        </button>
      </div>

      {/* Center Left - Rewind 10s */}
      <div className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 pointer-events-auto">
        <button
          onClick={() => onSeek(-10)}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white bg-black/40 backdrop-blur-md rounded-full border border-white/30 hover:scale-110 hover:bg-black/60 transition-all duration-200"
          title="10 Saniye Geri"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 19 2 12 11 5 11 19" />
            <polygon points="22 19 13 12 22 5 22 19" />
            <line x1="6" y1="12" x2="18" y2="12" />
          </svg>
        </button>
      </div>

      {/* Center Right - Forward 10s */}
      <div className="absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 pointer-events-auto">
        <button
          onClick={() => onSeek(10)}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white bg-black/40 backdrop-blur-md rounded-full border border-white/30 hover:scale-110 hover:bg-black/60 transition-all duration-200"
          title="10 Saniye İleri"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 19 22 12 13 5 13 19" />
            <polygon points="2 19 11 12 2 5 2 19" />
            <line x1="6" y1="12" x2="18" y2="12" />
          </svg>
        </button>
      </div>

      {/* Bottom - Timeline & Controls */}
      <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-4 md:pb-6 pointer-events-auto">
        {/* Timeline Progress Bar */}
        <div
          ref={progressBarRef}
          className="relative h-1.5 md:h-2 bg-white/20 rounded-full mb-3 md:mb-4 cursor-pointer group transition-all duration-200 hover:h-2 md:hover:h-2.5"
          onClick={handleTimelineClick}
          onMouseDown={handleTimelineMouseDown}
          onMouseEnter={() => setShowTimelineThumb(true)}
          onMouseLeave={() => !isDragging && setShowTimelineThumb(false)}
        >
          {/* Progress Fill */}
          <div
            className="absolute top-0 left-0 h-full bg-brand-red rounded-full transition-all duration-200 group-hover:shadow-[0_0_12px_rgba(229,9,20,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Timeline Thumb */}
          {showTimelineThumb && (
            <div
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-lg border-2 border-brand-red transition-all duration-200"
              style={{ left: `${progressPercent}%` }}
            />
          )}
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Left - Time Display */}
          <div className="text-white text-xs md:text-sm font-bold tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Right - Next Episode Button */}
          {hasNextEpisode && onNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-xs md:text-sm font-bold uppercase tracking-wide transition-all duration-200 hover:scale-105"
            >
              <span>Sonraki Bölüm</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerOverlay;

