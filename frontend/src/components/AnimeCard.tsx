
import React from 'react';
import { Link } from 'react-router-dom';
import { Anime, Episode } from '../types';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { translateGenre } from '@/utils/genreTranslations';

interface AnimeCardProps {
  anime: Anime;
  episode?: Episode;
  rank?: number;
  featured?: boolean;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, episode, rank, featured }) => {
  const title = getDisplayTitle(anime.title);
  const cover = anime.cover_image || '';
  const coverSrc = proxyImage(cover);
  const seasonNumber = episode?.season_number || 1;
  const link = episode 
    ? `/watch/${anime.slug || anime.id}/${seasonNumber}/${episode.episode_number}` 
    : `/anime/${anime.slug || anime.id}`;
  
  return (
    <Link to={link} className={`group relative flex flex-col w-full flex-shrink-0 ${featured ? 'md:col-span-2' : ''}`}>
      {/* Rank Number (If Top 10) */}
      {rank && (
        <>
           <span className="absolute -left-4 bottom-8 text-[120px] md:text-[160px] font-black leading-none italic text-transparent z-0 select-none transition-all lg:group-hover:-translate-x-2" style={{ WebkitTextStroke: '2px #333' }}>
            {rank}
           </span>
           <span className="absolute -left-4 bottom-8 text-[120px] md:text-[160px] font-black leading-none italic text-brand-red/10 lg:group-hover:text-brand-red z-0 select-none opacity-0 lg:group-hover:opacity-100 transition-all duration-500 lg:group-hover:-translate-x-2 hidden lg:block">
            {rank}
           </span>
        </>
      )}

      {/* Main Card Container */}
      <div className={`relative w-full rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/5 transition-all duration-500 lg:group-hover:border-brand-red lg:group-hover:shadow-[0_0_30px_rgba(229,9,20,0.3)] bg-brand-surface z-10 ${episode ? 'aspect-[4/5]' : 'aspect-[2/3]'}`}>
        
        {/* Image */}
        <img 
          src={coverSrc} 
          referrerPolicy="no-referrer" 
          className="w-full h-full object-cover transition-transform duration-700 lg:group-hover:scale-110 lg:group-hover:rotate-1" 
          alt={title}
          onError={(e) => {
            // Hide image on error - gradient background will show
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        
        {/* Dark Gradient Overlay - Always visible on mobile to show text */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-brand-black/20 to-transparent opacity-100 lg:opacity-60 lg:group-hover:opacity-90 transition-opacity duration-300" />
        
        {/* Play Icon Overlay (Desktop Hover Only) */}
        <div className="absolute inset-0 hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100">
           <div className="w-16 h-16 bg-brand-red/90 text-white rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm border border-white/20">
              <svg className="w-6 h-6 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
           </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-row gap-2 flex-wrap">
           {episode ? (
             <>
               <span className="bg-brand-red text-white text-[9px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-lg shadow-lg uppercase tracking-widest animate-pulse">
                  YENİ
               </span>
               {(episode.seasons?.season_number ?? episode.season_number) && (
                 <span className="bg-gray-800/80 backdrop-blur-md text-gray-300 text-[8px] md:text-[9px] font-black px-2 md:px-2.5 py-1 rounded-lg border border-gray-700/50 uppercase tracking-wide">
                  {(episode.seasons?.season_number ?? episode.season_number)}. Sezon
               </span>
               )}
             </>
           ) : (
             <span className="bg-white/10 backdrop-blur-md text-white text-[8px] md:text-[9px] font-black px-2 py-1 rounded border border-white/10">
                HD
             </span>
           )}
        </div>

        {/* Rating Badge */}
        <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-brand-black/60 backdrop-blur-md text-brand-red text-[9px] md:text-[10px] font-black px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1 lg:group-hover:bg-brand-red lg:group-hover:text-white transition-colors">
          <span>★</span> {anime.score}
        </div>

        {/* Bottom Content Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5 transform lg:translate-y-2 lg:group-hover:translate-y-0 transition-transform duration-300">
          
          {episode && (
             <p className="text-[8px] md:text-[9px] font-black text-white uppercase tracking-widest mb-1">
               {episode.season_number ? `S${episode.season_number} E${episode.episode_number}` : `BÖLÜM ${episode.episode_number}`}
             </p>
          )}

          {!episode && (
             <p className="text-[8px] md:text-[9px] font-black text-brand-red uppercase tracking-widest mb-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 delay-75 transform lg:translate-y-2 lg:group-hover:translate-y-0">
               {anime.genres?.[0] ? translateGenre(anime.genres[0]) : ''}
             </p>
          )}

          <h3 className={`text-white font-black uppercase italic tracking-tight leading-none mb-1 md:mb-2 drop-shadow-lg ${episode ? 'text-sm md:text-lg line-clamp-2' : 'text-sm md:text-xl truncate'}`}>
            {title}
          </h3>

          <div className="flex items-center gap-2 md:gap-3 opacity-90 lg:opacity-80 lg:group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] md:text-[10px] text-gray-300 font-bold">{anime.year}</span>
            <span className="w-1 h-1 bg-gray-500 rounded-full" />
            <span className="text-[9px] md:text-[10px] text-gray-300 font-bold">{episode ? '24dk' : 'TV Serisi'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AnimeCard;
