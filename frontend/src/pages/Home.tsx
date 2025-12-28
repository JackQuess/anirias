
import React, { useMemo, useState, useEffect } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { useAuth } from '@/services/auth';
import { Link } from 'react-router-dom';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import AnimeCard from '../components/AnimeCard';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';

const Home: React.FC = () => {
  const { user } = useAuth();
  
  // Data Loaders
  const { data: featured, loading: featLoading, error: featError, reload } = useLoad(db.getFeaturedAnimes);
  const { data: continueWatching } = useLoad(() => user ? db.getContinueWatching(user.id) : Promise.resolve([]), [user]);
  const { data: allAnimes } = useLoad(() => db.getAllAnimes('view_count'));
  const { data: latestEpisodes } = useLoad(() => db.getLatestEpisodes(12)); // Limit to 12 for home page
  const { data: myWatchlist } = useLoad(() => user ? db.getWatchlist(user.id) : Promise.resolve([]), [user]);
  
  // Reuse allAnimes for newSeasons (no need for duplicate request)
  const newSeasons = useMemo(() => {
    if (!allAnimes) return [];
    return [...allAnimes].sort((a, b) => {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return bDate - aDate;
    });
  }, [allAnimes]);

  // Hero Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlaying || !featured || featured.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % featured.length);
    }, 5000); // 5 seconds per slide (Faster)
    return () => clearInterval(interval);
  }, [isAutoPlaying, featured, currentSlide]);

  const heroAnime = featured?.[currentSlide];
  const nextSlideIndex = featured ? (currentSlide + 1) % featured.length : 0;
  const nextAnime = featured?.[nextSlideIndex];
  const hasMultipleSlides = featured && featured.length > 1;

  const getTitle = (anime: any) => getDisplayTitle(anime?.title);

  const top10 = useMemo(() => allAnimes?.slice(0, 10) || [], [allAnimes]);
  const favorites = useMemo(() => myWatchlist?.filter(w => ['watching', 'planning'].includes(w.status)) || [], [myWatchlist]);

  return (
    <div className="min-h-screen bg-brand-black pb-32">
      {/* Cinematic Hero Slider */}
      <section 
        className="relative h-[85vh] md:h-[95vh] w-full overflow-hidden flex items-end group"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {featLoading ? (
           <div className="absolute inset-0 bg-brand-surface animate-pulse" />
        ) : heroAnime ? (
          <>
             {/* Background Layers */}
             {featured?.map((anime, index) => (
                <div 
                  key={anime.id} 
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                   <img 
                     src={proxyImage(anime.banner_image || anime.cover_image || '')} 
                     className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${index === currentSlide ? 'scale-110' : 'scale-100'}`}
                     referrerPolicy="no-referrer"
                     alt="hero_bg"
                     onError={(e) => {
                       const fallback = anime.banner_image || anime.cover_image || 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=2000&auto=format&fit=crop';
                       if ((e.target as HTMLImageElement).src !== fallback) {
                         (e.target as HTMLImageElement).src = fallback;
                       }
                     }}
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/60 md:via-brand-black/40 to-transparent" />
                   <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/50 to-transparent" />
                </div>
             ))}
            
            {/* Content Content */}
            <div className="relative z-20 max-w-[1600px] mx-auto px-4 md:px-8 pb-24 md:pb-32 w-full flex flex-col md:flex-row items-end justify-between gap-10">
              <div className="flex-1 animate-fade-in-up">
                {/* Meta Tags */}
                <div key={`meta-${heroAnime.id}`} className="flex flex-wrap items-center gap-3 mb-4 md:mb-6 animate-fade-in">
                  <span className="px-3 py-1.5 bg-brand-red text-white text-[9px] md:text-[10px] font-black rounded-lg uppercase tracking-widest text-glow shadow-lg shadow-brand-red/30 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                     VİTRİN ÖZEL
                  </span>
                  <div className="flex items-center gap-2 md:gap-3 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
                     <span className="text-yellow-500 font-black italic text-base md:text-lg">★ {heroAnime.score}</span>
                     <span className="text-white/20">|</span>
                     <span className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest">{heroAnime.genres?.slice(0,3).join(' • ')}</span>
                     <span className="text-white/20">|</span>
                     <span className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest">{heroAnime.year}</span>
                  </div>
                </div>
                
                {/* Title */}
                <h1 key={`title-${heroAnime.id}`} className="text-5xl md:text-8xl lg:text-9xl font-black text-white mb-6 md:mb-8 tracking-tighter max-w-5xl uppercase italic leading-[0.9] drop-shadow-2xl animate-fade-in-right">
                  {getTitle(heroAnime)}
                </h1>
                
                {/* Description */}
                <p key={`desc-${heroAnime.id}`} className="text-gray-200 text-sm md:text-lg max-w-2xl mb-8 md:mb-12 line-clamp-3 font-medium opacity-90 leading-relaxed drop-shadow-md animate-fade-in delay-75">
                  {heroAnime.description?.replace(/<[^>]*>/g, '')}
                </p>
                
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                  <Link to={`/watch/${heroAnime.id}?season=1&episode=1`} className="bg-brand-red hover:bg-brand-redHover text-white px-8 md:px-12 py-4 md:py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 transition-all uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-red/40 group/btn">
                    <div className="w-8 h-8 bg-white text-brand-red rounded-full flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                       <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    HEMEN İZLE
                  </Link>
                  <Link to={`/anime/${heroAnime.id}`} className="bg-white/10 backdrop-blur-xl border border-white/10 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-white/20 transition-all uppercase text-xs tracking-[0.2em]">
                    DETAYLAR
                  </Link>
                </div>
              </div>

              {/* Slider Controls (Desktop & Mobile) */}
              {hasMultipleSlides && (
                <div className="flex flex-col items-end gap-6 min-w-[300px] w-full md:w-auto">
                   {/* Next Up Preview (Desktop Only) */}
                   {nextAnime && (
                     <button 
                        onClick={() => setCurrentSlide(nextSlideIndex)}
                        className="hidden lg:block group/next relative w-64 h-36 rounded-2xl overflow-hidden border-2 border-white/10 hover:border-brand-red transition-all cursor-pointer shadow-2xl"
                     >
                        <img 
                          src={proxyImage(nextAnime.banner_image || nextAnime.cover_image || '')} 
                          className="w-full h-full object-cover opacity-60 group-hover/next:opacity-100 transition-opacity" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const fallback = nextAnime.banner_image || nextAnime.cover_image || 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=2000&auto=format&fit=crop';
                            if ((e.target as HTMLImageElement).src !== fallback) {
                              (e.target as HTMLImageElement).src = fallback;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                           <p className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-1">SIRADAKİ</p>
                           <p className="text-white font-black text-sm uppercase italic truncate">{getTitle(nextAnime)}</p>
                        </div>
                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 h-1 bg-brand-red" style={{ width: isAutoPlaying ? '100%' : '0%', transition: isAutoPlaying ? 'width 5000ms linear' : 'none' }} />
                     </button>
                   )}
                   
                   {/* Dots (Visible on Mobile too) */}
                   <div className="flex gap-3 justify-center md:justify-end w-full">
                      {featured?.map((_, idx) => (
                         <button 
                            key={idx} 
                            onClick={() => setCurrentSlide(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 shadow-lg ${idx === currentSlide ? 'w-8 bg-brand-red' : 'w-2 bg-white/40 hover:bg-white/80'}`} 
                         />
                      ))}
                   </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-16 md:space-y-24 -mt-12 md:-mt-20 relative z-20">
        
        {/* 1. Continue Watching (Priority) */}
        {user && continueWatching && continueWatching.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-end justify-between mb-6 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic border-l-4 border-brand-red pl-4 md:pl-5">İzlemeye <span className="text-brand-red">Devam Et</span></h2>
            </div>
            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-8 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
              {continueWatching.map((item) => {
                const percent = Math.min((item.progress_seconds / item.duration_seconds) * 100, 100);
                const remaining = Math.max(0, Math.floor((item.duration_seconds - item.progress_seconds) / 60));
                
                return (
                  <Link key={item.episode_id} to={`/watch/${item.anime_id}?season=${item.episode?.season_number || 1}&episode=${item.episode?.episode_number || 1}`} className="group relative flex-shrink-0 w-64 md:w-80 snap-start">
                    <div className="aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden bg-brand-surface border border-white/5 group-hover:border-brand-red/50 transition-all shadow-xl relative">
                      <img
                        src={proxyImage(item.anime?.cover_image || '')}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-80 md:opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        onError={(e) => {
                          const fallback = item.anime?.cover_image || '';
                          if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                            (e.target as HTMLImageElement).src = fallback;
                          }
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-brand-black/10 md:bg-brand-black/20 backdrop-blur-[1px]">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-brand-red text-white rounded-full flex items-center justify-center shadow-2xl transform scale-90 md:scale-50 group-hover:scale-100 transition-transform duration-300">
                          <svg className="w-5 h-5 md:w-6 md:h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                        <div className="h-full bg-brand-red shadow-[0_0_10px_#E50914]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <div className="mt-4 px-1">
                      <h3 className="text-white font-black text-xs md:text-sm truncate uppercase tracking-tight">{getTitle(item.anime)}</h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Bölüm {item.episode?.episode_number}</p>
                        <p className="text-[8px] md:text-[9px] text-brand-red font-black uppercase tracking-widest">{remaining} dk kaldı</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. Trending Top 10 */}
        <section>
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic border-l-4 border-brand-red pl-4 md:pl-5">GÜNDEMDEKİ <span className="text-brand-red">TOP 10</span></h2>
          </div>
          <div className="flex gap-6 md:gap-10 overflow-x-auto pb-12 scrollbar-hide snap-x px-2 md:px-4 -mx-4 md:mx-0">
            {top10.map((anime, idx) => (
              <div key={anime.id} className="w-48 md:w-64 flex-shrink-0 snap-start pl-8 md:pl-12">
                <AnimeCard anime={anime} rank={idx + 1} />
              </div>
            ))}
          </div>
        </section>

        {/* 3. Popular Content */}
        <section>
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic border-l-4 border-brand-red pl-4 md:pl-5">Popüler <span className="text-brand-red">İçerikler</span></h2>
            <Link to="/browse" className="text-[9px] md:text-[10px] font-black text-gray-500 hover:text-brand-red transition-all uppercase tracking-[0.3em] bg-white/5 px-4 md:px-6 py-2 md:py-3 rounded-full border border-white/5 hover:bg-white/10">TÜMÜNÜ GÖR</Link>
          </div>

          {featLoading && <LoadingSkeleton type="card" count={5} />}
          {featError && <ErrorState message={featError.message} onRetry={reload} />}
          {!featLoading && featured && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
              {featured.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          )}
        </section>

        {/* 4. My Favorites */}
        {user && favorites.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-8 md:mb-10">
               <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic border-l-4 border-brand-red pl-4 md:pl-5">FAVORİ <span className="text-brand-red">LİSTEM</span></h2>
               <Link to="/profile" className="text-[9px] md:text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.2em]">TÜMÜNÜ GÖR</Link>
            </div>
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-10 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
               {favorites.map((entry) => (
                 entry.anime && <div key={entry.id} className="w-36 md:w-48 flex-shrink-0"><AnimeCard anime={entry.anime} /></div>
               ))}
            </div>
          </section>
        )}

        {/* 5. New Episodes */}
        <section>
          <div className="flex items-end justify-between mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic border-l-4 border-brand-red pl-4 md:pl-5">YENİ <span className="text-brand-red">BÖLÜMLER</span></h2>
            <Link to="/new-episodes" className="text-[9px] md:text-[10px] font-black text-gray-500 hover:text-brand-red transition-all uppercase tracking-[0.3em] bg-white/5 px-4 md:px-6 py-2 md:py-3 rounded-full border border-white/5 hover:bg-white/10">TÜMÜNÜ GÖR</Link>
          </div>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-10 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
            {latestEpisodes?.map((ep) => (
              ep.anime && (
                <div key={ep.id} className="w-48 md:w-64 flex-shrink-0 snap-start">
                   <AnimeCard anime={ep.anime} episode={ep} />
                </div>
              )
            ))}
            {(!latestEpisodes || latestEpisodes.length === 0) && <LoadingSkeleton type="card" count={4} />}
          </div>
        </section>

        {/* 6. New Seasons */}
        <section>
           <div className="flex items-end justify-between mb-8 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic border-l-4 border-brand-red pl-4 md:pl-5">YENİ <span className="text-brand-red">SEZONLAR</span></h2>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {newSeasons?.slice(0, 5).map(anime => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
           </div>
        </section>

        {/* Genre Quick Discover */}
        <section className="bg-gradient-to-br from-brand-surface to-brand-black border border-white/5 rounded-[3rem] md:rounded-[4rem] p-8 md:p-16 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-brand-red/5 rounded-full blur-[80px] md:blur-[100px] pointer-events-none" />
           
           <div className="text-center mb-10 md:mb-16 relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter">TARZINI <span className="text-brand-red">KEŞFET</span></h2>
              <p className="text-gray-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] mt-4">Favori kategorinden hemen izlemeye başla</p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative z-10">
              {['AKSİYON', 'FANTASTİK', 'DRAM', 'DOĞAÜSTÜ'].map(genre => (
                <Link key={genre} to={`/browse?genre=${genre}`} className="group relative h-32 md:h-40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden flex items-center justify-center border border-white/5 hover:border-brand-red/50 transition-all bg-black/40">
                  <div className="absolute inset-0 bg-brand-red/0 group-hover:bg-brand-red/10 transition-all duration-500" />
                  <span className="relative z-10 text-lg md:text-xl font-black text-white italic tracking-widest group-hover:scale-110 transition-transform">{genre}</span>
                </Link>
              ))}
           </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
