
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/services/auth';
import { Navigate, Link } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import AnimeCard from '../components/AnimeCard';
import { AVATARS, getAvatarSrc } from '@/utils/avatar';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { BANNERS, getBannerSrc } from '@/utils/banner';
import { DESKTOP_ACCESS_PAGE } from '@/config/desktop';
import { translateGenre } from '@/utils/genreTranslations';
import { showToast } from '@/components/ToastProvider';

const loggedAvatarErrors = new Set<string>();

function sanitizeBio(value: string) {
  const noHtml = value.replace(/<[^>]*>/g, '');
  const noLinks = noHtml.replace(/https?:\/\/\S+|www\.\S+/gi, '');
  return noLinks.slice(0, 180);
}

const Profile: React.FC = () => {
  const { user, profile, status, activePlan, signOut, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeAvatarCategory, setActiveAvatarCategory] = useState<'hsdxd' | 'jjk'>('hsdxd');
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    avatar_id: '',
    banner_id: ''
  });
  const [errors, setErrors] = useState<{ bio?: string; avatar?: string; banner?: string }>({});
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Memoize fetcher functions to prevent infinite loops
  // Use user?.id instead of entire user object to prevent unnecessary re-renders
  const userId = user?.id;

  const fetchWatchHistory = useCallback(async () => {
    if (!userId) return [];
    try {
      return await db.getWatchHistory(userId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Profile] Watch history fetch error:', err);
      return [];
    }
  }, [userId]);

  const fetchWatchlist = useCallback(async () => {
    if (!userId) return [];
    try {
      return await db.getWatchlist(userId);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Profile] Watchlist fetch error:', err);
      return [];
    }
  }, [userId]);

  const { data: history, reload: reloadHistory } = useLoad(fetchWatchHistory, [userId]);
  const { data: watchlist, reload: reloadWatchlist } = useLoad(fetchWatchlist, [userId]);

  // Use history length as stable dependency instead of entire history array
  const historyLength = history?.length ?? 0;
  const historyStable = useMemo(() => history || [], [historyLength]);

  // Memoize recommendations fetcher - only fetch if history exists and has items
  const fetchRecommendations = useCallback(async () => {
    if (!historyStable || historyStable.length === 0) {
      return [];
    }
    try {
      return await db.getPersonalizedRecommendations(historyStable);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Profile] Recommendations fetch error:', err);
      return [];
    }
  }, [historyLength]); // Only depend on length, not entire array

  const { data: recommendations } = useLoad(fetchRecommendations, [historyLength]);

  const findAvatarIdBySrc = useCallback((src?: string | null) => {
    if (!src) return '';
    const match = AVATARS.find(a => src.includes(a.image));
    return match?.id || '';
  }, []);

  // Only update editForm when profile changes, not on every render
  const profileIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (profile && profile.id !== profileIdRef.current) {
      profileIdRef.current = profile.id;
      const safeBio = sanitizeBio(profile.bio || '');
      const avatarId = (profile as any).avatar_id || findAvatarIdBySrc(profile.avatar_url) || '';
      const bannerId = (profile as any).banner_id || '';
      
      setEditForm({
        username: profile.username || '',
        bio: safeBio,
        avatar_id: avatarId,
        banner_id: bannerId
      });
    }
  }, [profile?.id, findAvatarIdBySrc]); // Only depend on profile.id, not entire profile object

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const sanitizedBio = sanitizeBio(editForm.bio);
    const validationErrors: { bio?: string; avatar?: string; banner?: string } = {};
    if (sanitizedBio.length > 180) validationErrors.bio = 'Bio en fazla 180 karakter olabilir.';

    // Mevcut profil degerlerini kullan - avatar/banner bos olsa bile onceki secimi veya varsayilani gonder
    const avatarIdToSave = editForm.avatar_id || (profile as any)?.avatar_id || findAvatarIdBySrc(profile.avatar_url) || '';
    const bannerIdToSave = editForm.banner_id || (profile as any)?.banner_id || 'jjk_gojo';
    if (!avatarIdToSave) validationErrors.avatar = 'Lütfen bir avatar seçin.';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await db.updateProfile(user.id, {
        bio: sanitizedBio,
        avatar_id: avatarIdToSave,
        banner_id: bannerIdToSave
      } as any);
      await refreshProfile();
      setEditForm(prev => ({
        ...prev,
        bio: sanitizedBio,
        avatar_id: avatarIdToSave,
        banner_id: bannerIdToSave
      }));
      setIsEditing(false);
      showToast('Profil güncellendi.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Bilinmeyen hata';
      const isTimeout = msg.includes('zaman aşımı') || msg.includes('timeout');
      showToast(
        isTimeout ? 'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.' : `Güncelleme başarısız: ${msg}`,
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const displayProfile =
    profile ||
    ({
      username: 'ANIRIAS üyesi',
      role: 'user',
      bio: 'Henüz bir biyografi eklenmemiş.',
      avatar_url: '',
      banner_id: 'jjk_gojo',
    } as any);
  
  // Use profile data as source of truth (from DB), fallback to editForm when editing
  const currentAvatarId = isEditing 
    ? (editForm.avatar_id || (profile as any)?.avatar_id || findAvatarIdBySrc(profile?.avatar_url))
    : ((profile as any)?.avatar_id || findAvatarIdBySrc(profile?.avatar_url));
  const currentBannerId = isEditing 
    ? (editForm.banner_id || (profile as any)?.banner_id)
    : ((profile as any)?.banner_id);
  
  const selectedAvatar = AVATARS.find(a => a.id === currentAvatarId);
  const selectedBanner = BANNERS.find(b => b.id === currentBannerId);
  const avatarSrc = currentAvatarId ? getAvatarSrc(currentAvatarId) : (profile?.avatar_url || '');
  const bannerSrc = currentBannerId ? getBannerSrc(currentBannerId) : getBannerSrc((profile as any)?.banner_id || 'jjk_gojo');

  const stats = useMemo(() => {
    const totalEps = historyStable?.length || 0;
    const hours = Math.round((totalEps * 24) / 60);
    const level = Math.floor(totalEps / 10) + 1;
    const epsInLevel = totalEps % 10;
    const levelProgressPct = epsInLevel * 10;
    const epsToNextLevel = 10 - epsInLevel;
    return { totalEps, hours, level, levelProgressPct, epsToNextLevel };
  }, [historyLength]); // Only depend on length

  const completedSeries = useMemo(
    () => watchlist?.filter((w) => w.status === 'completed').length ?? 0,
    [watchlist]
  );

  const favoriteGenre = useMemo(() => {
    const counts = new Map<string, number>();
    historyStable.forEach((h) => {
      h.anime?.genres?.forEach((g) => counts.set(g, (counts.get(g) || 0) + 1));
    });
    let best = '';
    let n = 0;
    counts.forEach((v, k) => {
      if (v > n) {
        n = v;
        best = k;
      }
    });
    return best ? translateGenre(best) : '—';
  }, [historyStable, historyLength]);

  if (status === 'LOADING')
    return (
      <div className="min-h-screen bg-background font-inter flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  if (!user) return <Navigate to="/login" />;

  const displayName = profile?.username || user.email || 'Üye';
  const memberSince = profile?.created_at
    ? `${new Date(profile.created_at).getFullYear()}'ten beri üye`
    : 'Yeni üye';

  return (
    <div className="min-h-screen bg-background pb-28 font-inter md:pb-24">
      <div className="mx-auto max-w-6xl px-4 pt-24 md:px-8">
        {/* Banner + profil özeti */}
        <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.75)]">
          <div className="relative h-40 sm:h-48 md:h-56">
            <img
              src={bannerSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-primary/[0.12]" />
          </div>
        </div>

        <div className="relative z-10 -mt-16 mb-12 sm:-mt-[4.5rem] md:-mt-20">
          <div className="rounded-2xl border border-white/[0.08] bg-surface-elevated/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:gap-10">
              <div className="flex shrink-0 justify-center md:justify-start">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white/10 bg-primary/20 shadow-[0_0_40px_-8px_rgba(229,9,20,0.35)] ring-2 ring-primary/25 sm:h-32 sm:w-32">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 text-center md:pb-1 md:text-left">
                <div className="mb-2 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{displayName}</h1>
                  {profile?.role === 'admin' ? (
                    <span className="rounded border border-primary/35 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Admin
                    </span>
                  ) : null}
                </div>
                <p className="mx-auto mb-4 max-w-xl text-sm leading-relaxed text-white/55 line-clamp-3 md:mx-0 md:max-w-lg">
                  {displayProfile.bio || 'Henüz bir biyografi eklenmemiş. Profili düzenleyerek kendini tanıt.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  {activePlan === 'pro_max' ? (
                    <span className="rounded-full border border-primary/35 bg-primary/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                      Pro Max
                    </span>
                  ) : activePlan === 'pro' ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                      Pro
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      Ücretsiz
                    </span>
                  )}
                  <span className="text-xs font-medium text-zinc-500">{memberSince}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black text-zinc-400">
                    Lv. {stats.level}
                  </span>
                </div>
                <div className="mx-auto mt-4 max-w-md md:mx-0">
                  <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <span>Sonraki seviye</span>
                    <span>
                      {stats.totalEps === 0
                        ? 'İzlemeye başla'
                        : `${stats.epsToNextLevel} bölüm kaldı`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-500"
                      style={{ width: `${stats.levelProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 md:w-auto md:pb-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white transition-all hover:border-primary/40 hover:bg-primary/10 md:w-auto"
                >
                  Profili düzenle
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav
          className="mb-8 flex flex-wrap justify-center gap-2 border-b border-white/[0.06] pb-6 md:justify-start"
          aria-label="Profil bölümleri"
        >
          {(
            [
              ['#istatistikler', 'İstatistikler'],
              ['#son-izlenenler', 'Son izlenenler'],
              ['#gecmis', 'Geçmiş'],
              ['#hesap', 'Hesap'],
            ] as const
          ).map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-transparent px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <h2
          id="istatistikler"
          className="mb-6 scroll-mt-28 text-xl font-bold text-white sm:text-2xl flex items-center gap-2"
        >
          <span className="text-primary">▍</span> İstatistikler
        </h2>
        <div className="mb-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {(
            [
              {
                label: 'Yaklaşık izleme',
                value: `${stats.hours}`,
                sub: 'saat',
                accent: false,
              },
              { label: 'İzlenen kayıt', value: `${stats.totalEps}`, sub: 'bölüm', accent: false },
              { label: 'Sık tür', value: favoriteGenre, sub: '', accent: true },
              {
                label: 'Tamamlanan',
                value: `${completedSeries}`,
                sub: 'listeden',
                accent: false,
              },
            ] as const
          ).map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-transparent p-4 backdrop-blur-sm transition-colors hover:border-primary/20 sm:p-5"
            >
              <span className="text-[11px] font-medium text-zinc-500">{card.label}</span>
              <span
                className={`text-2xl font-black tracking-tight sm:text-3xl ${card.accent ? 'truncate text-primary' : 'text-white'}`}
              >
                {card.value}
                {card.sub ? (
                  <span className="ml-1 text-base font-medium text-zinc-500 sm:text-lg">{card.sub}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>

        <section id="son-izlenenler" className="mb-12 scroll-mt-28">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white sm:text-2xl flex items-center gap-2">
              <span className="text-primary">▍</span> Son izlenenler
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link to="/list" className="font-semibold text-zinc-500 transition-colors hover:text-white">
                Listem
              </Link>
              <Link to="/profile#gecmis" className="font-semibold text-zinc-500 transition-colors hover:text-primary">
                Tüm geçmiş →
              </Link>
            </div>
          </div>
          {historyStable.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-surface-elevated/80 px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">Henüz izleme geçmişin yok. Bir anime açıp izlemeye başla.</p>
              <Link
                to="/"
                className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
              >
                Keşfet
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {historyStable.slice(0, 12).map((h, i) => (
                <Link
                  key={`${h.anime_id}-${h.episode_id}-strip-${i}`}
                  to={`/watch/${h.anime?.slug || h.anime_id}/${h.episode?.season_number || 1}/${h.episode?.episode_number || 1}`}
                  className="group w-[108px] shrink-0 sm:w-[120px]"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-lg transition-all group-hover:border-primary/40 group-hover:shadow-[0_12px_40px_-12px_rgba(229,9,20,0.25)]">
                    <img
                      src={proxyImage(h.anime?.cover_image || '')}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-2 right-2 text-[10px] font-black uppercase tracking-wide text-white/90 line-clamp-2">
                      {h.anime ? getDisplayTitle(h.anime.title) : 'Anime'}
                    </span>
                  </div>
                  <p className="mt-2 text-center text-[10px] font-bold text-zinc-500">
                    Böl. {h.episode?.episode_number ?? '—'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

      <section id="gecmis" className="mb-12 scroll-mt-28">
        <h2 className="mb-4 text-xl font-bold text-white sm:text-2xl flex items-center gap-2">
          <span className="text-primary">▍</span> İzleme geçmişi
        </h2>
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08] bg-surface-elevated/90">
          {historyStable.length === 0 ? (
            <p className="p-8 text-center text-muted text-sm">Kayıt yok.</p>
          ) : (
            historyStable.map((h, i) => (
              <div
                key={`${h.anime_id}-${h.episode_id}-full-${i}`}
                className="flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors"
              >
                <img
                  src={proxyImage(h.anime?.cover_image || '')}
                  alt=""
                  className="w-14 h-20 object-cover rounded-lg shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">
                    {h.anime ? getDisplayTitle(h.anime.title) : '—'}
                  </h4>
                  <p className="text-xs text-white/50">
                    Bölüm {h.episode?.episode_number} · {new Date(h.completed_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <Link
                  to={`/watch/${h.anime?.slug || h.anime_id}/${h.episode?.season_number || 1}/${h.episode?.episode_number || 1}`}
                  className="shrink-0 w-12 h-12 rounded-xl bg-white/5 hover:bg-primary hover:text-black text-white flex items-center justify-center transition-colors"
                  aria-label="Oynat"
                >
                  <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <h2
        id="hesap"
        className="mb-6 scroll-mt-28 text-xl font-bold text-white sm:text-2xl flex items-center gap-2"
      >
        <span className="text-primary">▍</span> Hesap
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to={DESKTOP_ACCESS_PAGE}
          className="bg-surface-elevated p-6 rounded-xl flex flex-col gap-4 border border-white/5 hover:border-primary/50 transition-all group shadow-lg"
        >
          <div className="text-primary text-sm font-black uppercase tracking-widest">Plan &amp; desktop</div>
          <div>
            <h3 className="text-lg font-bold mb-1 text-white">Abonelik &amp; erişim</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              {activePlan === 'pro_max'
                ? 'Desktop erişimin açık. Kod eşlemesi için sayfaya git.'
                : 'PRO Max ile masaüstü uygulamasını etkinleştir.'}
            </p>
          </div>
        </Link>
        <Link
          to="/list"
          className="bg-surface-elevated p-6 rounded-xl flex flex-col gap-4 border border-white/5 hover:border-primary/50 transition-all group shadow-lg"
        >
          <div className="text-primary text-sm font-black uppercase tracking-widest">Koleksiyon</div>
          <div>
            <h3 className="text-lg font-bold mb-1 text-white">Listem</h3>
            <p className="text-white/50 text-sm leading-relaxed">Kayıtlı seriler ve kaldığın yer.</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="bg-surface-elevated p-6 rounded-xl flex flex-col gap-4 text-left border border-white/5 hover:border-red-500/50 hover:bg-red-500/5 transition-all group shadow-lg"
        >
          <div className="text-red-500 text-sm font-black uppercase tracking-widest">Oturum</div>
          <div>
            <h3 className="text-lg font-bold text-red-500 mb-1">Çıkış yap</h3>
            <p className="text-white/50 text-sm leading-relaxed">Bu cihazdan güvenle çık.</p>
          </div>
        </button>
      </div>

      {recommendations && recommendations.length > 0 ? (
        <section className="mt-12 scroll-mt-28">
          <h2 className="mb-4 text-xl font-bold text-white sm:text-2xl flex items-center gap-2">
            <span className="text-primary">▍</span> Sana özel
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {recommendations.slice(0, 8).map((rec) => (
              <div key={rec.id} className="w-[140px] shrink-0">
                <AnimeCard anime={rec} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={() => setIsEditing(false)} />
           <div className="relative w-full max-w-lg bg-surface-elevated border border-white/10 rounded-[3rem] p-10 shadow-2xl animate-fade-in-up">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8">PROFİLİ <span className="text-primary">DÜZENLE</span></h3>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">KULLANICI ADI</label>
                    <input 
                      type="text" 
                      value={editForm.username}
                      readOnly
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white/60 font-black outline-none cursor-not-allowed opacity-70"
                    />
                    <p className="text-[11px] text-gray-500 font-semibold ml-2">Kullanıcı adı değiştirilemez</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">HAKKINDA (BIO)</label>
                    <textarea 
                      rows={3}
                      value={editForm.bio}
                      onChange={e => {
                        const sanitized = sanitizeBio(e.target.value);
                        setEditForm({...editForm, bio: sanitized});
                        if (sanitized.length <= 180) setErrors(prev => ({ ...prev, bio: undefined }));
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-primary resize-none"
                    />
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold px-2">
                      <span className={errors.bio ? 'text-primary' : ''}>{errors.bio}</span>
                      <span>{editForm.bio.length}/180</span>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">AVATAR</label>
                    <button
                      type="button"
                      onClick={() => setIsAvatarModalOpen(true)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-semibold outline-none hover:border-primary transition-all"
                    >
                      {selectedAvatar ? `Seçilen Avatar: ${selectedAvatar.name || selectedAvatar.id}` : 'Avatar Seç'}
                    </button>
                    {errors.avatar && <p className="text-primary text-[11px] font-semibold px-2">{errors.avatar}</p>}
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">BANNER</label>
                    <button
                      type="button"
                      onClick={() => setIsBannerModalOpen(true)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-semibold outline-none hover:border-primary transition-all"
                    >
                      {selectedBanner ? 'Seçilen Banner' : 'Banner Seç'}
                    </button>
                    {errors.banner && <p className="text-primary text-[11px] font-semibold px-2">{errors.banner}</p>}
                 </div>
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsEditing(false)} disabled={saving} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50">İPTAL</button>
                   <button type="submit" disabled={saving} className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/25 transition-[filter] hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2">
                     {saving ? (<> <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Kaydediliyor... </>) : 'KAYDET'}
                   </button>
                </div>
             </form>
          </div>
       </div>
     )}

      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur" onClick={() => setIsAvatarModalOpen(false)} />
          <div className="relative w-full max-w-3xl bg-surface-elevated border border-white/10 rounded-[2.5rem] p-8 shadow-2xl z-10">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-black text-white uppercase tracking-widest">Avatar Seç</h4>
              <button onClick={() => setIsAvatarModalOpen(false)} className="text-gray-400 hover:text-white transition-colors text-sm font-bold">Kapat</button>
            </div>
            <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-hide">
              {[
                { key: 'hsdxd', label: 'High School DxD' },
                { key: 'jjk', label: 'Jujutsu Kaisen' }
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveAvatarCategory(cat.key as 'hsdxd' | 'jjk')}
                  className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${activeAvatarCategory === cat.key ? 'bg-primary text-white border-primary' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {AVATARS.filter(a => a.anime === activeAvatarCategory).map(item => {
                const selected = editForm.avatar_id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setEditForm(prev => ({ ...prev, avatar_id: item.id }));
                      setErrors(prev => ({ ...prev, avatar: undefined }));
                      setIsAvatarModalOpen(false);
                    }}
                    className={`relative overflow-hidden rounded-2xl border transition-all h-40 ${selected ? 'border-primary ring-2 ring-primary/60 shadow-[0_0_20px_rgba(229,25,62,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <img
                      src={getAvatarSrc(item.id)}
                      className="w-full h-full object-cover"
                      onError={() => {
                        if (!loggedAvatarErrors.has(item.image)) {
                          loggedAvatarErrors.add(item.image);
                          console.error('Avatar load failed:', item.image);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                      <span className="text-white text-xs font-bold">{item.name || item.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isBannerModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur" onClick={() => setIsBannerModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-surface-elevated border border-white/10 rounded-[2.5rem] p-8 shadow-2xl z-10">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-black text-white uppercase tracking-widest">Banner Seç</h4>
              <button onClick={() => setIsBannerModalOpen(false)} className="text-gray-400 hover:text-white transition-colors text-sm font-bold">Kapat</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {BANNERS.map(item => {
                const selected = editForm.banner_id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setEditForm(prev => ({ ...prev, banner_id: item.id }));
                      setErrors(prev => ({ ...prev, banner: undefined }));
                      setIsBannerModalOpen(false);
                    }}
                    className={`relative overflow-hidden rounded-2xl border transition-all h-32 ${selected ? 'border-primary ring-2 ring-primary/60 shadow-[0_0_20px_rgba(229,25,62,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <img src={getBannerSrc(item.id)} className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Profile;
