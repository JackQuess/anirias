
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

const loggedAvatarErrors = new Set<string>();

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

  const sanitizeBio = (value: string) => {
    const noHtml = value.replace(/<[^>]*>/g, '');
    const noLinks = noHtml.replace(/https?:\/\/\S+|www\.\S+/gi, '');
    return noLinks.slice(0, 180);
  };

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
      alert('Profil güncellendi!');
    } catch (err: any) {
      const msg = err?.message || 'Bilinmeyen hata';
      const isTimeout = msg.includes('zaman aşımı') || msg.includes('timeout');
      alert(isTimeout ? 'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.' : `Güncelleme başarısız: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const displayProfile = profile || { username: 'Anirias Guest', role: 'user', bio: 'Henüz bir biyografi eklenmemiş.', avatar_url: '', banner_id: 'jjk_gojo' } as any;
  
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
    const xp = (totalEps % 10) * 10;
    return { totalEps, hours, level, xp };
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
    <div className="min-h-screen bg-background pt-24 px-4 md:px-12 pb-24 max-w-6xl mx-auto font-inter">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-12 bg-surface-elevated p-8 rounded-2xl relative overflow-hidden border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30 shrink-0 relative z-10 bg-primary/20">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-4xl font-black tracking-tight text-white">{displayName}</h1>
            {profile?.role === 'admin' ? (
              <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded text-[10px] font-bold uppercase tracking-wider">
                Admin
              </span>
            ) : null}
          </div>
          <p className="text-white/60 mb-4 max-w-md line-clamp-2">{displayProfile.bio || 'Henüz bir biyografi eklenmemiş.'}</p>
          <div className="flex flex-wrap items-center gap-3">
            {activePlan === 'pro_max' ? (
              <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                Pro Max
              </span>
            ) : activePlan === 'pro' ? (
              <span className="px-3 py-1 bg-primary/15 text-primary border border-primary/25 rounded-full text-xs font-bold uppercase">
                Pro
              </span>
            ) : null}
            <span className="text-white/50 text-sm font-medium">{memberSince}</span>
            <span className="text-muted text-sm">Lv. {stats.level}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="px-6 py-3 bg-surface border border-white/10 rounded-lg font-bold hover:bg-white/10 transition-colors flex items-center gap-2 z-10 w-full md:w-auto justify-center text-white"
        >
          <span>Profili düzenle</span>
        </button>
      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
        <span className="text-primary">▍</span> İstatistikler
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-surface-elevated p-6 rounded-xl border border-white/5 flex flex-col gap-2">
          <span className="text-sm font-medium text-white/50">Yaklaşık izleme</span>
          <span className="text-3xl font-black text-white">
            {stats.hours}
            <span className="text-lg text-white/50 ml-1 font-medium">saat</span>
          </span>
        </div>
        <div className="bg-surface-elevated p-6 rounded-xl border border-white/5 flex flex-col gap-2">
          <span className="text-sm font-medium text-white/50">İzlenen kayıt</span>
          <span className="text-3xl font-black text-white">{stats.totalEps}</span>
        </div>
        <div className="bg-surface-elevated p-6 rounded-xl border border-white/5 flex flex-col gap-2">
          <span className="text-sm font-medium text-white/50">Sık tür</span>
          <span className="text-2xl font-black text-primary truncate">{favoriteGenre}</span>
        </div>
        <div className="bg-surface-elevated p-6 rounded-xl border border-white/5 flex flex-col gap-2">
          <span className="text-sm font-medium text-white/50">Tamamlanan (liste)</span>
          <span className="text-3xl font-black text-white">{completedSeries}</span>
        </div>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <span className="text-primary">▍</span> Son aktiviteler
          </h2>
          <div className="flex gap-4">
            <Link to="/list" className="text-sm text-muted hover:text-white transition-colors">
              Listem
            </Link>
            <Link to="/profile#gecmis" className="text-sm text-muted hover:text-white transition-colors">
              Tüm geçmiş
            </Link>
          </div>
        </div>
        <div className="bg-surface-elevated rounded-xl border border-white/5 overflow-hidden">
          {historyStable.length === 0 ? (
            <p className="p-8 text-center text-muted text-sm">Henüz izleme geçmişi yok.</p>
          ) : (
            historyStable.slice(0, 6).map((h, i) => (
              <div
                key={`${h.anime_id}-${h.episode_id}-${i}`}
                className="flex items-center gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
              >
                <img
                  src={proxyImage(h.anime?.cover_image || '')}
                  alt=""
                  className="w-16 h-16 rounded object-cover shrink-0 bg-black/40"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white line-clamp-1">
                    {h.anime ? getDisplayTitle(h.anime.title) : 'Anime'}
                  </h3>
                  <p className="text-sm text-white/50">
                    Bölüm {h.episode?.episode_number ?? '—'} izlendi
                  </p>
                </div>
                <div className="text-sm text-white/40 hidden sm:block shrink-0">
                  {new Date(h.completed_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <section id="gecmis" className="mb-12 scroll-mt-28">
        <h2 className="text-2xl font-bold text-white mb-4">İzleme geçmişi</h2>
        <div className="bg-surface-elevated rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
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

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
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
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4">Sana özel</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {recommendations.slice(0, 8).map((rec) => (
              <div key={rec.id} className="w-[140px] shrink-0">
                <AnimeCard anime={rec} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={() => setIsEditing(false)} />
           <div className="relative w-full max-w-lg bg-brand-surface border border-white/10 rounded-[3rem] p-10 shadow-2xl animate-fade-in-up">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8">PROFİLİ <span className="text-brand-red">DÜZENLE</span></h3>
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
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red resize-none"
                    />
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold px-2">
                      <span className={errors.bio ? 'text-brand-red' : ''}>{errors.bio}</span>
                      <span>{editForm.bio.length}/180</span>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">AVATAR</label>
                    <button
                      type="button"
                      onClick={() => setIsAvatarModalOpen(true)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-semibold outline-none hover:border-brand-red transition-all"
                    >
                      {selectedAvatar ? `Seçilen Avatar: ${selectedAvatar.name || selectedAvatar.id}` : 'Avatar Seç'}
                    </button>
                    {errors.avatar && <p className="text-brand-red text-[11px] font-semibold px-2">{errors.avatar}</p>}
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">BANNER</label>
                    <button
                      type="button"
                      onClick={() => setIsBannerModalOpen(true)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-semibold outline-none hover:border-brand-red transition-all"
                    >
                      {selectedBanner ? 'Seçilen Banner' : 'Banner Seç'}
                    </button>
                    {errors.banner && <p className="text-brand-red text-[11px] font-semibold px-2">{errors.banner}</p>}
                 </div>
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsEditing(false)} disabled={saving} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-50">İPTAL</button>
                   <button type="submit" disabled={saving} className="flex-1 bg-brand-red hover:bg-brand-redHover text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-brand-red/20 disabled:opacity-50 flex items-center justify-center gap-2">
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
          <div className="relative w-full max-w-3xl bg-brand-surface border border-white/10 rounded-[2.5rem] p-8 shadow-2xl z-10">
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
                  className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${activeAvatarCategory === cat.key ? 'bg-brand-red text-white border-brand-red' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}
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
                    className={`relative overflow-hidden rounded-2xl border transition-all h-40 ${selected ? 'border-brand-red ring-2 ring-brand-red/60 shadow-[0_0_20px_rgba(229,25,62,0.3)]' : 'border-white/10 hover:border-white/30'}`}
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
          <div className="relative w-full max-w-4xl bg-brand-surface border border-white/10 rounded-[2.5rem] p-8 shadow-2xl z-10">
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
                    className={`relative overflow-hidden rounded-2xl border transition-all h-32 ${selected ? 'border-brand-red ring-2 ring-brand-red/60 shadow-[0_0_20px_rgba(229,25,62,0.3)]' : 'border-white/10 hover:border-white/30'}`}
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
