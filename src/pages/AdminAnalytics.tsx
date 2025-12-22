
import React from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { getDisplayTitle } from '@/utils/title';

// Fix: Defined DashboardStats interface for better typing
interface DashboardStats {
  totalUsers: number;
  totalAnimes: number;
  totalViews: number;
  totalEpisodes: number;
}

const AdminAnalytics: React.FC = () => {
  // Fix: Added generic type DashboardStats to useLoad
  const { data: stats, loading: statsLoading, error, reload } = useLoad<DashboardStats>(db.getStats);
  const { data: topAnimes, loading: listLoading } = useLoad(() => db.getAllAnimes('view_count'));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Platform <span className="text-brand-red">Analitiği</span></h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">İzlenme ve etkileşim verilerini takip et</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Toplam İzlenme', value: stats?.totalViews || 0, color: 'text-brand-red' },
          { label: 'Kullanıcı Sayısı', value: stats?.totalUsers || 0, color: 'text-white' },
          { label: 'Anime Sayısı', value: stats?.totalAnimes || 0, color: 'text-white' },
          { label: 'Bölüm Sayısı', value: stats?.totalEpisodes || 0, color: 'text-white' },
        ].map(stat => (
          <div key={stat.label} className="bg-brand-dark border border-brand-border p-8 rounded-3xl">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
            <p className={`text-4xl font-black mt-2 ${stat.color}`}>{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-brand-dark border border-brand-border rounded-3xl p-8">
          <h2 className="text-sm font-black text-white uppercase tracking-widest mb-8 border-l-4 border-brand-red pl-4">En Çok İzlenenler</h2>
          <div className="space-y-6">
            {listLoading && <LoadingSkeleton type="list" count={5} />}
            {topAnimes?.slice(0, 5).map((anime, idx) => {
              const titleString = getDisplayTitle(anime.title);
              const maxViews = topAnimes[0]?.view_count || 1;
              return (
                <div key={anime.id} className="flex items-center gap-4 group">
                  <span className="text-2xl font-black text-gray-800 group-hover:text-brand-red transition-colors w-8">{idx + 1}</span>
                  <img src={anime.cover_image || ''} className="w-12 h-16 object-cover rounded-lg border border-brand-border" alt={titleString} />
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm uppercase">{titleString}</p>
                    <div className="flex items-center gap-2">
                      <div className="h-1 bg-brand-border rounded-full flex-1 overflow-hidden">
                         <div 
                          className="h-full bg-brand-red" 
                          style={{ width: `${(anime.view_count / maxViews) * 100}%` }} 
                         />
                      </div>
                      <span className="text-[10px] font-black text-brand-red">{anime.view_count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-brand-dark border border-brand-border rounded-3xl p-8 flex items-center justify-center text-center">
           <div>
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h3 className="text-white font-black uppercase tracking-widest">Büyüme Raporu</h3>
              <p className="text-gray-500 text-xs font-bold uppercase mt-2">Detaylı raporlar yakında eklenecek.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
