import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SortAsc, ChevronDown } from 'lucide-react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import AnimeCard from '@/components/AnimeCard';
import PageHero from '@/components/cinematic/PageHero';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';
import type { Anime } from '@/types';

const SORT_OPTIONS = [
  { value: 'view_count' as const, label: 'Popülerlik' },
  { value: 'score' as const, label: 'Puan' },
  { value: 'created_at' as const, label: 'Çıkış Tarihi' },
];

const STATUS_OPTIONS = [
  { value: 'ALL' as const, label: 'Tümü' },
  { value: 'RELEASING' as const, label: 'Devam Ediyor' },
  { value: 'FINISHED' as const, label: 'Tamamlandı' },
];

/** Zip katalog türleri (Türkçe) → DB genres İngilizce */
const ZIP_GENRES: { label: string; en: string | null }[] = [
  { label: 'Tümü', en: null },
  { label: 'Aksiyon', en: 'Action' },
  { label: 'Macera', en: 'Adventure' },
  { label: 'Dram', en: 'Drama' },
  { label: 'Fantastik', en: 'Fantasy' },
  { label: 'Korku', en: 'Horror' },
  { label: 'Komedi', en: 'Comedy' },
  { label: 'Romantik', en: 'Romance' },
  { label: 'Bilim Kurgu', en: 'Sci-Fi' },
];

const Browse: React.FC = () => {
  const [searchParams] = useSearchParams();
  const genreParam = searchParams.get('genre');

  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['value']>('created_at');
  const [filterStatus, setFilterStatus] = useState<(typeof STATUS_OPTIONS)[number]['value']>('ALL');
  const [selectedLabel, setSelectedLabel] = useState('Tümü');

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!genreParam) return;
    const normalized = genreParam.trim();
    const found = ZIP_GENRES.find((g) => g.label.toLowerCase() === normalized.toLowerCase());
    if (found) setSelectedLabel(found.label);
  }, [genreParam]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setIsSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const fetcher = useCallback(() => db.getAllAnimes(sortBy, 2000), [sortBy]);
  const { data: rawList, loading, error, reload } = useLoad(fetcher, [sortBy]);

  const selectedEn = useMemo(
    () => ZIP_GENRES.find((g) => g.label === selectedLabel)?.en ?? null,
    [selectedLabel]
  );

  const filteredItems = useMemo(() => {
    const list = rawList || [];
    const cy = new Date().getFullYear();

    return list.filter((anime: Anime) => {
      if (selectedEn) {
        const ok = anime.genres?.some((g) => g.toLowerCase() === selectedEn.toLowerCase());
        if (!ok) return false;
      }
      if (filterStatus === 'RELEASING') {
        const y = anime.year || 0;
        if (y && y < cy - 2) return false;
      }
      if (filterStatus === 'FINISHED') {
        const y = anime.year || 0;
        if (!y || y >= cy - 1) return false;
      }
      return true;
    });
  }, [rawList, selectedEn, filterStatus]);

  const pageInfo = {
    title: 'Katalog',
    description:
      'Binlerce anime serisi arasından dilediğini seç. Aksiyondan romantizme, her zevke uygun içerikler burada.',
    image: 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=1920',
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  return (
    <div className="min-h-screen bg-background pb-mobile-nav md:pb-12 font-inter">
      <div className="px-0 md:px-0">
        <PageHero
          title={pageInfo.title}
          description={pageInfo.description}
          image={pageInfo.image}
          className="rounded-none mb-0 h-[400px] md:h-[500px]"
        />
      </div>

      <div className="px-3 sm:px-4 md:px-12 -mt-12 sm:-mt-16 md:-mt-20 relative z-20">
        <div className="glass-panel p-4 sm:p-6 rounded-xl sm:rounded-2xl mb-8 sm:mb-12 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6 shadow-2xl relative z-30">
          <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {ZIP_GENRES.map(({ label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedLabel(label)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  selectedLabel === label
                    ? 'bg-primary text-white'
                    : 'bg-white/5 hover:bg-white/10 text-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 text-muted text-sm font-bold px-4 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors w-full md:w-auto justify-between md:justify-start"
              >
                <Filter className="w-4 h-4 shrink-0" />
                <span>Durum: {STATUS_OPTIONS.find((o) => o.value === filterStatus)?.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterOpen ? (
                <div className="absolute top-full right-0 mt-2 w-48 bg-surface-elevated border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFilterStatus(option.value);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        filterStatus === option.value
                          ? 'bg-primary/20 text-primary font-bold'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 text-muted text-sm font-bold px-4 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors w-full md:w-auto justify-between md:justify-start"
              >
                <SortAsc className="w-4 h-4 shrink-0" />
                <span>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform shrink-0 ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSortOpen ? (
                <div className="absolute top-full right-0 mt-2 w-48 bg-surface-elevated border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        sortBy === option.value
                          ? 'bg-primary/20 text-primary font-bold'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSkeleton type="card" count={8} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-8 relative z-10">
            {filteredItems.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}

        {!loading && filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-white">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Filter className="w-10 h-10 text-muted" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Sonuç Bulunamadı</h3>
            <p className="text-muted">Filtrelerinizi değiştirerek tekrar deneyebilirsiniz.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Browse;
