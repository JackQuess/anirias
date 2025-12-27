import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PlayerOverlayProps {
  title?: string; // Optional - not shown in new design but kept for compatibility
  episodeLabel?: string; // Optional - not shown in new design but kept for compatibility
  duration: number;
  currentTime: number;
  paused: boolean;
  muted?: boolean; // Optional - not shown in new design but kept for compatibility
  playbackRate?: number; // Optional - not shown in new design but kept for compatibility
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSeekTo?: (percent: number) => void; // Optional - timeline removed but kept for compatibility
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onToggleMute?: () => void; // Optional - not shown in new design but kept for compatibility
  onToggleFullscreen: () => void;
  onCyclePlaybackRate?: () => void; // Optional - not shown in new design but kept for compatibility
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
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
  muted = false,
  playbackRate = 1,
  onTogglePlay,
  onSeek,
  onSeekTo,
  onNextEpisode,
  onPrevEpisode,
  onToggleMute,
  onToggleFullscreen,
  onCyclePlaybackRate,
  hasNextEpisode = false,
  hasPrevEpisode = false,
  onMouseMove,
}) => {
  const [visible, setVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      style={{ opacity: visible || paused ? 1 : 0, backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
    >
      {/* Center Controls - Horizontal Layout */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8">
          {/* Previous Episode - Far Left */}
          {hasPrevEpisode && onPrevEpisode && (
            <button
              onClick={onPrevEpisode}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white hover:scale-105 transition-transform"
              title="Önceki Bölüm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>
          )}

          {/* Rewind 10s - Left */}
          <button
            onClick={() => onSeek(-10)}
            className="w-12 h-12 md:w-14 md:h-14 flex flex-col items-center justify-center text-white hover:scale-105 transition-transform"
            title="10 Saniye Geri"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 19 2 12 11 5 11 19" />
              <polygon points="22 19 13 12 22 5 22 19" />
            </svg>
            <span className="text-[10px] font-bold mt-0.5">10</span>
          </button>

          {/* Play/Pause - Center */}
          <button
            onClick={onTogglePlay}
            className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex items-center justify-center text-white hover:scale-105 transition-transform"
            aria-label={paused ? 'Oynat' : 'Duraklat'}
          >
            {paused ? (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </button>

          {/* Forward 10s - Right */}
          <button
            onClick={() => onSeek(10)}
            className="w-12 h-12 md:w-14 md:h-14 flex flex-col items-center justify-center text-white hover:scale-105 transition-transform"
            title="10 Saniye İleri"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 19 22 12 13 5 13 19" />
              <polygon points="2 19 11 12 2 5 2 19" />
            </svg>
            <span className="text-[10px] font-bold mt-0.5">10</span>
          </button>

          {/* Next Episode - Far Right */}
          {hasNextEpisode && onNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white hover:scale-105 transition-transform"
              title="Sonraki Bölüm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-4 md:pb-6 pointer-events-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Left - Time Display */}
          <div className="text-white text-sm md:text-base font-bold tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Right - Next Episode Button + Fullscreen */}
          <div className="flex items-center gap-3">
            {hasNextEpisode && onNextEpisode && (
              <button
                onClick={onNextEpisode}
                className="px-4 md:px-6 py-2 border-2 border-brand-red text-brand-red hover:bg-brand-red hover:text-white rounded-lg text-xs md:text-sm font-bold uppercase tracking-wide transition-all duration-200 hover:scale-105"
              >
                Sonraki Bölüm
              </button>
            )}
            <button
              onClick={onToggleFullscreen}
              className="w-10 h-10 flex items-center justify-center text-white hover:scale-105 transition-transform"
              title="Tam Ekran"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerOverlay;

