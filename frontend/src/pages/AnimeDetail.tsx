import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Share2, Subtitles, AlertTriangle } from 'lucide-react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { useAuth } from '@/services/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { WatchlistStatus } from '@/types';
import AnimeCard from '@/components/AnimeCard';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { translateGenre } from '@/utils/genreTranslations';
import { computeAnimeMatchPercent, formatMatchLabel } from '@/lib/matchScore';
import { episodeHasPlayableVideo } from '@/utils/episodePlayable';

const ADULT_GLOBAL_LS_KEY = 'anirias_adult_global_ack';

const AnimeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuth();
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [watchlistStatus, setWatchlistStatus] = useState<WatchlistStatus | 'none'>('none');
  const [adultGateDismissed, setAdultGateDismissed] = useState(false);

  const fetchAnime = useCallback(async () => {
    if (!id) return null;
    try {
      return await db.getAnimeByIdOrSlug(id);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AnimeDetail]', err);
      return null;
    }
  }, [id]);

  const fetchWatchlist = useCallback(async () => {
    if (!user?.id) return [];
    try {
      return await db.getWatchlist(user.id);
    } catch {
      return [];
    }
  }, [user?.id]);

  const { data: anime, loading: animeLoading, error: animeError } = useLoad(fetchAnime, [id]);
  const animeId = anime?.id || null;

  const fetchEpisodesWithId = useCallback(async () => {
    if (!animeId) return [];
    try {
      return await db.getEpisodes(animeId);
    } catch {
      return [];
    }
  }, [animeId]);

  const fetchSimilarWithId = useCallback(async () => {
    if (!animeId) return [];
    try {
      return await db.getSimilarAnimes(animeId);
    } catch {
      return [];
    }
  }, [animeId]);

  const { data: allEpisodes, loading: episodesLoading } = useLoad(fetchEpisodesWithId, [animeId]);
  const { data: similarAnimes } = useLoad(fetchSimilarWithId, [animeId]);
  const { data: watchlist } = useLoad(fetchWatchlist, [user?.id]);

  const episodesBySeason = React.useMemo(() => {
    if (!allEpisodes?.length) return {};
    const grouped: Record<number, NonNullable<typeof allEpisodes>> = {};
    allEpisodes.forEach((ep) => {
      const sn = ep.season_number || 1;
      if (!grouped[sn]) grouped[sn] = [];
      grouped[sn].push(ep);
    });
    Object.keys(grouped).forEach((k) => {
      grouped[Number(k)].sort((a, b) => a.episode_number - b.episode_number);
    });
    return grouped;
  }, [allEpisodes]);

  const seasonNumbers = React.useMemo(() => Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b), [episodesBySeason]);

  useEffect(() => {
    const qs = searchParams.get('season');
    const qn = qs ? parseInt(qs, 10) : null;
    if (seasonNumbers.length === 0) {
      setSelectedSeasonNumber(null);
      return;
    }
    if (!selectedSeasonNumber) {
      const valid = qn && seasonNumbers.includes(qn) ? qn : seasonNumbers[0];
      setSelectedSeasonNumber(valid);
      if (valid && !qs) setSearchParams({ season: String(valid) });
    } else if (qn && qn !== selectedSeasonNumber && seasonNumbers.includes(qn)) {
      setSelectedSeasonNumber(qn);
    }
  }, [seasonNumbers, selectedSeasonNumber, searchParams, setSearchParams]);

  const visibleEpisodes = React.useMemo(() => {
    if (!selectedSeasonNumber) return [];
    return episodesBySeason[selectedSeasonNumber] || [];
  }, [selectedSeasonNumber, episodesBySeason]);

  useEffect(() => {
    if (!watchlist || !animeId) return;
    const entry = watchlist.find((w) => w.anime_id === animeId);
    setWatchlistStatus(entry ? entry.status : 'none');
  }, [watchlist, animeId]);

  useEffect(() => {
    if (animeLoading || !anime) return;
    if (!anime.is_adult) {
      setAdultGateDismissed(true);
      return;
    }
    const profileOk = profile?.is_adult_confirmed === true;
    let lsOk = false;
    try {
      lsOk = localStorage.getItem(ADULT_GLOBAL_LS_KEY) === '1';
    } catch {
      lsOk = false;
    }
    setAdultGateDismissed(profileOk || lsOk);
  }, [animeLoading, anime?.id, anime?.is_adult, profile?.is_adult_confirmed]);

  const showAdultGate = Boolean(!animeLoading && anime?.is_adult && !adultGateDismissed);

  useEffect(() => {
    if (!showAdultGate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showAdultGate]);

  useEffect(() => {
    if (!showAdultGate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
        else navigate('/');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAdultGate, navigate]);

  const handleAdultGateContinue = async () => {
    try {
      localStorage.setItem(ADULT_GLOBAL_LS_KEY, '1');
    } catch {
      /* ignore */
    }
    if (user?.id) {
      try {
        const updated = await db.updateProfile(user.id, { is_adult_confirmed: true });
        setProfile(updated);
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[AnimeDetail] is_adult_confirmed kaydedilemedi (sütun/izin):', e);
      }
    }
    setAdultGateDismissed(true);
  };

  const handleAdultGateLeave = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const titleString = anime ? getDisplayTitle(anime.title) : '';
  const slug = anime?.slug || anime?.id || '';
  const banner = anime ? proxyImage(anime.banner_image || anime.cover_image || '') : '';
  const cover = anime ? proxyImage(anime.cover_image || '') : '';
  const scorePct = React.useMemo(() => {
    if (!anime) return 0;
    return computeAnimeMatchPercent({
      watchlist: watchlist ?? null,
      targetAnime: anime,
      userId: user?.id ?? null,
    });
  }, [anime, watchlist, user?.id]);
  const synopsis = anime?.description?.replace(/<[^>]*>/g, '') || '';

  const toggleList = async () => {
    if (!user || !animeId) {
      alert('Lütfen önce giriş yapın.');
      return;
    }
    try {
      if (watchlistStatus !== 'none') {
        await db.removeWatchlistEntry(user.id, animeId);
        setWatchlistStatus('none');
      } else {
        await db.updateWatchlist(user.id, animeId, 'planning');
        setWatchlistStatus('planning');
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error(e);
    }
  };

  const shareAnime = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: titleString, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  if (animeLoading) {
    return (
      <div className="min-h-screen bg-background font-inter pt-8">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  if (animeError || !anime) {
    return (
      <div className="min-h-screen bg-background font-inter flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="text-6xl font-black">404</div>
          <div className="font-bold">Anime bulunamadı.</div>
        </div>
      </div>
    );
  }

  const inList = watchlistStatus !== 'none';
  const firstSeason = seasonNumbers[0] ?? 1;

  return (
    <div className="min-h-screen bg-background pb-mobile-nav md:pb-24 font-inter">
      <div className="relative w-full h-[52vh] min-h-[320px] sm:h-[58vh] md:h-[70vh] bg-black">
        {banner ? (
          <img
            src={banner}
            alt={titleString}
            className="w-full h-full object-cover opacity-50"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent w-[90%] md:w-[60%]" />

        <div className="absolute bottom-0 left-0 w-full px-4 sm:px-6 md:px-12 pb-[max(2rem,env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-10 md:pb-12">
          <div className="max-w-4xl min-w-0 flex flex-col gap-3 sm:gap-4">
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-lg leading-tight break-words">
              {titleString}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/90">
              <span className="text-green-400 font-bold">{formatMatchLabel(scorePct)}</span>
              <span>{anime.year || '2024'}</span>
              {anime.is_adult ? (
                <span className="px-1.5 py-0.5 border border-white/40 rounded text-[11px] text-white/80">18+</span>
              ) : null}
              <span className="px-1.5 py-0.5 border border-white/40 rounded text-[11px] text-white/80">4K HDR</span>
              <span className="flex items-center gap-1.5">
                <Subtitles className="w-4 h-4" />
                Türkçe
              </span>
            </div>

            <p className="text-base md:text-lg text-white/80 line-clamp-3 max-w-2xl mt-2 leading-relaxed">{synopsis}</p>

            <div className="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-4 mt-4 sm:mt-6">
              <Link
                to={`/watch/${slug}/${firstSeason}/1`}
                className="flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 bg-white text-black px-6 sm:px-8 py-3 rounded font-bold text-sm sm:text-base hover:bg-white/80 transition-colors active:scale-95 touch-manipulation"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current shrink-0" />
                Oynat
              </Link>
              <button
                type="button"
                onClick={toggleList}
                className="flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-2 bg-transparent border border-white/40 text-white px-6 sm:px-8 py-3 rounded font-bold text-sm sm:text-base hover:bg-white/10 transition-colors active:scale-95 touch-manipulation"
              >
                {inList ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                {inList ? 'Listemde' : 'Listeme Ekle'}
              </button>
              <button
                type="button"
                onClick={shareAnime}
                className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Paylaş"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 flex flex-col lg:flex-row gap-8 sm:gap-12">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-white">Bölümler</h2>
            {seasonNumbers.length > 1 ? (
              <select
                value={selectedSeasonNumber ?? firstSeason}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setSelectedSeasonNumber(n);
                  setSearchParams({ season: String(n) });
                }}
                className="bg-surface border border-white/10 text-white px-4 py-2 rounded outline-none focus:border-white/30 max-w-xs"
              >
                {seasonNumbers.map((sn) => (
                  <option key={sn} value={sn}>
                    {sn}. Sezon
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-white/50 text-sm">{seasonNumbers.length ? `${seasonNumbers[0]}. Sezon` : 'Sezon'}</span>
            )}
          </div>

          <div className="space-y-4">
            {episodesLoading ? (
              <p className="text-muted text-sm py-8">Yükleniyor...</p>
            ) : visibleEpisodes.length > 0 ? (
              visibleEpisodes.map((ep, i) => {
                const epNum = ep.episode_number;
                const epTitle = ep.title || `Bölüm ${epNum}`;
                const sn = ep.season_number || selectedSeasonNumber || 1;
                const mins = ep.duration_seconds ? Math.floor(ep.duration_seconds / 60) : 24;
                const playable = episodeHasPlayableVideo(ep);
                const blurb =
                  ep.short_note?.replace(/<[^>]*>/g, '') ||
                  'Bu bölümde hikâye ilerliyor ve karakterler yeni gelişmelerle karşılaşıyor.';
                const rowClass =
                  'flex items-center gap-4 p-4 rounded-lg border transition-colors ' +
                  (playable
                    ? 'hover:bg-surface-elevated group cursor-pointer border-transparent hover:border-white/5'
                    : 'opacity-75 cursor-default border-white/5 bg-surface-elevated/30');
                const inner = (
                  <>
                    <div
                      className={`text-2xl font-bold w-8 text-center shrink-0 ${
                        playable ? 'text-white/20 group-hover:text-white/40 transition-colors' : 'text-white/30'
                      }`}
                    >
                      {epNum}
                    </div>
                    <div className="relative w-32 md:w-40 aspect-video bg-surface rounded overflow-hidden shrink-0">
                      <img
                        src={cover}
                        alt=""
                        className={`w-full h-full object-cover ${playable ? 'opacity-70 group-hover:opacity-100 transition-opacity' : 'opacity-50'}`}
                        referrerPolicy="no-referrer"
                      />
                      {playable ? (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Play className="w-8 h-8 text-white fill-current" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-1">
                          <span className="text-[10px] sm:text-xs font-bold text-white/90 text-center leading-tight">
                            Yakında eklenecek
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-bold text-sm md:text-base truncate">{epTitle}</h4>
                      <p className="text-white/50 text-xs md:text-sm line-clamp-2 mt-1">{blurb}</p>
                    </div>
                    <div className="text-white/40 text-sm hidden sm:block shrink-0 text-right">
                      {playable ? (
                        <span>{mins} dk</span>
                      ) : (
                        <span className="text-amber-200/85 text-xs font-semibold whitespace-nowrap">
                          Yakında eklenecek
                        </span>
                      )}
                    </div>
                  </>
                );
                return playable ? (
                  <Link key={ep.id || i} to={`/watch/${slug}/${sn}/${epNum}`} className={rowClass}>
                    {inner}
                  </Link>
                ) : (
                  <div key={ep.id || i} className={rowClass}>
                    {inner}
                  </div>
                );
              })
            ) : (
              <p className="text-muted text-sm py-8">Henüz bölüm yok.</p>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-8">
          <div>
            <h3 className="text-white/60 text-sm mb-2">Öne çıkan</h3>
            <p className="text-white text-sm">{anime.is_featured ? 'Vitrin içeriği' : 'Katalog içeriği'}</p>
          </div>

          <div>
            <h3 className="text-white/60 text-sm mb-2">Türler</h3>
            <div className="flex flex-wrap gap-2">
              {anime.genres?.map((g) => (
                <span key={g} className="text-white text-sm">
                  {translateGenre(g)}
                </span>
              ))}
            </div>
          </div>

          {anime.tags && anime.tags.length > 0 ? (
            <div>
              <h3 className="text-white/60 text-sm mb-2">Etiketler</h3>
              <div className="flex flex-wrap gap-2">
                {anime.tags.slice(0, 8).map((t) => (
                  <span key={t} className="text-white text-sm">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-white/60 text-sm mb-2">Bu dizi</h3>
              <p className="text-white text-sm">Sürükleyici hikâye ve güçlü görsellik.</p>
            </div>
          )}

          <div>
            <h3 className="text-white/60 text-sm mb-2">Bilgi</h3>
            <p className="text-white text-sm">İzlenme: {(anime.view_count || 0).toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </div>

      {similarAnimes && similarAnimes.length > 0 ? (
        <div className="px-6 md:px-12 pb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Benzer içerikler</h2>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 no-scrollbar snap-x">
            {similarAnimes.map((sim) => (
              <div key={sim.id} className="w-[100px] sm:w-[130px] md:w-[160px] lg:w-[180px] shrink-0 snap-start">
                <AnimeCard anime={sim} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showAdultGate
        ? createPortal(
            <div
              className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="adult-gate-title"
            >
              <div className="absolute inset-0 bg-black/88 backdrop-blur-md" aria-hidden />
              <div className="relative w-full max-w-md rounded-2xl border border-white/12 bg-[#0f0f12] shadow-2xl p-6 sm:p-8">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-amber-400" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h2 id="adult-gate-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                      18+ içerik uyarısı
                    </h2>
                    <p className="text-white/45 text-[10px] font-bold uppercase tracking-widest mt-1">Yaş doğrulaması</p>
                  </div>
                </div>
                <p className="text-white/75 text-sm leading-relaxed mb-3">
                  Bu yapım yetişkinlere yönelik içerik barındırabilir. &quot;Devam et&quot; ile{' '}
                  <span className="text-white font-semibold">18 yaşından büyük olduğunuzu</span> ve bu içeriği kendi seçiminizle
                  görüntülediğinizi onaylamış olursunuz.
                </p>
                <p className="text-white/45 text-xs leading-relaxed mb-6">
                  Onayınız bu tarayıcıda saklanır. Giriş yaptıysanız hesabınıza da kaydedilir; tüm +18 içeriklerde tekrar sormayız.
                </p>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleAdultGateLeave}
                    className="flex-1 min-h-[44px] rounded-lg border border-white/20 text-white font-bold text-sm hover:bg-white/5 transition-colors"
                  >
                    Geri dön
                  </button>
                  <button
                    type="button"
                    onClick={handleAdultGateContinue}
                    className="flex-1 min-h-[44px] rounded-lg bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors"
                  >
                    Devam et
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default AnimeDetail;
