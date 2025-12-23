import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

const RotateCcwIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 12h4l-1.5 1.5A8 8 0 1112 20" />
  </svg>
);

const RotateCwIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M23 12h-4l1.5-1.5A8 8 0 1112 4" />
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
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Data Loading
  const { data: anime } = useLoad(() => db.getAnimeById(animeId!), [animeId]);
  const { data: episodes } = useLoad(() => db.getEpisodes(animeId!), [animeId]);

  const currentEpNum = parseInt(episodeId || '1');

  const defaultSeasonNumber = useMemo(() => {
    if (!episodes || episodes.length === 0) return 1;
    const withSeason = episodes.filter((ep) => ep.seasons?.season_number);
    if (withSeason.length > 0) {
      return Math.min(...withSeason.map((ep) => ep.seasons?.season_number || 1));
    }
    return 1;
  }, [episodes]);

  const seasonNumber = useMemo(() => {
    const match = episodes?.find((ep) => ep.episode_number === currentEpNum);
    return match?.seasons?.season_number || defaultSeasonNumber;
  }, [episodes, currentEpNum, defaultSeasonNumber]);

  const seasonEpisodes = useMemo(() => {
    if (!episodes) return [];
    return episodes.filter((ep) => (ep.seasons?.season_number || defaultSeasonNumber) === seasonNumber);
  }, [episodes, seasonNumber, defaultSeasonNumber]);

  const currentEpisode = seasonEpisodes.find(e => e.episode_number === currentEpNum);
  const prevEpisode = seasonEpisodes.find(e => e.episode_number === currentEpNum - 1);
  const nextEpisode = seasonEpisodes.find(e => e.episode_number === currentEpNum + 1);

  const fallbackCdnUrl = useMemo(() => {
    if (!anime?.slug || !currentEpisode?.seasons?.season_number) return null;
    return `https://anirias-videos.b-cdn.net/${anime.slug}/season-${currentEpisode.seasons.season_number}/episode-${currentEpisode.episode_number}.mp4`;
  }, [anime, currentEpisode]);

  const playbackUrl = useMemo(() => {
    const chosen =
      currentEpisode?.stream_url ||
      currentEpisode?.video_path ||
      currentEpisode?.hls_url ||
      fallbackCdnUrl ||
      null;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('Playback URL', { chosen, fallbackCdnUrl, episode: currentEpisode });
    }
    return chosen;
  }, [currentEpisode, fallbackCdnUrl]);

  useEffect(() => {
    setHasStarted(false);
    setIsPlaying(false);
    setShowControls(false);
    setIsBuffering(false);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
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
    setShowControls(true);
    document.body.style.cursor = 'default';
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        if (isFullscreen) document.body.style.cursor = 'none';
      }
    }, isMobile ? 2200 : 2500);
  }, [isPlaying, isFullscreen, isMobile]);

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

  const handleSeekStart = () => setIsDragging(true);
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => setCurrentTime(parseFloat(e.target.value));
  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const time = parseFloat((e.target as HTMLInputElement).value);
    if (videoRef.current) videoRef.current.currentTime = time;
    setIsDragging(false);
    showControlsTemporary();
  };

  const skipTime = useCallback((amount: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += amount;
  }, []);

  const goToEpisode = useCallback((episode?: { episode_number: number } | null) => {
    if (!episode) return;
    navigate(`/watch/${animeId}/${episode.episode_number}`);
  }, [navigate, animeId]);

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (!newMuted && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
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
    if (videoRef.current && !isDragging) setCurrentTime(videoRef.current.currentTime);
  };

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
    return () => {
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleDurationChange);
    };
  }, [syncDuration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
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
    if (user && videoRef.current && currentEpisode) {
      const interval = setInterval(() => {
        if (!videoRef.current?.paused) {
          db.saveWatchProgress({
            user_id: user.id,
            anime_id: animeId!,
            episode_id: currentEpisode.id,
            progress_seconds: Math.floor(videoRef.current.currentTime),
            duration_seconds: Math.floor(videoRef.current.duration || 0)
          });
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, currentEpisode, animeId]);

  useEffect(() => {
    if (user && currentEpisode && videoRef.current) {
      db.getWatchProgress(user.id, animeId!, currentEpisode.id).then(prog => {
        if (prog && videoRef.current && prog.progress_seconds < (prog.duration_seconds * 0.95)) {
          videoRef.current.currentTime = prog.progress_seconds;
        }
      });
    }
  }, [user, currentEpisode, animeId]);

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  if (!anime) return <div className="pt-40 text-center"><LoadingSkeleton type="banner" /></div>;
  if (!currentEpisode) {
    if (episodes && episodes.length > 0) {
      return <div className="pt-40 text-center text-white font-black uppercase">Bölüm bulunamadı (ID: {episodeId}). Sezon numarası veya bölüm numarasını kontrol et.</div>;
    }
    return <div className="pt-40 text-center text-white font-black uppercase">Bölümler yüklenemedi</div>;
  }
  if (!playbackUrl) {
    return <div className="pt-40 text-center text-white font-black uppercase">CDN yolu eksik: slug veya stream_url/video_path ayarlanmadı.</div>;
  }

  const titleString = getDisplayTitle(anime.title);
  const episodeTitle = currentEpisode.title || `Bölüm ${currentEpisode.episode_number}`;
  const fallbackPoster = '/banners/hsdxd_rias_banner.webp';
  const rawPoster = anime.banner_image || anime.cover_image || null;
  const poster = proxyImage(rawPoster || fallbackPoster);
  const controlsVisible = (!hasStarted || !isPlaying || showControls || isBuffering || !!playbackError);

  return (
    <div className="min-h-screen bg-brand-black">
      <div className="z-[130] mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 pt-20 lg:pt-32 pb-40">
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-10 min-w-0">
          
          <div className="flex-1 space-y-4 lg:space-y-6 w-full min-w-0 overflow-hidden">
            <div 
              ref={playerContainerRef}
              className="w-full aspect-video bg-black lg:rounded-[1.5rem] overflow-hidden lg:border border-white/5 shadow-2xl select-none sticky top-0 lg:static z-50 ring-1 ring-white/5"
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
                  onError={() => setPlaybackError(`CDN dosyası bulunamadı: ${playbackUrl || 'bilinmiyor'}`)}
                  onClick={(e) => { e.stopPropagation(); togglePlay(e as any); }}
                  controls={false}
                />

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

                {controlsVisible && (
                  <div className={`absolute inset-0 z-30 flex flex-col justify-between pointer-events-none transition-opacity duration-200 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/70" />

                    <div className="relative flex items-start justify-between pt-6 px-4 md:px-8">
                      <div className="flex-1 flex justify-center">
                        <Link
                          to={`/anime/${animeId}`}
                          className="pointer-events-auto"
                        >
                          <div className="bg-white/10 border border-white/15 rounded-full px-6 py-3 shadow-lg backdrop-blur-md text-center">
                            <div className="text-white text-sm md:text-base font-black uppercase tracking-[0.16em]">
                              {titleString}
                            </div>
                            <div className="text-white/80 text-[11px] mt-1 font-semibold tracking-wide uppercase">
                              Episode {currentEpisode.episode_number}
                            </div>
                          </div>
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 pointer-events-auto">
                        <button
                          onClick={toggleFullscreen}
                          className="w-11 h-11 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-all flex items-center justify-center backdrop-blur-md"
                        >
                          {isFullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center w-full px-3 md:px-8 pb-10 md:pb-16 pointer-events-auto">
                      <div className="flex items-center justify-between w-full max-w-5xl gap-2 md:gap-5">
                        <button
                          onClick={() => goToEpisode(prevEpisode)}
                          disabled={!prevEpisode}
                          className={`relative w-10 h-10 md:w-14 md:h-14 rounded-full border text-white flex items-center justify-center transition-all backdrop-blur-md ${
                            prevEpisode ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <SkipPrevIcon size={22} />
                        </button>

                        <button
                          onClick={() => skipTime(-10)}
                          className="relative w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center backdrop-blur-md"
                        >
                          <RotateCcwIcon size={24} />
                          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black tracking-tight">10</span>
                        </button>

                        <button
                          onClick={(e) => togglePlay(e as any)}
                          className="w-[64px] h-[64px] md:w-20 md:h-20 rounded-full bg-white text-brand-black shadow-2xl hover:scale-105 transition-transform flex items-center justify-center"
                        >
                          {isPlaying ? <PauseIcon size={40} /> : <PlayIcon size={40} />}
                        </button>

                        <button
                          onClick={() => skipTime(10)}
                          className="relative w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center backdrop-blur-md"
                        >
                          <RotateCwIcon size={24} />
                          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black tracking-tight">10</span>
                        </button>

                        <button
                          onClick={() => goToEpisode(nextEpisode)}
                          disabled={!nextEpisode}
                          className={`relative w-10 h-10 md:w-14 md:h-14 rounded-full border text-white flex items-center justify-center transition-all backdrop-blur-md ${
                            nextEpisode ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <SkipNextIcon size={22} />
                        </button>
                      </div>
                    </div>

                    <div className="relative pointer-events-auto px-5 pb-6">
                      <div className="relative h-[6px] bg-white/15 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-white/30" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
                        <div className="absolute top-0 left-0 h-full bg-white" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          step="0.1"
                          value={currentTime}
                          onMouseDown={isMobile ? undefined : handleSeekStart}
                          onChange={isMobile ? undefined : handleSeekChange}
                          onMouseUp={isMobile ? undefined : handleSeekEnd}
                          onTouchStart={handleSeekStart}
                          onTouchEnd={handleSeekEnd}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between text-white text-sm font-semibold tracking-wide mt-3 px-1 drop-shadow">
                        <div className="flex items-center gap-2">
                          <span>{formatTime(currentTime)}</span>
                          <span className="text-white/70">/</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {nextEpisode && (
                            <button
                              onClick={() => goToEpisode(nextEpisode)}
                              className="group flex items-center gap-2 text-white text-sm font-semibold rounded-full bg-white/10 px-4 py-2 transition-all duration-200 ease-out border border-white/15 backdrop-blur-md hover:bg-white hover:text-brand-black hover:shadow-[0_0_20px_rgba(255,255,255,0.35)]"
                            >
                              <span>Sonraki Bölüm</span>
                              <span className="transform transition-transform duration-200 ease-out group-hover:translate-x-1">
                                <ChevronRightIcon size={18} />
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div className="px-4 lg:px-0">
              <Comments animeId={animeId!} episodeId={currentEpisode.id} />
            </div>
          </div>

          <aside className="hidden xl:block w-[360px] 2xl:w-[400px] flex-shrink-0 max-w-full space-y-8">
             <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 h-[600px] flex flex-col shadow-xl">
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                   <h3 className="text-sm font-black text-white uppercase tracking-widest border-l-4 border-brand-red pl-3">BÖLÜM LİSTESİ</h3>
                   <span className="text-[10px] font-black text-gray-500 uppercase">{episodes?.length} BÖLÜM</span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                   {episodes?.map(ep => {
                     const isCurrent = ep.episode_number === currentEpNum;
                     return (
                       <button 
                          key={ep.id} 
                          onClick={() => navigate(`/watch/${animeId}/${ep.episode_number}`)}
                          className={`group flex items-center gap-4 p-4 rounded-2xl transition-all w-full text-left ${
                            isCurrent 
                            ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' 
                            : 'hover:bg-white/5 text-gray-400 hover:text-white'
                          }`}
                       >
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${isCurrent ? 'bg-black/20' : 'bg-white/5'}`}>
                            {ep.episode_number}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase truncate">{ep.title || `Bölüm ${ep.episode_number}`}</p>
                            <p className={`text-[9px] font-bold uppercase mt-0.5 ${isCurrent ? 'text-white/70' : 'text-gray-600'}`}>24 DK</p>
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
        </div>
      </div>
    </div>
  );
};

export default Watch;
