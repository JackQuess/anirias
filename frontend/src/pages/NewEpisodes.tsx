
import React, { useEffect, useRef } from 'react';
import { useInfiniteEpisodes } from '@/hooks/useInfiniteEpisodes';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import AnimeCard from '../components/AnimeCard';
import PageHero from '@/components/cinematic/PageHero';

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
    <div className="min-h-screen bg-background pb-40 font-inter">
      <PageHero
        title="Yeni Bölümler"
        description="En sevdiğin anime serilerinin en yeni bölümlerini keşfet. Güncel kal, hiçbir anı kaçırma."
        image="https://images.unsplash.com/photo-1578632738981-4330c7091f35?auto=format&fit=crop&q=80&w=1920"
        className="rounded-none mb-0 h-[400px] md:h-[500px]"
      />

      <div className="max-w-[1600px] mx-auto px-4 md:px-12 -mt-20 relative z-20 pt-4 md:pt-6">
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
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl bg-surface-elevated/40">
            <p className="text-muted font-black uppercase tracking-widest">Henüz yeni bölüm eklenmedi.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewEpisodes;
