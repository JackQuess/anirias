import React from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { getDisplayTitle } from '@/utils/title';
import { hasSupabaseEnv } from '@/services/supabaseClient';
import type { SiteTrafficSummary } from '@/types';

interface DashboardStats {
  totalUsers: number;
  totalAnimes: number;
  totalViews: number;
  totalEpisodes: number;
}

const AdminAnalytics: React.FC = () => {
  const { data: stats, loading: statsLoading, error, reload } = useLoad<DashboardStats>(db.getStats);
  const { data: topAnimes, loading: listLoading } = useLoad(() => db.getAllAnimes('view_count'));
  const { data: traffic, loading: trafficLoading, reload: reloadTraffic } = useLoad<SiteTrafficSummary | null>(
    db.getSiteTrafficSummary
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Platform <span className="text-brand-red">Analitiği</span></h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">İzlenme ve etkileşim verilerini takip et</p>
      </div>

      {error ? <ErrorState message={error.message} onRetry={reload} /> : null}

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

      <div>
        <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-2">
          Site <span className="text-brand-red">trafiği</span>
        </h2>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6">
          Son 24 saat ve 7 gün: sayfa görüntüleme ve yaklaşık benzersiz oturum (tarayıcı sekmesi)
        </p>

        {!hasSupabaseEnv ? (
          <p className="text-gray-500 text-sm">Supabase bağlı değilken trafik kaydı yapılmaz.</p>
        ) : trafficLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <LoadingSkeleton type="card" count={4} />
          </div>
        ) : traffic == null ? (
          <div className="bg-brand-dark border border-brand-border rounded-2xl p-6 space-y-3">
            <p className="text-white font-bold text-sm">Trafik verisi yüklenemedi</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Supabase&apos;te <code className="text-gray-400">site_page_views</code> tablosu ve{' '}
              <code className="text-gray-400">admin_site_traffic_summary</code> fonksiyonu yoksa bu alan boş kalır.
              Repo içindeki{' '}
              <code className="text-gray-400">supabase/sql/create_site_page_views.sql</code> dosyasını SQL Editor&apos;de
              bir kez çalıştırın, ardından yenileyin.
            </p>
            <button
              type="button"
              onClick={() => reloadTraffic()}
              className="text-xs font-black uppercase tracking-widest text-brand-red hover:underline"
            >
              Tekrar dene
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Görüntüleme (24s)', value: traffic.viewsLast24h, color: 'text-brand-red' },
              { label: 'Görüntüleme (7 gün)', value: traffic.viewsLast7d, color: 'text-white' },
              { label: 'Oturum ~ (24s)', value: traffic.uniqueSessions24h, color: 'text-white' },
              { label: 'Oturum ~ (7 gün)', value: traffic.uniqueSessions7d, color: 'text-white' },
            ].map((row) => (
              <div key={row.label} className="bg-brand-dark border border-brand-border p-6 rounded-2xl">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{row.label}</p>
                <p className={`text-3xl font-black mt-2 ${row.color}`}>{row.value.toLocaleString('tr-TR')}</p>
              </div>
            ))}
          </div>
        )}
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

        <div className="bg-brand-dark border border-brand-border rounded-3xl p-8">
          <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 border-l-4 border-brand-red pl-4">
            Popüler sayfalar (7 gün)
          </h2>
          {trafficLoading || traffic == null ? (
            <p className="text-gray-500 text-xs font-bold uppercase">
              {traffic == null && !trafficLoading
                ? 'Trafik tablosu kurulunca burada listelenir.'
                : 'Yükleniyor...'}
            </p>
          ) : traffic.topPaths.length === 0 ? (
            <p className="text-gray-500 text-xs">Henüz kayıt yok. Ziyaretçiler gezdikçe dolar.</p>
          ) : (
            <div className="space-y-4">
              {traffic.topPaths.map((row, idx) => {
                const max = traffic!.topPaths[0]?.count || 1;
                return (
                  <div key={`${row.path}-${idx}`} className="flex items-start gap-3 group">
                    <span className="text-lg font-black text-gray-800 group-hover:text-brand-red transition-colors w-6 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono text-[11px] truncate" title={row.path}>
                        {row.path}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1 bg-brand-border rounded-full flex-1 overflow-hidden">
                          <div
                            className="h-full bg-brand-red"
                            style={{ width: `${Math.min(100, (row.count / max) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-brand-red shrink-0">{row.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
