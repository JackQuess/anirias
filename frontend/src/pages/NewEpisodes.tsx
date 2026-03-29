
import React, { useEffect, useRef } from 'react';
import { useInfiniteEpisodes } from '@/hooks/useInfiniteEpisodes';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import AnimeCard from '../components/AnimeCard';
import PageBandCinematic from '@/components/cinematic/PageBandCinematic';

const NewEpisodes: React.FC = () => {
  const { episodes, loading, loadingMore, hasMore, error, loadMore, reload } = useInfiniteEpisodes();
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, loadMore]);

  return (
    <div className="min-h-screen bg-app-bg pb-40 font-inter">
      <PageBandCinematic
        accent="Güncel içerik"
        title="Yeni"
        titleHighlight="bölümler"
        description="Japonya ile aynı anda yayınlanan en yeni bölümleri kaçırma."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-14 mt-12 md:mt-16">
        {loading && episodes.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
            <LoadingSkeleton type="card" count={24} />
          </div>
        )}

        {error && <ErrorState message={error.message} onRetry={reload} />}

        {episodes.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
              {episodes.map((ep) =>
                ep.anime ? <AnimeCard key={ep.id} anime={ep.anime} episode={ep} /> : null
              )}
            </div>

            {loadingMore && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12 mt-12">
                <LoadingSkeleton type="card" count={24} />
              </div>
            )}

            <div ref={observerTarget} className="h-4" />
          </>
        )}

        {!loading && episodes.length === 0 && !error && (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-[3rem] bg-app-surface/30">
            <p className="text-gray-500 font-black uppercase tracking-widest">Henüz yeni bölüm eklenmedi.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewEpisodes;
