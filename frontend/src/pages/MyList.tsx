import React, { useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bookmark, Play, Clock } from 'lucide-react';
import { useAuth } from '@/services/auth';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import AnimeCard from '@/components/AnimeCard';
import PageHero from '@/components/cinematic/PageHero';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import type { WatchlistEntry, WatchProgress } from '@/types';

const MyList: React.FC = () => {
  const { user, status } = useAuth();

  const fetchContinue = useCallback(async () => {
    if (!user?.id) return [];
    return db.getContinueWatching(user.id);
  }, [user?.id]);

  const fetchList = useCallback(async () => {
    if (!user?.id) return [];
    return db.getWatchlist(user.id);
  }, [user?.id]);

  const { data: progressRows, loading: loadingCw } = useLoad(fetchContinue, [user?.id]);
  const { data: watchlistRows, loading: loadingWl } = useLoad(fetchList, [user?.id]);

  if (status === 'LOADING') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-inter">
        <div className="h-12 w-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const continueItems: WatchProgress[] = progressRows || [];
  const savedItems: WatchlistEntry[] =
    (watchlistRows || []).filter((w) => w.status !== 'watching' && w.anime) ?? [];

  const loading = loadingCw || loadingWl;

  return (
    <div className="min-h-screen bg-background pb-mobile-nav md:pb-12 font-inter">
      <PageHero
        title="Listem"
        description="Daha sonra izlemek için kaydettiğin tüm anime serileri burada. Kendi koleksiyonunu oluştur ve dilediğin zaman izle."
        image="https://images.unsplash.com/photo-1542332213-31f87348057f?auto=format&fit=crop&q=80&w=1920"
        className="rounded-none mb-0 h-[350px] md:h-[450px]"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative z-20">
        {continueItems.length > 0 ? (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-white">İzlemeye Devam Et</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {continueItems.map((item) => {
                const a = item.anime;
                const ep = item.episode;
                if (!a || !ep) return null;
                const title = getDisplayTitle(a.title);
                const slug = a.slug || a.id;
                const sn = ep.season_number ?? 1;
                const en = ep.episode_number;
                const pct =
                  item.duration_seconds > 0
                    ? Math.min(100, (item.progress_seconds / item.duration_seconds) * 100)
                    : 0;
                const banner = proxyImage(a.banner_image || a.cover_image || '');
                return (
                  <Link
                    key={item.episode_id}
                    to={`/watch/${slug}/${sn}/${en}`}
                    className="group bg-surface-elevated rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 shadow-lg"
                  >
                    <div className="relative aspect-video bg-black">
                      <img
                        src={banner}
                        alt={title}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white fill-current" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-white line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                        {title}
                      </h3>
                      <p className="text-sm text-white/60">
                        Bölüm {en} • Kaldığın yer
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bookmark className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-white">Kaydedilenler</h2>
            </div>
            <span className="text-white/50 font-medium bg-white/5 px-3 py-1 rounded-full text-sm">
              {savedItems.length} içerik
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : savedItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {savedItems.map((entry) =>
                entry.anime ? <AnimeCard key={entry.id} anime={entry.anime} /> : null
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-surface-elevated rounded-2xl border border-white/5">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Bookmark className="w-8 h-8 text-white/40" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Listeniz henüz boş</h3>
              <p className="text-white/50 mb-8 max-w-md">
                Henüz listenize bir anime eklemediniz. Katalogdan keşfetmeye başlayın.
              </p>
              <Link
                to="/browse"
                className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all"
              >
                Kataloğa git
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyList;
