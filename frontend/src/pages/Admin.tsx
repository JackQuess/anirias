
import React, { useState } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import ErrorState from '../components/ErrorState';
import { Link } from 'react-router-dom';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { getDisplayTitle } from '@/utils/title';
import { ActivityLog } from '@/types';
import AdminNotificationBell from '@/components/AdminNotificationBell';
import { getAdminToken } from '@/utils/adminToken';

interface DashboardStats {
  totalUsers: number;
  totalAnimes: number;
  totalViews: number;
  totalEpisodes: number;
}

const Admin: React.FC = () => {
  const { data: stats, loading, error, reload } = useLoad<DashboardStats>(db.getStats);
  const { data: featuredAnimes, reload: reloadFeatured } = useLoad(db.getFeaturedAnimes);
  const { data: allAnimes, reload: reloadAllAnimes } = useLoad(() => db.getAllAnimes('created_at'));
  const { data: activities, loading: activitiesLoading } = useLoad<ActivityLog[]>(db.getRecentActivities);

  const [heroSearch, setHeroSearch] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Mock Data for "Live" graphs
  const serverLoad = [45, 60, 35, 70, 55, 80, 65, 50, 45, 60, 75, 55];

  const handleToggleFeatured = async (id: string, currentStatus: boolean | undefined) => {
    setIsUpdating(true);
    try {
      await db.toggleFeatured(id, !currentStatus);
      await Promise.all([reloadFeatured(), reloadAllAnimes()]);
    } catch (e: any) {
      alert(`İşlem başarısız: ${e?.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const searchResults = heroSearch
    ? allAnimes?.filter(a => {
        const t = getDisplayTitle(a.title);
        return t.toLowerCase().includes(heroSearch.toLowerCase()) && !a.is_featured;
      })
    : [];

  // Admin token from central store (for notification bell)
  const adminToken = getAdminToken() ?? '';

  return (
    <div className="space-y-6 lg:space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 lg:gap-6 pb-4 lg:pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center flex-wrap gap-2 lg:gap-3 mb-2">
            <span className="px-2 lg:px-3 py-1 bg-brand-red/10 text-brand-red text-[8px] lg:text-[9px] font-black uppercase tracking-widest rounded-lg border border-brand-red/20">v2.4.0 Stable</span>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
          </div>
          <h1 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter">
            KOMUTA <span className="text-brand-red">MERKEZİ</span>
          </h1>
        </div>
        
        {/* Admin Notification Bell & Clock */}
        <div className="flex items-center justify-between md:justify-end gap-4">
          {adminToken && <AdminNotificationBell adminToken={adminToken} />}
          <div className="text-left md:text-right">
            <p className="text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest">SUNUCU SAATİ</p>
            <p className="text-base lg:text-xl font-mono text-white font-bold">{new Date().toLocaleTimeString('tr-TR')}</p>
          </div>
        </div>
      </header>

      {/* Hero Management Widget (NEW) */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl lg:rounded-[3rem] p-4 lg:p-10 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/5 rounded-full blur-[100px] pointer-events-none" />
         
         <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 lg:mb-10 relative z-20 gap-4 lg:gap-6">
            <div>
               <h3 className="text-lg lg:text-2xl font-black text-white uppercase tracking-tighter italic">VİTRİN <span className="text-brand-red">YÖNETİMİ</span></h3>
               <p className="text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Ana sayfa slider alanında gösterilen içerikler</p>
            </div>
            
            <div className="relative w-full md:w-80 z-30">
               <input 
                 type="text" 
                 placeholder="VİTRİNE EKLE..." 
                 value={heroSearch}
                 onChange={(e) => setHeroSearch(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-xs font-bold text-white uppercase tracking-widest outline-none focus:border-brand-red relative z-30"
               />
               {heroSearch && searchResults && searchResults.length > 0 && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-brand-surface border border-brand-border rounded-2xl p-2 z-[100] shadow-2xl max-h-60 overflow-y-auto">
                    {searchResults.map(a => (
                       <button 
                         key={a.id}
                         onClick={() => { handleToggleFeatured(a.id, false); setHeroSearch(''); }}
                         className="w-full text-left p-3 hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors"
                       >
                          <img src={a.cover_image || ''} className="w-8 h-10 object-cover rounded" />
                          <span className="text-[10px] font-black text-white uppercase truncate">{getDisplayTitle(a.title)}</span>
                          <span className="ml-auto text-[8px] bg-brand-red text-white px-2 py-1 rounded">EKLE</span>
                       </button>
                    ))}
                 </div>
               )}
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-6 relative z-0">
            {featuredAnimes?.map((anime) => (
               <div key={anime.id} className="group relative aspect-video rounded-xl lg:rounded-2xl overflow-hidden border border-white/10 hover:border-brand-red transition-all">
                  <img src={anime.banner_image || anime.cover_image || ''} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 lg:bottom-4 left-2 lg:left-4 right-2 lg:right-4">
                     <p className="text-[9px] lg:text-[10px] font-black text-white uppercase truncate">{getDisplayTitle(anime.title)}</p>
                     <p className="text-[7px] lg:text-[8px] text-gray-400 font-bold uppercase mt-1">SLIDER AKTİF</p>
                  </div>
                  <button 
                    onClick={() => handleToggleFeatured(anime.id, true)}
                    className="absolute top-2 right-2 bg-red-500/80 active:bg-red-500 lg:hover:bg-red-500 text-white p-2 lg:p-2 rounded-lg lg:opacity-0 lg:group-hover:opacity-100 transition-opacity touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Vitrinden Kaldır"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
            ))}
            {(!featuredAnimes || featuredAnimes.length === 0) && (
               <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                  <p className="text-gray-500 font-black text-xs uppercase tracking-widest">Vitrinde hiç anime yok.</p>
               </div>
            )}
         </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-pulse">
           {[1,2,3,4].map(i => <div key={i} className="h-40 bg-brand-dark rounded-[2.5rem] border border-white/5"></div>)}
        </div>
      ) : error ? (
        <ErrorState message={`Veriler yüklenemedi: ${error.message}`} onRetry={reload} />
      ) : stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'TOPLAM ÜYE', value: stats.totalUsers, icon: '👤', change: '+12%', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'TOPLAM ANİME', value: stats.totalAnimes, icon: '🎬', change: '+5', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
            { label: 'TOPLAM İZLENME', value: stats.totalViews, icon: '🔥', change: '+24%', color: 'text-brand-red', bg: 'bg-brand-red/10 border-brand-red/20' },
            { label: 'BÖLÜM SAYISI', value: stats.totalEpisodes, icon: '🎞️', change: '+8', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
          ].map(stat => (
            <div key={stat.label} className={`p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border backdrop-blur-sm relative overflow-hidden group lg:hover:-translate-y-1 transition-transform duration-300 ${stat.bg}`}>
               <div className="flex justify-between items-start mb-3 lg:mb-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-black/20 flex items-center justify-center text-xl lg:text-2xl">
                     {stat.icon}
                  </div>
                  <span className={`px-2 lg:px-3 py-0.5 lg:py-1 rounded-lg text-[8px] lg:text-[9px] font-black bg-black/20 ${stat.color}`}>
                     {stat.change}
                  </span>
               </div>
               <p className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
               <p className="text-2xl lg:text-4xl font-black text-white tracking-tight">{stat.value.toLocaleString()}</p>
               
               {/* Decorative Background Icon */}
               <div className="absolute -right-6 -bottom-6 text-7xl lg:text-9xl opacity-[0.03] grayscale group-hover:opacity-[0.07] transition-opacity rotate-12 pointer-events-none">
                 {stat.icon}
               </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Graph Area (Server Load Simulation) */}
        <div className="xl:col-span-2 bg-[#0a0a0a] border border-white/5 p-4 lg:p-10 rounded-2xl lg:rounded-[3rem] shadow-2xl relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
           <div className="flex items-center justify-between mb-6 lg:mb-10 relative z-10">
              <div>
                 <h3 className="text-base lg:text-xl font-black text-white uppercase tracking-tighter italic">SUNUCU <span className="text-brand-red">YÜKÜ</span></h3>
                 <p className="text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">CANLI METRİKLER (CPU / RAM)</p>
              </div>
              <div className="flex gap-2">
                 <span className="w-2 lg:w-3 h-2 lg:h-3 bg-brand-red rounded-full animate-pulse" />
                 <span className="text-[9px] lg:text-[10px] font-black text-brand-red uppercase tracking-widest">LIVE</span>
              </div>
           </div>

           <div className="flex items-end justify-between gap-1 lg:gap-2 h-40 lg:h-64 w-full">
              {serverLoad.map((val, i) => (
                 <div key={i} className="w-full bg-white/5 rounded-t-xl relative group overflow-hidden">
                    <div 
                       className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brand-red/80 to-brand-red/20 transition-all duration-1000 ease-in-out group-hover:bg-brand-red"
                       style={{ height: `${val}%` }}
                    />
                 </div>
              ))}
           </div>
           
           <div className="flex justify-between mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-white/5 relative z-10">
              <div className="text-center w-full border-r border-white/5">
                 <p className="text-[8px] lg:text-[9px] font-black text-gray-600 uppercase tracking-widest">CPU</p>
                 <p className="text-lg lg:text-2xl font-black text-white">42%</p>
              </div>
              <div className="text-center w-full border-r border-white/5">
                 <p className="text-[8px] lg:text-[9px] font-black text-gray-600 uppercase tracking-widest">RAM</p>
                 <p className="text-lg lg:text-2xl font-black text-white">6.2GB</p>
              </div>
              <div className="text-center w-full">
                 <p className="text-[8px] lg:text-[9px] font-black text-gray-600 uppercase tracking-widest">LATENCY</p>
                 <p className="text-lg lg:text-2xl font-black text-brand-red">24ms</p>
              </div>
           </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#0a0a0a] border border-white/5 p-4 lg:p-10 rounded-2xl lg:rounded-[3rem] shadow-2xl flex flex-col relative overflow-hidden">
           <h3 className="text-base lg:text-xl font-black text-white uppercase tracking-tighter italic mb-4 lg:mb-8 relative z-10">HIZLI <span className="text-brand-red">İŞLEMLER</span></h3>
           
           <div className="grid grid-cols-2 gap-2 lg:gap-4 flex-1 relative z-10">
              <Link to="/admin/animes/new" className="bg-white/5 active:bg-brand-red lg:hover:bg-brand-red text-gray-400 active:text-white lg:hover:text-white border border-white/5 rounded-xl lg:rounded-[2rem] p-4 lg:p-6 flex flex-col items-center justify-center gap-2 lg:gap-3 transition-all group min-h-[100px] touch-manipulation">
                 <span className="text-2xl lg:text-3xl group-hover:scale-110 transition-transform">➕</span>
                 <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-center">Anime Ekle</span>
              </Link>
              <Link to="/admin/import" className="bg-white/5 active:bg-purple-600 lg:hover:bg-purple-600 text-gray-400 active:text-white lg:hover:text-white border border-white/5 rounded-xl lg:rounded-[2rem] p-4 lg:p-6 flex flex-col items-center justify-center gap-2 lg:gap-3 transition-all group min-h-[100px] touch-manipulation">
                 <span className="text-2xl lg:text-3xl group-hover:scale-110 transition-transform">🤖</span>
                 <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-center">AI Import</span>
              </Link>
              <Link to="/admin/users" className="bg-white/5 active:bg-blue-600 lg:hover:bg-blue-600 text-gray-400 active:text-white lg:hover:text-white border border-white/5 rounded-xl lg:rounded-[2rem] p-4 lg:p-6 flex flex-col items-center justify-center gap-2 lg:gap-3 transition-all group min-h-[100px] touch-manipulation">
                 <span className="text-2xl lg:text-3xl group-hover:scale-110 transition-transform">👥</span>
                 <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-center">Üyeler</span>
              </Link>
              <Link to="/admin/analytics" className="bg-white/5 active:bg-emerald-600 lg:hover:bg-emerald-600 text-gray-400 active:text-white lg:hover:text-white border border-white/5 rounded-xl lg:rounded-[2rem] p-4 lg:p-6 flex flex-col items-center justify-center gap-2 lg:gap-3 transition-all group min-h-[100px] touch-manipulation">
                 <span className="text-2xl lg:text-3xl group-hover:scale-110 transition-transform">📊</span>
                 <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-center">Raporlar</span>
              </Link>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* System Status Table */}
         <div className="bg-brand-surface border border-white/5 p-4 lg:p-10 rounded-2xl lg:rounded-[3rem]">
            <h3 className="text-xs lg:text-sm font-black text-white uppercase tracking-widest italic mb-4 lg:mb-8 border-l-4 border-brand-red pl-4">SİSTEM DURUMU</h3>
            <div className="space-y-4">
               {[
                 { name: 'Database (Supabase)', status: 'Operational', uptime: '99.9%', color: 'bg-green-500' },
                 { name: 'Storage (CDN)', status: 'Operational', uptime: '99.9%', color: 'bg-green-500' },
                 { name: 'Auth Service', status: 'Operational', uptime: '100%', color: 'bg-green-500' },
                 { name: 'AI Worker', status: 'Idle', uptime: '98%', color: 'bg-yellow-500' },
               ].map((sys, i) => (
                 <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 lg:p-5 bg-white/[0.02] rounded-xl lg:rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-colors gap-2">
                    <div className="flex items-center gap-3 lg:gap-4">
                       <div className={`w-2 h-2 rounded-full ${sys.color} animate-pulse flex-shrink-0`} />
                       <span className="text-[9px] lg:text-[10px] font-black text-white uppercase tracking-widest">{sys.name}</span>
                    </div>
                    <div className="flex gap-4 lg:gap-6 ml-5 sm:ml-0">
                       <span className="text-[9px] lg:text-[10px] font-bold text-gray-500 uppercase">{sys.status}</span>
                       <span className="text-[9px] lg:text-[10px] font-black text-white">{sys.uptime}</span>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Recent Activity */}
         <div className="bg-brand-surface border border-white/5 p-4 lg:p-10 rounded-2xl lg:rounded-[3rem]">
            <h3 className="text-xs lg:text-sm font-black text-white uppercase tracking-widest italic mb-4 lg:mb-8 border-l-4 border-brand-red pl-4">SON İŞLEMLER</h3>
            <div className="space-y-4 lg:space-y-6 relative">
               <div className="absolute left-2.5 top-2 bottom-2 w-px bg-white/10" />
               {activitiesLoading && <LoadingSkeleton type="list" count={4} />}
               {!activitiesLoading && activities?.length ? activities.map((log) => (
                 <div key={log.id} className="flex items-start gap-4 lg:gap-6 relative">
                    <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-brand-black border-2 border-brand-red z-10 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                       <p className="text-[9px] lg:text-[10px] font-black text-white uppercase tracking-wide">{log.action}</p>
                       <p className="text-[10px] lg:text-xs text-gray-500 mt-1 truncate">{log.target} - <span className="text-brand-red">{log.user}</span></p>
                       <p className="text-[8px] lg:text-[9px] text-gray-700 font-bold mt-1">{new Date(log.created_at).toLocaleString('tr-TR')}</p>
                    </div>
                 </div>
               )) : (!activitiesLoading && (
                 <p className="text-center text-gray-600 text-[10px] lg:text-xs font-black uppercase tracking-widest">Kayıt bulunamadı</p>
               ))}
            </div>
         </div>

      </div>
    </div>
  );
};

export default Admin;
