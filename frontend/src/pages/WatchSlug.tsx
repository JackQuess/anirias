import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLoad } from '../services/useLoad';
import { db } from '../services/db';
import { useAuth } from '../services/auth';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Comments from '../components/Comments';
import VideoPlayer from '../components/VideoPlayer';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { WatchProgress } from '../types';
import NotFound from './NotFound';
import { parseSeasonSlug, generateSeasonSlug } from '@/utils/seasonSlug';

const WatchSlug: React.FC = () => {
  const { animeSlug, seasonNumber, episodeNumber } = useParams<{
    animeSlug: string;
    seasonNumber: string;
    episodeNumber: string;
  }>();

  const navigate = useNavigate();
  const { user } = useAuth();

  const seasonNum = seasonNumber ? parseInt(seasonNumber, 10) : null;
  const episodeNum = episodeNumber ? parseInt(episodeNumber, 10) : null;

  if (!animeSlug || !seasonNum || !episodeNum || isNaN(seasonNum) || isNaN(episodeNum) || seasonNum < 1 || episodeNum < 1) {
    return <NotFound />;
  }

  const progressSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [savedProgress, setSavedProgress] = useState<WatchProgress | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Parse season slug to get anime slug
  const seasonSlugInfo = useMemo(() => {
    if (!animeSlug) return null;
    const parsed = parseSeasonSlug(animeSlug);
    if (!parsed) {
      // If parsing fails, assume it's the base slug (season 1)
      return { animeSlug: animeSlug, seasonNumber: 1 };
    }
    return parsed;
  }, [animeSlug]);

  const { data: anime, loading: animeLoading, error: animeError } = useLoad(
    () => {
      if (!seasonSlugInfo) throw new Error('Invalid season slug');
      return db.getAnimeBySlug(seasonSlugInfo.animeSlug);
    },
    [seasonSlugInfo]
  );

  const { data: season, loading: seasonLoading, error: seasonError } = useLoad(
    () => {
      if (!anime?.id || !seasonNum) throw new Error('Anime and season required');
      return db.getSeasonByAnimeAndNumber(anime.id, seasonNum);
    },
    [anime?.id, seasonNum]
  );

  const { data: episode, loading: episodeLoading, error: episodeError } = useLoad(
    () => {
      if (!season?.id || !episodeNum) throw new Error('Season and episode required');
      return db.getEpisodeBySeasonAndNumber(season.id, episodeNum);
    },
    [season?.id, episodeNum]
  );

  const { data: seasons } = useLoad(
    () => {
      if (!anime?.id) throw new Error('Anime required');
      return db.getSeasons(anime.id);
    },
    [anime?.id]
  );

  const { data: episodes } = useLoad(
    () => {
      if (!season?.id) throw new Error('Season required');
      return db.getEpisodesBySeasonId(season.id);
    },
    [season?.id]
  );

  const { data: progressList } = useLoad(
    () => {
      if (!user || !anime?.id) return Promise.resolve([]);
      return db.getWatchProgressForAnime(user.id, anime.id);
    },
    [user, anime?.id]
  );

  const isNotFound = useMemo(() => {
    if (animeLoading || seasonLoading || episodeLoading) return false;
    if (animeError || !anime) return true;
    if (seasonError || !season) return true;
    if (episodeError || !episode) return true;
    if (!anime.slug) return true;
    return false;
  }, [animeLoading, seasonLoading, episodeLoading, animeError, seasonError, episodeError, anime, season, episode]);

  const navigateToEpisode = useCallback((targetSeasonNum: number, targetEpisodeNum: number) => {
    if (!anime?.slug) return;
    const seasonSlug = generateSeasonSlug(anime.slug, targetSeasonNum);
    navigate(`/watch/${seasonSlug}/${targetSeasonNum}/${targetEpisodeNum}`);
  }, [anime?.slug, navigate]);

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
    if (!episode) return null;
    return episode.video_url || episode.hls_url || null;
  }, [episode]);

  // Reset progress tracking when episode changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setSavedProgress(null);
    if (progressSaveIntervalRef.current) {
      clearInterval(progressSaveIntervalRef.current);
      progressSaveIntervalRef.current = null;
    }
  }, [episode?.id]);

  // Load saved progress for current episode
  useEffect(() => {
    if (user && episode && anime && duration > 0) {
      db.getWatchProgress(user.id, anime.id, episode.id).then(prog => {
        if (prog && prog.duration_seconds > 0) {
          const progressPercent = (prog.progress_seconds / prog.duration_seconds) * 100;
          if (progressPercent >= 90) {
            // Episode completed, reset
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: anime.id,
              episode_id: episode.id,
              progress_seconds: 0,
              duration_seconds: prog.duration_seconds
            });
            setSavedProgress(null);
          } else if (prog.progress_seconds > 0 && progressPercent < 90) {
            setSavedProgress(prog);
          } else {
            setSavedProgress(null);
          }
        } else {
          setSavedProgress(null);
        }
      });
    }
  }, [user, episode, anime, duration]);

  // Save watch progress periodically
  useEffect(() => {
    if (user && episode && anime && duration > 0) {
      progressSaveIntervalRef.current = setInterval(() => {
        if (currentTime > 0 && duration > 0) {
          const progressPercent = (currentTime / duration) * 100;
          if (progressPercent >= 90) {
            // Mark as completed
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: anime.id,
              episode_id: episode.id,
              progress_seconds: 0,
              duration_seconds: Math.floor(duration)
            });
          } else {
            db.saveWatchProgress({
              user_id: user.id,
              anime_id: anime.id,
              episode_id: episode.id,
              progress_seconds: Math.floor(currentTime),
              duration_seconds: Math.floor(duration)
            });
          }
        }
      }, 10000); // Save every 10 seconds
      return () => {
        if (progressSaveIntervalRef.current) {
          clearInterval(progressSaveIntervalRef.current);
          progressSaveIntervalRef.current = null;
        }
      };
    }
  }, [user, episode, anime, currentTime, duration]);

  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  // Find next episode
  const nextEpisode = useMemo(() => {
    if (!episodes || !episodeNum) return null;
    if (episodes.length > episodeNum) {
      return { seasonNumber: seasonNum!, episodeNumber: episodeNum + 1 };
    }
    // Check if there's a next season
    if (seasons && seasonNum) {
      const nextSeason = seasons.find(s => s.season_number === seasonNum + 1);
      if (nextSeason) {
        return { seasonNumber: nextSeason.season_number, episodeNumber: 1 };
      }
    }
    return null;
  }, [episodes, episodeNum, seasonNum, seasons]);

  const handleEnded = useCallback(() => {
    // Auto-play next episode
    if (nextEpisode) {
      navigateToEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber);
    }
  }, [nextEpisode, navigateToEpisode]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  if (isNotFound) {
    return <NotFound />;
  }

  if (animeLoading || seasonLoading || episodeLoading || !anime || !season || !episode) {
    return (
      <div className="min-h-screen bg-brand-black pt-20">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  if (!playbackUrl) {
    return (
      <div className="min-h-screen bg-brand-black pt-40 text-center text-white font-black uppercase space-y-4">
        <div>Video henüz eklenmemiş.</div>
        <div className="text-gray-400 text-sm mt-2">Bölüm {episodeNum} - Sezon {seasonNum}</div>
      </div>
    );
  }

  const titleString = getDisplayTitle(anime.title);
  const playerTitle = `${titleString.toUpperCase()} – Sezon ${seasonNum} • Bölüm ${episode.episode_number}`;
  const fallbackPoster = '/banners/hsdxd_rias_banner.webp';
  const rawPoster = anime.banner_image || anime.cover_image || null;
  const poster = proxyImage(rawPoster || fallbackPoster);
  const initialTime = savedProgress && savedProgress.progress_seconds > 0 ? savedProgress.progress_seconds : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-20 lg:pt-32 pb-40">
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-10 min-w-0">
          {/* Main Player Area */}
          <div className="flex-1 space-y-6 w-full min-w-0 overflow-hidden">
            <VideoPlayer
              src={playbackUrl || ''} // Empty string if undefined to prevent player flash
              poster={poster}
              title={playerTitle}
              animeSlug={anime.slug || undefined}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onSeek={handleSeek}
              initialTime={initialTime}
              introStart={episode.intro_start || undefined}
              introEnd={episode.intro_end || undefined}
              onSkipIntro={() => {
                // Intro skip handled internally by VideoPlayer
              }}
              hasNextEpisode={!!nextEpisode}
              onNextEpisode={() => {
                if (nextEpisode) {
                  navigateToEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber);
                }
              }}
            />

            {/* Comments */}
            <div className="px-4 lg:px-0">
              <Comments animeId={anime.id} episodeId={episode.id} />
            </div>
          </div>

          {/* Episode List Sidebar */}
          <aside className="hidden xl:block w-[320px] 2xl:w-[360px] flex-shrink-0 max-w-full space-y-8">
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-6 h-[600px] flex flex-col shadow-xl overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 flex-shrink-0">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-l-4 border-brand-red pl-3">
                  BÖLÜM LİSTESİ
                </h3>
                <span className="text-[9px] font-black text-gray-500 uppercase">
                  {episodes?.length || 0} BÖLÜM
                </span>
              </div>
              <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar space-y-1.5 min-h-0 w-full">
                {episodes?.map((ep) => {
                  const isCurrent = ep.episode_number === episodeNum;
                  const progress = progressMap.get(ep.id);
                  return (
                    <button
                      key={`${ep.season_id}-${ep.episode_number}`}
                      onClick={() => navigateToEpisode(seasonNum!, ep.episode_number)}
                      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all w-full max-w-full text-left h-[56px] flex-shrink-0 ${
                        isCurrent
                          ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                          : 'hover:bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                        isCurrent ? 'bg-black/20' : 'bg-white/5'
                      }`}>
                        {ep.episode_number}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[9px] font-black uppercase truncate leading-tight">
                          {ep.title || `Bölüm ${ep.episode_number}`}
                        </p>
                        <p className={`text-[7px] font-bold uppercase mt-0.5 ${
                          isCurrent ? 'text-white/70' : 'text-gray-600'
                        }`}>
                          {ep.duration ? `${Math.floor(ep.duration / 60)} DK` : '24 DK'}
                        </p>
                        {progress && progress.duration > 0 && (
                          <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400"
                              style={{
                                width: `${Math.min(100, (progress.progress / progress.duration) * 100)}%`
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

            {/* Now Watching Card */}
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
                <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-1">
                  ŞİMDİ İZLENİYOR
                </p>
                <h4 className="text-sm font-bold text-white uppercase italic leading-tight line-clamp-2">
                  {titleString}
                </h4>
              </div>
            </div>
          </aside>

          {/* Mobile Episode List */}
          <div className="xl:hidden fixed bottom-4 left-0 right-0 z-[120] px-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  // Mobile sheet toggle could be added here
                }}
                className="bg-red-500 text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-2xl shadow-lg shadow-red-500/30"
              >
                Bölüm Listesi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchSlug;
