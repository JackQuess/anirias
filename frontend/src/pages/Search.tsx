import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, TrendingUp } from 'lucide-react';
import AnimeCard from '@/components/AnimeCard';
import { db } from '@/services/db';
import { getDisplayTitle } from '@/utils/title';
import type { Anime } from '@/types';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const all = await db.getAllAnimes('view_count', 2000);
        const list = all || [];
        if (query.trim().length > 2) {
          const q = query.trim().toLowerCase();
          setResults(
            list.filter((a) => getDisplayTitle(a.title).toLowerCase().includes(q))
          );
        } else {
          setResults(list.slice(0, 18));
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[Search]', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="min-h-screen bg-background pb-mobile-nav md:pb-12 font-inter">
      <div className="relative min-h-[220px] sm:h-[280px] md:h-[300px] py-10 sm:py-0 flex flex-col items-center justify-center px-3 sm:px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-600 rounded-full blur-[120px]" />
        </div>

        <div className="relative w-full max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-black text-center tracking-tighter text-white">
            Ne İzlemek İstersin?
          </h1>
          <div className="relative group">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              autoFocus
              placeholder="Anime, tür veya stüdyo ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-surface-elevated/40 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-xl text-white placeholder:text-muted focus:outline-none focus:border-primary focus:bg-surface-elevated/60 transition-all glass-panel shadow-2xl backdrop-blur-xl"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-muted">
            <span className="text-white/40">Popüler:</span>
            <button type="button" onClick={() => setQuery('Solo Leveling')} className="hover:text-primary transition-colors">
              Solo Leveling
            </button>
            <button type="button" onClick={() => setQuery('One Piece')} className="hover:text-primary transition-colors">
              One Piece
            </button>
            <button type="button" onClick={() => setQuery('Jujutsu Kaisen')} className="hover:text-primary transition-colors">
              Jujutsu Kaisen
            </button>
            <button type="button" onClick={() => setQuery('Demon Slayer')} className="hover:text-primary transition-colors">
              Demon Slayer
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 md:px-12">
        <div className="flex items-center gap-3 mb-8">
          {query.trim().length > 2 ? (
            <SearchIcon className="w-6 h-6 text-primary" />
          ) : (
            <TrendingUp className="w-6 h-6 text-primary" />
          )}
          <h2 className="text-2xl font-black tracking-tight text-white">
            {query.trim().length > 2 ? `"${query.trim()}" için Arama Sonuçları` : 'En Çok Arananlar'}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-white/5 rounded-md animate-pulse" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
            {results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center text-white">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <SearchIcon className="w-10 h-10 text-muted" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Sonuç Bulunamadı</h3>
            <p className="text-muted max-w-md">
              Aramanızla eşleşen bir içerik bulamadık. Lütfen farklı anahtar kelimeler deneyin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
