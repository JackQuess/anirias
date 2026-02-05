import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import './videoPlayerV2.css';

interface VideoPlayerV2Props {
  src: string;
  poster?: string;
  onEnded?: () => void;
}

const VideoPlayerV2: React.FC<VideoPlayerV2Props> = ({ src, poster, onEnded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const wasPlayingRef = useRef(false);
  const wasFullscreenRef = useRef(false);
  const restoreAfterFullscreenRef = useRef<boolean | null>(null);
  const restoreAfterSourceRef = useRef<boolean | null>(null);
  const isHoveredRef = useRef(false);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);

  const attachSource = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    const isHls = src.endsWith('.m3u8');
    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      return;
    }

    video.src = src;
    video.load();
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    wasPlayingRef.current = !video.paused;
    wasFullscreenRef.current = document.fullscreenElement === video;
    restoreAfterSourceRef.current = wasPlayingRef.current;

    attachSource();

    const handleLoadedMetadata = () => {
      if (wasFullscreenRef.current && document.fullscreenElement !== video) {
        video.requestFullscreen?.().catch(() => {});
      }
      if (restoreAfterSourceRef.current) {
        if (video.readyState >= 2) {
          video.play().catch(() => {});
        }
      }
      restoreAfterSourceRef.current = null;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [attachSource]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const video = videoRef.current;
      if (!video) return;

      const isFs = document.fullscreenElement === video;
      setIsVideoFullscreen(isFs);

      document.body.classList.toggle('anirias-player-fs', isFs);

      if (isFs) {
        video.focus();
      }

      if (restoreAfterFullscreenRef.current !== null) {
        if (restoreAfterFullscreenRef.current) {
          if (video.readyState >= 2) {
            video.play().catch(() => {});
          }
        } else if (!video.paused) {
          video.pause();
        }
        restoreAfterFullscreenRef.current = null;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.classList.remove('anirias-player-fs');
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    restoreAfterFullscreenRef.current = !video.paused;

    if (document.fullscreenElement === video) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }

    video.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'TEXTAREA'].includes(target.tagName) ||
          target.isContentEditable ||
          target.closest('input, textarea, [contenteditable="true"]'))
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      const isFocused = document.activeElement === video;
      const isActive = isVideoFullscreen || isFocused || isHoveredRef.current;
      if (!isActive) return;

      if (e.code === 'KeyF') {
        e.preventDefault();
        e.stopPropagation();
        toggleFullscreen();
      } else if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (video.paused) {
          if (video.readyState >= 2) {
            video.play().catch(() => {});
          }
        } else {
          video.pause();
        }
      } else if (e.code === 'Escape') {
        if (document.fullscreenElement === video) {
          e.preventDefault();
          document.exitFullscreen?.().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoFullscreen, toggleFullscreen]);

  useEffect(() => {
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, []);

  return (
    <div className="anirias-player-v2">
      <video
        ref={videoRef}
        className="anirias-player-v2__video"
        src={Hls.isSupported() ? undefined : src}
        poster={poster}
        controls
        playsInline
        tabIndex={0}
        onEnded={onEnded}
        onMouseEnter={() => {
          isHoveredRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveredRef.current = false;
        }}
      />
    </div>
  );
};

export default VideoPlayerV2;
