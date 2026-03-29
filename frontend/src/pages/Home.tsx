import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { translateGenre } from '@/utils/genreTranslations';
import MascotLayer from '../components/decorative/MascotLayer';
import HomeHeroCinematic from '@/components/home/HomeHeroCinematic';
import HomeContentRail from '@/components/home/HomeContentRail';
import AnimeCard from '../components/AnimeCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

const Home: React.FC = () => {
  const { data: allAnimes, loading: allAnimesLoading } = useLoad(() => db.getAllAnimes('created_at', 50), []);

  const newSeasons = useMemo(() => {
    if (!allAnimes) return [];
    return [...allAnimes].sort((a, b) => {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return bDate - aDate;
    });
  }, [allAnimes]);

  const discoverGenres = useMemo(
    () =>
      (['Action', 'Fantasy', 'Drama', 'Supernatural'] as const).map((en) => ({
        en,
        label: translateGenre(en),
        href: `/browse?genre=${encodeURIComponent(translateGenre(en))}`,
      })),
    []
  );

  return (
    <div className="w-full min-h-screen bg-app-bg pb-28 font-inter">
      <HomeHeroCinematic />

      <div className="relative z-10 space-y-2 md:space-y-4 pb-12 pt-6 md:pt-10">
        <HomeContentRail title="İzlemeye Devam Et" type="continue" />
        <HomeContentRail title="Yeni Bölümler" type="new" seeAllHref="/new-episodes" />
        <HomeContentRail title="Gündemdeki Top 10" type="trending" seeAllHref="/browse" />
        <HomeContentRail title="Senin İçin Önerilenler" type="recommended" seeAllHref="/browse" />
        <HomeContentRail title="Listem" type="list" seeAllHref="/profile" />
        <HomeContentRail title="Popüler İçerikler" type="popular" seeAllHref="/browse" />

        <section className="max-w-[1600px] mx-auto px-6 md:px-14 pt-4 relative">
          <div className="absolute top-1/2 right-0 -translate-y-1/2 z-0 hidden xl:block pointer-events-none">
            <MascotLayer type="light" />
          </div>
          <div className="flex items-center gap-4 mb-6 flex-wrap relative z-10">
            <div className="w-1 h-8 bg-brand-red shadow-[0_0_12px_rgba(229,9,20,0.35)] shrink-0" />
            <h2 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
              Yeni <span className="text-brand-red">sezonlar</span>
            </h2>
            <div className="flex-1 h-px bg-white/5 min-w-[2rem]" />
          </div>
          {allAnimesLoading ? (
            <LoadingSkeleton type="card" count={5} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 relative z-10">
              {newSeasons.slice(0, 5).map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          )}
        </section>

        <section className="max-w-[1600px] mx-auto px-6 md:px-14 mt-10">
          <div className="bg-gradient-to-br from-app-surface to-app-bg border border-white/5 rounded-[2rem] md:rounded-[3rem] p-8 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-brand-red/5 rounded-full blur-[80px] md:blur-[100px] pointer-events-none" />
            <div className="text-center mb-8 md:mb-12 relative z-10">
              <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter">
                Tarzını <span className="text-brand-red">keşfet</span>
              </h2>
              <p className="text-white/40 text-[9px] md:text-[10px] font-black uppercase tracking-[0.35em] mt-4">
                Favori kategorinden hemen izlemeye başla
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative z-10">
              {discoverGenres.map(({ en, label, href }) => (
                <Link
                  key={en}
                  to={href}
                  className="group relative h-28 md:h-36 rounded-2xl md:rounded-3xl overflow-hidden flex items-center justify-center border border-white/10 hover:border-brand-red/45 transition-all bg-black/35"
                >
                  <div className="absolute inset-0 bg-brand-red/0 group-hover:bg-brand-red/10 transition-all duration-500" />
                  <span className="relative z-10 text-base md:text-lg font-black text-white italic tracking-widest group-hover:scale-105 transition-transform">
                    {label.toUpperCase()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
