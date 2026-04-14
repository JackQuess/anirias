import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SortAsc, ChevronDown } from 'lucide-react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import AnimeCard from '@/components/AnimeCard';
import PageHero from '@/components/cinematic/PageHero';
import { proxyImage } from '@/utils/proxyImage';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';
import type { Anime } from '@/types';

const SORT_OPTIONS = [
  { value: 'view_count' as const, label: 'Popülerlik' },
  { value: 'score' as const, label: 'Puan' },
  { value: 'created_at' as const, label: 'Eklenme tarihi' },
];

const STATUS_OPTIONS = [
  { value: 'ALL' as const, label: 'Tümü' },
  { value: 'RELEASING' as const, label: 'Devam eden / yeni' },
  { value: 'FINISHED' as const, label: 'Tamamlanmış' },
];

const YEAR_PRESETS = [
  { value: 'all' as const, label: 'Tüm yıllar' },
  { value: '2020plus' as const, label: '2020 ve sonrası' },
  { value: '2010s' as const, label: '2010–2019' },
  { value: '2000s' as const, label: '2000–2009' },
  { value: '1990s' as const, label: '1990–1999' },
  { value: 'older' as const, label: '1990 öncesi' },
];

const MIN_SCORE_OPTIONS = [
  { value: 0, label: 'Tüm puanlar' },
  { value: 6, label: 'En az 6' },
  { value: 7, label: 'En az 7' },
  { value: 8, label: 'En az 8' },
];

/** AniList format; TV_GROUP = TV + TV_SHORT */
const FORMAT_OPTIONS = [
  { value: 'ALL' as const, label: 'Tüm formatlar' },
  { value: 'TV_GROUP' as const, label: 'TV dizileri (tümü)' },
  { value: 'TV' as const, label: 'TV' },
  { value: 'TV_SHORT' as const, label: 'Kısa TV' },
  { value: 'MOVIE' as const, label: 'Film' },
  { value: 'OVA' as const, label: 'OVA' },
  { value: 'ONA' as const, label: 'ONA' },
  { value: 'SPECIAL' as const, label: 'Özel bölüm' },
  { value: 'MUSIC' as const, label: 'Müzik' },
];

type FormatFilterKey = (typeof FORMAT_OPTIONS)[number]['value'];

/** Zip katalog türleri (Türkçe) → DB’deki İngilizce genre ile eşlenir */
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
  { label: 'İsekai', en: 'Isekai' },
  { label: 'Gizem', en: 'Mystery' },
  { label: 'Mecha', en: 'Mecha' },
  { label: 'Yaşamdan kesit', en: 'Slice of Life' },
  { label: 'Spor', en: 'Sports' },
  { label: 'Shounen', en: 'Shounen' },
  { label: 'Seinen', en: 'Seinen' },
  { label: 'Doğaüstü', en: 'Supernatural' },
  { label: 'Gerilim', en: 'Thriller' },
];

type SortKey = (typeof SORT_OPTIONS)[number]['value'];
type StatusKey = (typeof STATUS_OPTIONS)[number]['value'];
type YearPreset = (typeof YEAR_PRESETS)[number]['value'];

function normGenre(s: string) {
  return s.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** DB genre satırı seçilen İngilizce etiketle uyumlu mu (tire/boşluk farklarını yok sayar) */
function animeMatchesEnglishGenre(genres: string[] | undefined, targetEn: string): boolean {
  if (!genres?.length) return false;
  const target = normGenre(targetEn);
  return genres.some((g) => {
    const ng = normGenre(g);
    if (ng === target) return true;
    if (targetEn === 'Sci-Fi') {
      return (
        ng === 'sci fi' ||
        ng.includes('sci fi') ||
        (ng.includes('science') && ng.includes('fiction'))
      );
    }
    if (targetEn === 'Slice of Life') {
      return ng.includes('slice') && ng.includes('life');
    }
    return false;
  });
}

function parseSort(v: string | null): SortKey {
  return SORT_OPTIONS.some((o) => o.value === v) ? (v as SortKey) : 'created_at';
}

function parseStatus(v: string | null): StatusKey {
  return STATUS_OPTIONS.some((o) => o.value === v) ? (v as StatusKey) : 'ALL';
}

function parseGenreLabel(v: string | null): string {
  if (!v) return 'Tümü';
  const decoded = decodeURIComponent(v.trim());
  const lower = decoded.toLowerCase();
  const byTr = ZIP_GENRES.find((g) => g.label.toLowerCase() === lower);
  if (byTr) return byTr.label;
  const byEn = ZIP_GENRES.find((g) => g.en && normGenre(g.en) === normGenre(decoded));
  if (byEn) return byEn.label;
  return 'Tümü';
}

const KNOWN_GENRE_EN = new Set(
  ZIP_GENRES.map((g) => g.en).filter((e): e is string => Boolean(e))
);

/** URL: `genres=Action,Romance` veya eski tek `genre` (Türkçe/İngilizce etiket) */
function parseSelectedGenresEn(sp: URLSearchParams): string[] {
  const raw = sp.get('genres');
  if (raw && raw.trim()) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];
    for (const p of parts) {
      const decoded = decodeURIComponent(p);
      if (KNOWN_GENRE_EN.has(decoded)) {
        out.push(decoded);
        continue;
      }
      const byNorm = ZIP_GENRES.find((g) => g.en && normGenre(g.en) === normGenre(decoded));
      if (byNorm?.en) out.push(byNorm.en);
    }
    return [...new Set(out)];
  }
  const legacy = sp.get('genre');
  if (!legacy) return [];
  const label = parseGenreLabel(legacy);
  const en = ZIP_GENRES.find((g) => g.label === label)?.en;
  return en ? [en] : [];
}

function parseFormatFilter(v: string | null): FormatFilterKey {
  return FORMAT_OPTIONS.some((o) => o.value === v) ? (v as FormatFilterKey) : 'ALL';
}

function animeMatchesFormatFilter(anime: Anime, filter: FormatFilterKey): boolean {
  if (filter === 'ALL') return true;
  const f = (anime.format || '').toUpperCase().trim();
  if (!f) return false;
  if (filter === 'TV_GROUP') return f === 'TV' || f === 'TV_SHORT';
  return f === filter;
}

function parseYearPreset(v: string | null): YearPreset {
  return YEAR_PRESETS.some((y) => y.value === v) ? (v as YearPreset) : 'all';
}

function parseMinScore(v: string | null): number {
  const n = Number(v);
  return MIN_SCORE_OPTIONS.some((o) => o.value === n) ? n : 0;
}

function animeMatchesYear(anime: Anime, preset: YearPreset): boolean {
  if (preset === 'all') return true;
  const y = anime.year;
  if (!y || y < 1900) return true;
  switch (preset) {
    case '2020plus':
      return y >= 2020;
    case '2010s':
      return y >= 2010 && y <= 2019;
    case '2000s':
      return y >= 2000 && y <= 2009;
    case '1990s':
      return y >= 1990 && y <= 1999;
    case 'older':
      return y < 1990;
    default:
      return true;
  }
}

const Browse: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const sortBy = useMemo(() => parseSort(searchParams.get('sort')), [searchParams]);
  const filterStatus = useMemo(() => parseStatus(searchParams.get('status')), [searchParams]);
  const selectedGenresEn = useMemo(() => parseSelectedGenresEn(searchParams), [searchParams]);
  const formatFilter = useMemo(() => parseFormatFilter(searchParams.get('format')), [searchParams]);
  const yearPreset = useMemo(() => parseYearPreset(searchParams.get('year')), [searchParams]);
  const minScore = useMemo(() => parseMinScore(searchParams.get('minScore')), [searchParams]);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);

  const patchParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(patch)) {
            if (val === undefined || val === null || val === '') n.delete(key);
            else n.set(key, val);
          }
          return n;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (sortRef.current && !sortRef.current.contains(t)) setIsSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(t)) setIsFilterOpen(false);
      if (yearRef.current && !yearRef.current.contains(t)) setIsYearOpen(false);
      if (scoreRef.current && !scoreRef.current.contains(t)) setIsScoreOpen(false);
      if (formatRef.current && !formatRef.current.contains(t)) setIsFormatOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const fetcher = useCallback(() => db.getAllAnimes(sortBy, 2000), [sortBy]);
  const { data: rawList, loading, error, reload } = useLoad(fetcher, [sortBy]);

  const heroBackdropUrls = useMemo(() => {
    const list = rawList || [];
    const sorted = [...list].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const a of sorted) {
      const raw = a.banner_image || a.cover_image;
      if (!raw) continue;
      const u = proxyImage(raw);
      if (!u || u.startsWith('data:')) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      if (urls.length >= 12) break;
    }
    return urls;
  }, [rawList]);

  const filteredItems = useMemo(() => {
    const list = rawList || [];
    const cy = new Date().getFullYear();

    return list.filter((anime: Anime) => {
      if (selectedGenresEn.length > 0) {
        const any = selectedGenresEn.some((en) => animeMatchesEnglishGenre(anime.genres, en));
        if (!any) return false;
      }

      if (!animeMatchesFormatFilter(anime, formatFilter)) return false;

      if (filterStatus === 'RELEASING') {
        const y = anime.year || 0;
        if (y && y < cy - 3) return false;
      }
      if (filterStatus === 'FINISHED') {
        const y = anime.year || 0;
        if (!y || y >= cy - 1) return false;
      }

      if (!animeMatchesYear(anime, yearPreset)) return false;

      if (minScore > 0) {
        const sc = anime.score ?? 0;
        if (sc > 0 && sc < minScore) return false;
      }

      return true;
    });
  }, [rawList, selectedGenresEn, formatFilter, filterStatus, yearPreset, minScore]);

  const hasActiveFilters =
    selectedGenresEn.length > 0 ||
    formatFilter !== 'ALL' ||
    filterStatus !== 'ALL' ||
    yearPreset !== 'all' ||
    minScore > 0;

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const toggleGenrePill = (label: string) => {
    if (label === 'Tümü') {
      patchParams({ genres: null, genre: null });
      return;
    }
    const entry = ZIP_GENRES.find((g) => g.label === label);
    if (!entry?.en) return;
    const next = new Set(selectedGenresEn);
    if (next.has(entry.en)) next.delete(entry.en);
    else next.add(entry.en);
    const arr = [...next].sort((a, b) => a.localeCompare(b));
    if (arr.length === 0) patchParams({ genres: null, genre: null });
    else patchParams({ genres: arr.join(','), genre: null });
  };

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
          imageUrls={heroBackdropUrls.length > 0 ? heroBackdropUrls : undefined}
          className="rounded-none mb-0"
        />
      </div>

      <div className="px-3 sm:px-4 md:px-12 -mt-12 sm:-mt-16 md:-mt-20 relative z-20">
        <div className="relative mb-3 rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] via-[#101018]/95 to-[#08080c] shadow-[0_20px_60px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:mb-5">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/[0.06] blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col gap-3 p-3.5 sm:gap-4 sm:p-4 md:p-5">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Türler{' '}
              <span className="font-medium normal-case tracking-normal text-zinc-600">· birden fazla seçebilirsin</span>
            </p>
            <div className="relative">
              <div className="flex w-full snap-x snap-mandatory items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent] sm:gap-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15">
                {ZIP_GENRES.map(({ label, en }) => {
                  const active =
                    label === 'Tümü'
                      ? selectedGenresEn.length === 0
                      : Boolean(en && selectedGenresEn.includes(en));
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleGenrePill(label)}
                      className={`shrink-0 snap-start whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-all sm:px-3 sm:text-xs ${
                        active
                          ? 'border-primary/40 bg-primary/15 text-white shadow-[0_0_18px_-8px_rgba(229,9,20,0.3)]'
                          : 'border-white/[0.07] bg-white/[0.03] text-zinc-400 hover:border-white/12 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#08080c] via-[#08080c]/90 to-transparent sm:w-12"
                aria-hidden
              />
            </div>
            <p className="mt-1.5 max-w-2xl text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
              En az bir tür eşleşir; tekrar dokunarak kaldırırsın.
            </p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" aria-hidden />

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Detay</p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-white"
                >
                  <Filter className="h-3 w-3 opacity-70" />
                  Sıfırla
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-2.5">
            <div
              className={`relative min-w-0 space-y-1 ${isFormatOpen ? 'z-[90]' : 'z-0'}`}
              ref={formatRef}
            >
              <span className="block pl-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">Format</span>
              <button
                type="button"
                onClick={() => setIsFormatOpen(!isFormatOpen)}
                className="flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-white/[0.09] bg-black/30 px-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:border-primary/20 hover:bg-white/[0.04]"
              >
                <span className="min-w-0 truncate">{FORMAT_OPTIONS.find((o) => o.value === formatFilter)?.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${isFormatOpen ? 'rotate-180' : ''}`} />
              </button>
              {isFormatOpen ? (
                <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-surface-elevated shadow-2xl sm:right-auto sm:min-w-[220px]">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        patchParams({ format: opt.value === 'ALL' ? null : opt.value });
                        setIsFormatOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        formatFilter === opt.value
                          ? 'bg-primary/20 text-primary font-bold'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className={`relative min-w-0 space-y-1 ${isFilterOpen ? 'z-[90]' : 'z-0'}`}
              ref={filterRef}
            >
              <span className="block pl-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">Yayın</span>
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-white/[0.09] bg-black/30 px-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:border-primary/20 hover:bg-white/[0.04]"
              >
                <span className="min-w-0 truncate">{STATUS_OPTIONS.find((o) => o.value === filterStatus)?.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              {isFilterOpen ? (
                <div className="absolute left-0 right-0 top-full z-[100] mt-1 rounded-lg border border-white/10 bg-surface-elevated shadow-2xl sm:right-auto sm:min-w-[200px]">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        patchParams({ status: option.value === 'ALL' ? null : option.value });
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

            <div
              className={`relative min-w-0 space-y-1 ${isYearOpen ? 'z-[90]' : 'z-0'}`}
              ref={yearRef}
            >
              <span className="block pl-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">Yıl</span>
              <button
                type="button"
                onClick={() => setIsYearOpen(!isYearOpen)}
                className="flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-white/[0.09] bg-black/30 px-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:border-primary/20 hover:bg-white/[0.04]"
              >
                <span className="min-w-0 truncate">{YEAR_PRESETS.find((y) => y.value === yearPreset)?.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${isYearOpen ? 'rotate-180' : ''}`} />
              </button>
              {isYearOpen ? (
                <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-surface-elevated shadow-2xl sm:right-auto sm:min-w-[220px]">
                  {YEAR_PRESETS.map((y) => (
                    <button
                      key={y.value}
                      type="button"
                      onClick={() => {
                        patchParams({ year: y.value === 'all' ? null : y.value });
                        setIsYearOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        yearPreset === y.value
                          ? 'bg-primary/20 text-primary font-bold'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {y.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className={`relative min-w-0 space-y-1 ${isScoreOpen ? 'z-[90]' : 'z-0'}`}
              ref={scoreRef}
            >
              <span className="block pl-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">Puan</span>
              <button
                type="button"
                onClick={() => setIsScoreOpen(!isScoreOpen)}
                className="flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-white/[0.09] bg-black/30 px-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:border-primary/20 hover:bg-white/[0.04]"
              >
                <span className="min-w-0 truncate">{MIN_SCORE_OPTIONS.find((o) => o.value === minScore)?.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${isScoreOpen ? 'rotate-180' : ''}`} />
              </button>
              {isScoreOpen ? (
                <div className="absolute left-0 right-0 top-full z-[100] mt-1 rounded-lg border border-white/10 bg-surface-elevated shadow-2xl sm:right-auto sm:min-w-[180px]">
                  {MIN_SCORE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        patchParams({ minScore: o.value === 0 ? null : String(o.value) });
                        setIsScoreOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        minScore === o.value
                          ? 'bg-primary/20 text-primary font-bold'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className={`relative min-w-0 space-y-1 sm:col-span-2 lg:col-span-1 ${isSortOpen ? 'z-[90]' : 'z-0'}`}
              ref={sortRef}
            >
              <span className="block pl-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">Sıra</span>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-white/[0.09] bg-black/30 px-2.5 text-left text-xs font-medium text-white/90 transition-colors hover:border-primary/20 hover:bg-white/[0.04]"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <SortAsc className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSortOpen ? (
                <div className="absolute left-0 right-0 top-full z-[100] mt-1 rounded-lg border border-white/10 bg-surface-elevated shadow-2xl sm:right-auto sm:min-w-[200px]">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        patchParams({ sort: option.value === 'created_at' ? null : option.value });
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
          </div>
        </div>

        {!loading ? (
          <p className="text-sm text-muted mb-4 sm:mb-6 px-0.5">
            <span className="text-white/90 font-semibold">{filteredItems.length}</span> sonuç
            {rawList && rawList.length !== filteredItems.length ? (
              <span className="text-white/40"> · {rawList.length} kayıt içinden</span>
            ) : null}
          </p>
        ) : null}

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
            <h3 className="text-2xl font-bold mb-2">Sonuç bulunamadı</h3>
            <p className="text-muted max-w-md mb-6">
              Filtreleri değiştirerek tekrar deneyin. Paylaşılabilir link için adres çubuğundaki URL’yi kullanabilirsiniz.
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90"
              >
                Tüm filtreleri temizle
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Browse;
