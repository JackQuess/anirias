
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/services/auth';
import { Navigate, Link } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import AnimeCard from '../components/AnimeCard';
import { AVATARS, AvatarItem, getAvatarSrc } from '@/utils/avatar';
import { BANNERS, getBannerSrc } from '@/utils/banner';

type BannerItem = { id: string; src: string; name?: string };

const loggedAvatarErrors = new Set<string>();

const Profile: React.FC = () => {
  const { user, profile, status, signOut, refreshProfile, setProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'watchlist' | 'history'>('info');
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

  const { data: history } = useLoad(() => user ? db.getWatchHistory(user.id) : Promise.resolve([]), [user]);
  const { data: watchlist } = useLoad(() => user ? db.getWatchlist(user.id) : Promise.resolve([]), [user]);
  const { data: recommendations } = useLoad(() => history ? db.getPersonalizedRecommendations(history) : Promise.resolve([]), [history]);

  console.log('PROFILE DATA', profile);

  const findAvatarIdBySrc = useCallback((src?: string | null) => {
    if (!src) return '';
    const match = AVATARS.find(a => src.includes(a.image));
    return match?.id || '';
  }, []);

  useEffect(() => {
    if (profile) {
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
  }, [profile, findAvatarIdBySrc]);

  const sanitizeBio = (value: string) => {
    const noHtml = value.replace(/<[^>]*>/g, '');
    const noLinks = noHtml.replace(/https?:\/\/\S+|www\.\S+/gi, '');
    return noLinks.slice(0, 180);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const sanitizedBio = sanitizeBio(editForm.bio);
    const validationErrors: { bio?: string; avatar?: string; banner?: string } = {};
    const bannerValid = editForm.banner_id && BANNERS.some(b => b.id === editForm.banner_id);
    if (!bannerValid) validationErrors.banner = 'Lütfen bir banner seçin.';
    if (!editForm.avatar_id) validationErrors.avatar = 'Lütfen bir avatar seçin.';
    if (sanitizedBio.length > 180) validationErrors.bio = 'Bio en fazla 180 karakter olabilir.';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      // Update in database and get fresh data
      const updatedProfile = await db.updateProfile(user.id, {
        bio: sanitizedBio,
        avatar_id: editForm.avatar_id,
        banner_id: editForm.banner_id
      } as any);
      
      // Update global profile context with fresh DB data
      setProfile(updatedProfile);
      
      // Force refresh to ensure all components get updated data
      await refreshProfile();
      
      // Update local form state to match
      setEditForm(prev => ({
        ...prev,
        bio: sanitizedBio,
        avatar_id: editForm.avatar_id,
        banner_id: editForm.banner_id
      }));
      
      setIsEditing(false);
      setErrors({});
      alert('Profil güncellendi!');
    } catch (err: any) {
      console.error('[Profile] Update error:', err);
      alert(`Güncelleme başarısız oldu: ${err?.message || 'Bilinmeyen hata'}`);
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
    const totalEps = history?.length || 0;
    const hours = Math.round((totalEps * 24) / 60);
    const level = Math.floor(totalEps / 10) + 1;
    const xp = (totalEps % 10) * 10;
    return { totalEps, hours, level, xp };
  }, [history]);

  if (status === 'LOADING') return <div className="min-h-screen bg-brand-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-red"></div></div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="bg-brand-black min-h-screen pb-40">
      
      {/* Profile Banner */}
      <div className="relative h-96 w-full overflow-hidden">
        <img src={bannerSrc} className="w-full h-full object-cover opacity-60 blur-[6px]" style={{ objectPosition: 'center 25%' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
      </div>

      <div className="max-w-[1600px] mx-auto px-8 -mt-40 relative z-10">
        
        <div className="flex flex-col xl:flex-row gap-16 items-start">
          
          {/* Sidebar: Identity Card */}
          <div className="w-full xl:w-[400px] space-y-8 flex-shrink-0">
            <div className="bg-brand-surface/70 border border-white/5 p-12 rounded-[3.5rem] text-center shadow-2xl relative overflow-hidden backdrop-blur-md">
              <div className="relative inline-block mb-8">
                <div className="w-48 h-48 bg-brand-red rounded-[3rem] flex items-center justify-center text-6xl font-black text-white shadow-2xl shadow-brand-red/30 ring-8 ring-brand-black transform -rotate-2 hover:rotate-0 transition-all duration-500 overflow-hidden">
                  {avatarSrc ? <img src={avatarSrc} className="w-full h-full object-cover" /> : displayProfile.username?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white text-brand-black text-xs font-black px-4 py-2 rounded-xl shadow-xl border-4 border-brand-black uppercase tracking-widest">LVL {stats.level}</div>
              </div>

              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">{displayProfile.username}</h2>
              <p className="text-brand-red text-[9px] font-black uppercase tracking-[0.4em] mb-8">{profile?.role === 'admin' ? 'SYSTEM ADMIN' : 'ELITE MEMBER'}</p>
              
              <p className="text-gray-400 text-xs italic leading-relaxed mb-10 px-4">"{displayProfile.bio || 'Henüz bir biyografi eklenmemiş.'}"</p>

              <div className="grid grid-cols-2 gap-4 mb-10">
                 <div className="bg-black/20 p-5 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-600 uppercase mb-2">TOPLAM PUAN</p>
                    <p className="text-2xl font-black text-white">{stats.totalEps * 50}</p>
                 </div>
                 <div className="bg-black/20 p-5 rounded-3xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-600 uppercase mb-2">İZLEME</p>
                    <p className="text-2xl font-black text-brand-red italic">{stats.hours}s</p>
                 </div>
              </div>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  PROFİLİ DÜZENLE
                </button>
                <button 
                  onClick={() => signOut()}
                  className="w-full py-5 text-gray-600 hover:text-brand-red text-[9px] font-black uppercase tracking-[0.3em] transition-all"
                >
                  GÜVENLİ ÇIKIŞ
                </button>
              </div>
            </div>

            {/* Recommendations Mini-Widget */}
            <div className="bg-brand-surface border border-white/5 p-8 rounded-[3rem]">
               <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">SİZE ÖZEL</h3>
               <div className="space-y-4">
                 {recommendations?.map(rec => (
                   <Link key={rec.id} to={`/anime/${rec.id}`} className="flex gap-4 group items-center hover:bg-white/5 p-2 rounded-xl transition-all">
                      <img src={rec.cover_image || ''} className="w-12 h-12 object-cover rounded-lg" />
                      <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-black text-white uppercase truncate group-hover:text-brand-red">{rec.title.romaji}</p>
                         <p className="text-[8px] text-gray-500 font-bold uppercase">{rec.genres[0]}</p>
                      </div>
                   </Link>
                 ))}
               </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-12 w-full">
            
            {/* Nav Tabs */}
            <div className="flex gap-10 border-b border-white/5 px-4 overflow-x-auto scrollbar-hide">
               {[
                 { id: 'info', label: 'GENEL BAKIŞ' },
                 { id: 'watchlist', label: 'MY LIST' },
                 { id: 'history', label: 'İZLEME GEÇMİŞİ' }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`pb-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-brand-red' : 'text-gray-600 hover:text-white'}`}
                 >
                   {tab.label}
                   {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-red rounded-full shadow-lg shadow-brand-red/50" />}
                 </button>
               ))}
            </div>

            {/* Tab Panels */}
            <div className="min-h-[600px] animate-fade-in-up">
              {activeTab === 'info' && (
                <div className="space-y-12">
                   {/* Level Progress */}
                   <section className="bg-brand-surface border border-white/5 p-10 rounded-[3rem] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 rounded-full blur-[80px]" />
                      <div className="flex items-end justify-between mb-4 relative z-10">
                         <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">MEVCUT SEVİYE</p>
                            <h3 className="text-4xl font-black text-white italic">LEVEL {stats.level}</h3>
                         </div>
                         <p className="text-brand-red font-black text-xl">{stats.xp}% <span className="text-gray-600 text-xs">/ 100%</span></p>
                      </div>
                      <div className="h-4 bg-black/40 rounded-full overflow-hidden relative z-10">
                         <div className="h-full bg-gradient-to-r from-brand-red to-red-500 w-[40%]" style={{ width: `${stats.xp}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-500 mt-4 font-bold uppercase tracking-widest relative z-10">Bir sonraki seviye için {5 - (history?.length || 0) % 5} bölüm daha izle</p>
                   </section>

                   <section>
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8">SON <span className="text-brand-red">ETKİNLİKLER</span></h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {history?.slice(0, 4).map((h, i) => (
                           <div key={i} className="flex items-center gap-6 p-6 bg-brand-surface border border-white/5 rounded-[2rem]">
                              <img src={h.anime?.cover_image || ''} className="w-16 h-24 object-cover rounded-xl" />
                              <div>
                                 <p className="text-[9px] text-brand-red font-black uppercase tracking-widest mb-1">İZLENDİ</p>
                                 <h4 className="text-sm font-black text-white uppercase italic line-clamp-1">{h.anime?.title.romaji}</h4>
                                 <p className="text-xs text-gray-500 font-bold mt-1">Bölüm {h.episode?.episode_number}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>
              )}

              {activeTab === 'watchlist' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                   {watchlist?.map(entry => (
                     entry.anime && (
                       <div key={entry.id} className="relative group">
                         <AnimeCard anime={entry.anime} />
                         <div className="absolute top-2 right-2 bg-brand-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 z-20">
                            <span className="text-[9px] text-brand-red font-black uppercase tracking-widest">{entry.status}</span>
                         </div>
                       </div>
                     )
                   ))}
                   {(!watchlist || watchlist.length === 0) && (
                     <div className="col-span-full py-40 text-center bg-white/[0.02] rounded-[4rem] border border-dashed border-white/10">
                        <p className="text-xs font-black text-gray-700 uppercase tracking-[0.4em]">Henüz listene anime eklemedin.</p>
                     </div>
                   )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="bg-brand-surface rounded-[3.5rem] border border-white/5 overflow-hidden divide-y divide-white/5">
                   {history?.map((h, i) => (
                     <div key={i} className="flex items-center gap-8 p-8 hover:bg-white/[0.02] transition-all group">
                        <img src={h.anime?.cover_image || ''} className="w-24 h-32 object-cover rounded-2xl border border-white/5 group-hover:scale-105 transition-transform" />
                        <div className="flex-1">
                           <h4 className="text-xl font-black text-white uppercase italic tracking-tighter group-hover:text-brand-red transition-colors">{h.anime?.title.romaji}</h4>
                           <div className="flex gap-4 mt-2">
                             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg">Bölüm {h.episode?.episode_number}</span>
                             <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest py-1">{new Date(h.completed_at).toLocaleDateString('tr-TR')}</span>
                           </div>
                        </div>
                        <Link to={`/watch/${h.anime_id}?season=${h.episode?.season_number || 1}&episode=${h.episode?.episode_number}`} className="w-16 h-16 bg-white/5 hover:bg-brand-red text-white rounded-2xl flex items-center justify-center transition-all">
                           <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </Link>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                   <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest">İPTAL</button>
                   <button type="submit" className="flex-1 bg-brand-red hover:bg-brand-redHover text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-brand-red/20">KAYDET</button>
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
