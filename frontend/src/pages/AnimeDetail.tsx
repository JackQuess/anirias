
import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { useAuth } from '@/services/auth';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { WatchlistStatus } from '../types';
import AnimeCard from '../components/AnimeCard';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';

const AnimeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [watchlistStatus, setWatchlistStatus] = useState<WatchlistStatus | 'none'>('none');
  const [userRating, setUserRating] = useState<number>(0);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  const { data: anime, loading: animeLoading } = useLoad(() => db.getAnimeById(id!), [id]);
  // Fetch ALL episodes - no season_id filter
  const { data: allEpisodes, loading: episodesLoading, reload: reloadEpisodes } = useLoad(() => db.getEpisodes(id!), [id]);
  const { data: similarAnimes } = useLoad(() => db.getSimilarAnimes(id!), [id]);
  const { data: watchlist } = useLoad(() => user ? db.getWatchlist(user.id) : Promise.resolve([]), [user]);

  // Group episodes by season_number
  const episodesBySeason = React.useMemo(() => {
    if (!allEpisodes || allEpisodes.length === 0) return {};
    const grouped: Record<number, typeof allEpisodes> = {};
    allEpisodes.forEach(ep => {
      const seasonNum = ep.season_number || 1;
      if (!grouped[seasonNum]) {
        grouped[seasonNum] = [];
      }
      grouped[seasonNum].push(ep);
    });
    // Sort episodes within each season by episode_number
    Object.keys(grouped).forEach(seasonNum => {
      grouped[Number(seasonNum)].sort((a, b) => a.episode_number - b.episode_number);
    });
    return grouped;
  }, [allEpisodes]);

  // Get unique season numbers from episodes, sorted
  const seasonNumbers = React.useMemo(() => {
    const nums = Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);
    return nums;
  }, [episodesBySeason]);

  // Initialize selected season from URL or first available season
  useEffect(() => {
    const querySeason = searchParams.get('season');
    const querySeasonNum = querySeason ? parseInt(querySeason) : null;
    
    if (seasonNumbers.length === 0) {
      setSelectedSeasonNumber(null);
      return;
    }

    if (!selectedSeasonNumber) {
      // Use season from URL if valid, otherwise first season
      const validSeason = querySeasonNum && seasonNumbers.includes(querySeasonNum) 
        ? querySeasonNum 
        : seasonNumbers[0];
      setSelectedSeasonNumber(validSeason);
      if (validSeason && !querySeason) {
        setSearchParams({ season: String(validSeason) });
      }
    } else if (querySeasonNum && querySeasonNum !== selectedSeasonNumber && seasonNumbers.includes(querySeasonNum)) {
      // Update from URL if valid
      setSelectedSeasonNumber(querySeasonNum);
    }
  }, [seasonNumbers, selectedSeasonNumber, searchParams, setSearchParams]);

  // Get episodes for selected season
  const visibleEpisodes = React.useMemo(() => {
    if (!selectedSeasonNumber) return [];
    return episodesBySeason[selectedSeasonNumber] || [];
  }, [selectedSeasonNumber, episodesBySeason]);

  useEffect(() => {
    if (watchlist && id) {
      const entry = watchlist.find(w => w.anime_id === id);
      if (entry) setWatchlistStatus(entry.status);
    }
  }, [watchlist, id]);

  const handleStatusChange = async (status: WatchlistStatus) => {
    if (!user) return alert('Lütfen önce giriş yapın!');
    await db.updateWatchlist(user.id, id!, status);
    setWatchlistStatus(status);
    setShowStatusMenu(false);
  };

  const titleString = anime ? getDisplayTitle(anime.title) : '';

  if (animeLoading) return <div className="min-h-screen bg-brand-black pt-20"><LoadingSkeleton type="banner" /></div>;
  if (!anime) return <div className="min-h-screen bg-brand-black flex items-center justify-center text-white font-black italic">ANİME BULUNAMADI</div>;

  const statusLabels: Record<string, string> = {
    watching: 'İzliyorum',
    planning: 'Planlıyorum',
    completed: 'Tamamladım',
    dropped: 'Bıraktım',
    paused: 'Durdurdum',
    none: 'Listeye Ekle'
  };

  return (
    <div className="bg-brand-black min-h-screen pb-40">
      {/* Background Banner */}
      <div className="relative h-[40vh] md:h-[60vh] lg:h-[75vh] w-full overflow-hidden">
        <img
          src={proxyImage(anime.banner_image || anime.cover_image || '')}
          className="w-full h-full object-cover opacity-50 blur-sm scale-105"
          onError={(e) => {
            const fallback = anime.banner_image || anime.cover_image || '';
            if (fallback && (e.target as HTMLImageElement).src !== fallback) {
              (e.target as HTMLImageElement).src = fallback;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black/80 via-transparent to-transparent" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-16 -mt-32 md:-mt-64 lg:-mt-96 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          
          {/* Sidebar (Poster & Actions) */}
          <div className="w-full sm:w-64 lg:w-[320px] mx-auto lg:mx-0 space-y-6 lg:space-y-8 flex-shrink-0">
            <div className="aspect-[2/3] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden border-4 border-white/5 shadow-2xl relative group bg-brand-surface">
              <img
                src={proxyImage(anime.cover_image || '')}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  const fallback = anime.cover_image || '';
                  if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                    (e.target as HTMLImageElement).src = fallback;
                  }
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                 <Link to={seasonNumbers.length > 0 ? `/watch/${anime.id}?season=${seasonNumbers[0]}&episode=1` : `/watch/${anime.id}?season=1&episode=1`} className="bg-brand-red text-white p-6 rounded-full shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-500 hover:bg-brand-redHover">
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                 </Link>
              </div>
            </div>

            <div className="space-y-3 lg:space-y-4 relative">
              <button 
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 border shadow-xl ${
                  watchlistStatus !== 'none' ? 'bg-brand-red border-brand-red text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {statusLabels[watchlistStatus]}
                <svg className={`w-3 h-3 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
              </button>

              {showStatusMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-4 bg-brand-dark border border-white/10 rounded-[2rem] p-4 shadow-2xl z-20 animate-fade-in origin-bottom">
                  {['watching', 'planning', 'completed', 'dropped'].map((status) => (
                    <button 
                      key={status} 
                      onClick={() => handleStatusChange(status as WatchlistStatus)}
                      className="w-full text-left px-6 py-4 rounded-xl text-[9px] font-black text-gray-500 hover:text-white hover:bg-white/5 uppercase tracking-widest transition-all"
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
              )}

              <Link to={seasonNumbers.length > 0 ? `/watch/${anime.id}?season=${seasonNumbers[0]}&episode=1` : `/watch/${anime.id}?season=1&episode=1`} className="w-full bg-white text-brand-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center hover:scale-[1.02] transition-all shadow-xl">
                HEMEN İZLE
              </Link>
            </div>

            {/* Mobile: Info moved below */}
            <div className="hidden lg:block bg-brand-dark/80 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-xl">
               <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest border-l-4 border-brand-red pl-4">ANİME BİLGİLERİ</h4>
               <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500 font-bold uppercase">PUAN</span><span className="text-brand-red font-black italic">★ {anime.score}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500 font-bold uppercase">YIL</span><span className="text-white font-black">{anime.year}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500 font-bold uppercase">SÜRE</span><span className="text-white font-black">24 DK</span></div>
                  <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500 font-bold uppercase">DURUM</span><span className="text-white font-black">DEVAM EDİYOR</span></div>
               </div>
               <div className="flex flex-wrap gap-2 pt-4">
                  {anime.genres.map(g => <span key={g} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[8px] font-black text-gray-400 uppercase">{g}</span>)}
               </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow lg:pt-24 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-8xl font-black text-white uppercase italic tracking-tighter leading-[0.9] mb-6 lg:mb-10 drop-shadow-2xl">{titleString}</h1>
            
            <p className="text-gray-300 text-sm md:text-lg leading-relaxed max-w-4xl mb-8 lg:mb-12 opacity-90">{anime.description}</p>
            
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-center lg:justify-start border-b border-white/5 pb-10 mb-12 lg:mb-16">
               <div className="flex flex-col items-center lg:items-start">
                  <span className="text-[9px] font-black text-brand-red uppercase tracking-[0.4em] mb-2">SENİN PUANIN</span>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => setUserRating(star)} className={`text-3xl transition-all hover:scale-110 ${userRating >= star ? 'text-yellow-500' : 'text-gray-800 hover:text-gray-600'}`}>★</button>
                    ))}
                  </div>
               </div>
               <div className="w-full md:w-px h-px md:h-16 bg-white/10" />
               <div className="flex flex-col items-center lg:items-start">
                  <span className="text-[9px] font-black text-brand-red uppercase tracking-[0.4em] mb-2">TOPLAM İZLENME</span>
                  <span className="text-4xl font-black text-white italic tracking-tighter">{(anime.view_count || 0).toLocaleString()}</span>
               </div>
            </div>

             {/* Mobile Info Block */}
            <div className="lg:hidden bg-brand-surface border border-white/5 p-6 rounded-3xl mb-12 text-left">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <span className="text-[9px] text-gray-500 font-bold uppercase">YIL</span>
                     <p className="text-white font-black">{anime.year}</p>
                  </div>
                  <div className="space-y-1">
                     <span className="text-[9px] text-gray-500 font-bold uppercase">PUAN</span>
                     <p className="text-brand-red font-black">★ {anime.score}</p>
                  </div>
               </div>
               <div className="flex flex-wrap gap-2 mt-6">
                  {anime.genres.map(g => <span key={g} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[8px] font-black text-gray-400 uppercase">{g}</span>)}
               </div>
            </div>

            <section className="space-y-8 lg:space-y-12 mb-16 lg:mb-24 text-left">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">BÖLÜM <span className="text-brand-red">LİSTESİ</span></h3>
                  
                  {/* Season Selector - Only show if multiple seasons */}
                  {seasonNumbers.length > 1 && (
                    <div className="flex bg-brand-dark/50 p-1.5 rounded-2xl border border-white/10 overflow-x-auto max-w-full">
                      {seasonNumbers.map(seasonNum => (
                        <button 
                          key={seasonNum} 
                          onClick={() => {
                            setSelectedSeasonNumber(seasonNum);
                            setSearchParams({ season: String(seasonNum) });
                          }} 
                          className={`px-4 lg:px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedSeasonNumber === seasonNum ? 'bg-brand-red text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                          SEZON {seasonNum}
                        </button>
                      ))}
                    </div>
                  )}
               </div>

               <div className="flex flex-col gap-2 overflow-y-auto overflow-x-hidden max-h-[520px] pr-1 min-w-0 w-full max-w-full">
                  {episodesLoading ? (
                    <div className="w-full text-center text-gray-500 text-xs font-black uppercase tracking-widest py-8">
                      Yükleniyor...
                    </div>
                  ) : visibleEpisodes.length > 0 ? (
                    visibleEpisodes.map(ep => {
                      const seasonNum = ep.season_number || selectedSeasonNumber || 1;
                      return (
                        <Link 
                          key={`${ep.id}-${ep.episode_number}`} 
                          to={`/watch/${anime.id}?season=${seasonNum}&episode=${ep.episode_number}`} 
                          className="group w-full max-w-full bg-brand-surface rounded-lg border border-white/5 hover:border-brand-red/40 transition-all flex items-center gap-2.5 px-3 py-2 min-h-[56px] hover:bg-white/[0.02] flex-shrink-0"
                        >
                          <div className="w-7 h-7 bg-black/40 rounded-md flex items-center justify-center text-brand-red font-black text-[10px] italic group-hover:bg-brand-red group-hover:text-white transition-all shadow-inner flex-shrink-0">
                            {ep.episode_number}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-[9px] font-black text-white uppercase tracking-tight truncate group-hover:text-brand-red transition-colors leading-tight">{ep.title || `Bölüm ${ep.episode_number}`}</p>
                            <p className="text-[7px] font-bold text-gray-600 uppercase mt-0.5">24 DK</p>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="w-full text-center text-gray-500 text-xs font-black uppercase tracking-widest py-8">
                      Yakında
                    </div>
                  )}
               </div>
            </section>

            <section className="space-y-8 lg:space-y-12 text-left">
               <div className="flex justify-between items-end">
                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">BENZER <span className="text-brand-red">İÇERİKLER</span></h3>
               </div>
               
               <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-10 scrollbar-hide snap-x -mx-4 px-4 lg:mx-0 lg:px-0">
                  {similarAnimes?.map(sim => (
                    <div key={sim.id} className="w-36 lg:w-48 flex-shrink-0 snap-start">
                        <AnimeCard anime={sim} />
                    </div>
                  ))}
               </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetail;
