
import React, { useState } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import AnimeCard from '../components/AnimeCard';

const NewEpisodes: React.FC = () => {
  const { data: episodes, loading, error, reload } = useLoad(db.getLatestEpisodes);
  
  return (
    <div className="min-h-screen bg-brand-black pb-40">
       {/* Hero Banner */}
       <section className="relative py-32 px-8 overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-brand-red/5" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-red/20 rounded-full blur-[120px]" />
          
          <div className="max-w-[1600px] mx-auto relative z-10">
             <div className="inline-block px-4 py-2 bg-brand-red/10 text-brand-red text-[10px] font-black uppercase tracking-widest rounded-xl mb-4 border border-brand-red/20">
                GÜNCEL İÇERİK
             </div>
             <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter mb-6">
                YENİ <span className="text-brand-red">BÖLÜMLER</span>
             </h1>
             <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] max-w-xl leading-relaxed">
                Japonya ile aynı anda yayınlanan en yeni bölümleri kaçırma.
             </p>
          </div>
       </section>

       <div className="max-w-[1600px] mx-auto px-8 mt-16">
          {loading && (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                <LoadingSkeleton type="card" count={10} />
             </div>
          )}
          
          {error && <ErrorState message={error.message} onRetry={reload} />}

          {!loading && episodes && (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
                {episodes.map(ep => (
                   ep.anime && <AnimeCard key={ep.id} anime={ep.anime} episode={ep} />
                ))}
             </div>
          )}

          {!loading && episodes?.length === 0 && (
             <div className="text-center py-20 border border-dashed border-white/10 rounded-[3rem] bg-white/[0.02]">
                <p className="text-gray-500 font-black uppercase tracking-widest">Henüz yeni bölüm eklenmedi.</p>
             </div>
          )}
       </div>
    </div>
  );
};

export default NewEpisodes;
