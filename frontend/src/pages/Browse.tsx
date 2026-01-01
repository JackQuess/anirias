
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { useSearchParams } from 'react-router-dom';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import AnimeCard from '../components/AnimeCard';
import { getDisplayTitle } from '@/utils/title';
import { translateGenre, translateGenreToEnglish } from '@/utils/genreTranslations';

const Browse: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialGenre = searchParams.get('genre') || 'Hepsi';
  
  // PERFORMANCE FIX: Fetch with reasonable limit for Browse page
  // Reduced from 200 to 100 to improve initial load time (-50% payload)
  // If catalog grows beyond this, implement server-side filtering/pagination
  const { data: allAnimes, loading, error, reload } = useLoad(() => db.getAllAnimes('created_at', 100));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [selectedSort, setSelectedSort] = useState<'popular' | 'newest' | 'score'>('popular');
  const [selectedYear, setSelectedYear] = useState<string>('Hepsi');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24); // Initial cards to render
  const observerTarget = useRef<HTMLDivElement>(null);

  // PERFORMANCE FIX: Debounce search input to prevent excessive filtering
  // Delays filter recalculation by 300ms after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // PERFORMANCE FIX: Intersection observer for progressive card rendering
  // Only render visible cards to reduce initial DOM load
  // Pattern reused from NewEpisodes.tsx
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredResults.length) {
          setVisibleCount(prev => Math.min(prev + 24, filteredResults.length));
        }
      },
      { threshold: 0.1, rootMargin: '400px' } // Trigger 400px before reaching bottom
    );

    const currentTarget = observerTarget.current;
    if (currentTarget && filteredResults.length > visibleCount) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [visibleCount, filteredResults.length]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(24);
  }, [debouncedSearch, selectedGenre, selectedYear, selectedSort]);

  const genres = useMemo(() => {
    // Standart anime türleri listesi (Mock veri olmasa bile görünsün)
    const defaultGenres = [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 
      'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 
      'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
    ];
    const s = new Set<string>(['Hepsi', ...defaultGenres]);
    allAnimes?.forEach(a => a.genres?.forEach(g => s.add(g)));
    
    // Türkçe'ye çevir ve sırala
    return Array.from(s).map(g => g === 'Hepsi' ? g : translateGenre(g)).sort();
  }, [allAnimes]);

  const years = useMemo(() => {
    const s = new Set<string>(['Hepsi']);
    allAnimes?.forEach(a => a.year && s.add(a.year.toString()));
    return Array.from(s).sort((a,b) => b.localeCompare(a));
  }, [allAnimes]);

  const filteredResults = useMemo(() => {
    if (!allAnimes) return [];
    
    let results = allAnimes.filter(anime => {
      const title = getDisplayTitle(anime.title).toLowerCase();
      const matchesSearch = title.includes(debouncedSearch.toLowerCase());
      
      // Seçilen tür Türkçe ise İngilizce'ye çevir (database'de İngilizce tutuluyor)
      const genreToMatch = selectedGenre === 'Hepsi' ? 'Hepsi' : translateGenreToEnglish(selectedGenre);
      const matchesGenre = genreToMatch === 'Hepsi' || anime.genres?.includes(genreToMatch);
      
      const matchesYear = selectedYear === 'Hepsi' || anime.year.toString() === selectedYear;
      return matchesSearch && matchesGenre && matchesYear;
    });

    // Sorting
    results.sort((a, b) => {
      if (selectedSort === 'popular') return (b.view_count || 0) - (a.view_count || 0);
      if (selectedSort === 'newest') return b.year - a.year;
      if (selectedSort === 'score') return b.score - a.score;
      return 0;
    });

    return results;
  }, [allAnimes, debouncedSearch, selectedGenre, selectedYear, selectedSort]);

  if (loading) return (
    <div className="min-h-screen pt-32 px-10 space-y-12 bg-brand-black">
      <LoadingSkeleton type="banner" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
        <LoadingSkeleton type="card" count={5} />
      </div>
    </div>
  );

  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  // Popüler hızlı türler - Türkçe gösterilecek
  const popularQuickGenres = ['Action', 'Romance', 'Sci-Fi', 'Fantasy', 'Sports', 'Slice of Life'].map(translateGenre);

  return (
    <div className="min-h-screen bg-brand-black pb-40">
      {/* Sticky Filter Bar */}
      <div className={`fixed top-0 left-0 right-0 z-[120] transition-all duration-500 px-4 md:px-8 py-4 ${scrolled ? 'bg-brand-black/95 backdrop-blur-2xl border-b border-white/5 shadow-2xl pt-4' : 'bg-transparent pt-24 lg:pt-32'}`}>
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-grow w-full">
              <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input 
                type="text"
                placeholder="ARADIĞIN ANİMEYİ BUL..."
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] pl-16 pr-8 py-4 text-[11px] font-black text-white uppercase tracking-[0.2em] outline-none focus:border-brand-red focus:bg-white/10 transition-all shadow-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
               <select 
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-[2rem] px-8 py-4 text-[10px] font-black text-gray-300 uppercase tracking-widest outline-none focus:border-brand-red appearance-none cursor-pointer hover:bg-white/10"
               >
                  <option value="popular">POPÜLER</option>
                  <option value="newest">EN YENİ</option>
                  <option value="score">PUAN</option>
               </select>

               <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] border transition-all text-[10px] font-black uppercase tracking-[0.2em] shadow-xl ${isFilterOpen ? 'bg-brand-red border-brand-red text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
              >
                FİLTRELER
                <svg className={`w-3 h-3 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
          </div>
          
          {/* Quick Categories Row (Visible when filters closed) */}
          <div className={`overflow-hidden transition-all duration-300 ${isFilterOpen ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100 mt-4'}`}>
             <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                <button 
                   onClick={() => setSelectedGenre('Hepsi')}
                   className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedGenre === 'Hepsi' ? 'bg-brand-red border-brand-red text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                >
                   HEPSİ
                </button>
                {popularQuickGenres.map(g => (
                   <button 
                      key={g}
                      onClick={() => setSelectedGenre(g)}
                      className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedGenre === g ? 'bg-brand-red border-brand-red text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                   >
                      {g}
                   </button>
                ))}
             </div>
          </div>

          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isFilterOpen ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
             <div className="bg-brand-dark/90 border border-white/10 rounded-[3rem] p-8 space-y-8 shadow-2xl backdrop-blur-xl">
                <div>
                   <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 border-l-4 border-brand-red pl-3">TÜM TÜRLER</h4>
                   <div className="flex flex-wrap gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {genres.map(genre => (
                        <button 
                          key={genre}
                          onClick={() => setSelectedGenre(genre)}
                          className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedGenre === genre ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-gray-500 hover:text-white bg-black/40 border border-white/5'}`}
                        >
                          {genre}
                        </button>
                      ))}
                   </div>
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 border-l-4 border-brand-red pl-3">YIL</h4>
                   <div className="flex flex-wrap gap-3">
                      {years.map(year => (
                        <button 
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedYear === year ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-gray-500 hover:text-white bg-black/40 border border-white/5'}`}
                        >
                          {year}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 pt-64 lg:pt-80">
         <div className="flex flex-col md:flex-row items-baseline justify-between mb-16 gap-4 border-b border-white/5 pb-8">
           <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter">
              {selectedGenre === 'Hepsi' ? 'TÜM' : selectedGenre} <span className="text-brand-red">İÇERİKLER</span>
           </h2>
           <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] bg-white/5 px-6 py-3 rounded-full border border-white/5">
             {filteredResults.length} SONUÇ GÖSTERİLİYOR
           </span>
         </div>
         
         {filteredResults.length > 0 ? (
           <>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
               {filteredResults.slice(0, visibleCount).map(anime => (
                 <AnimeCard key={anime.id} anime={anime} />
               ))}
             </div>
             
             {/* Intersection observer target for progressive loading */}
             {visibleCount < filteredResults.length && (
               <div ref={observerTarget} className="h-4 mt-12" />
             )}
           </>
         ) : (
           <div className="py-40 text-center bg-brand-dark/30 rounded-[4rem] border border-dashed border-white/5 flex flex-col items-center animate-fade-in-up">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 animate-pulse">
                 <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
              <h3 className="text-3xl font-black text-white uppercase italic tracking-widest mb-2">HİÇBİR ŞEY BULAMADIK</h3>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] max-w-md">
                "{selectedGenre}" türünde veya aradığın kriterde anime henüz eklenmemiş olabilir.
              </p>
              <button 
                 onClick={() => {setSelectedGenre('Hepsi'); setSelectedYear('Hepsi'); setSearchQuery('');}}
                 className="mt-8 text-brand-red text-xs font-black uppercase tracking-widest hover:text-white transition-colors border-b border-brand-red hover:border-white pb-1"
              >
                 FİLTRELERİ SIFIRLA
              </button>
           </div>
         )}
      </div>
    </div>
  );
};

export default Browse;
