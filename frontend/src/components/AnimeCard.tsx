
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

// Netflix-Style SVG Number Paths (1-10)
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  // SVG paths for bold italic numbers 1-10
  const numberPaths: Record<number, string> = {
    1: "M35 10 L45 10 L45 90 L60 90 L60 100 L20 100 L20 90 L35 90 Z",
    2: "M20 25 Q20 10 40 10 Q60 10 60 25 Q60 35 50 45 L25 70 L25 85 L60 85 L60 100 L15 100 L15 65 L45 35 Q50 30 50 25 Q50 20 40 20 Q30 20 30 25 L30 30 L20 30 Z",
    3: "M20 20 Q20 10 40 10 Q60 10 60 25 Q60 35 50 40 Q60 45 60 60 Q60 100 30 100 Q15 100 15 85 L25 85 Q25 90 35 90 Q50 90 50 70 Q50 50 35 50 L30 50 L30 40 L35 40 Q48 40 48 25 Q48 20 40 20 Q32 20 32 25 L32 30 L20 30 Z",
    4: "M45 10 L45 70 L60 70 L60 85 L45 85 L45 100 L35 100 L35 85 L15 85 L15 70 L35 10 Z M35 25 L25 70 L35 70 Z",
    5: "M55 10 L55 20 L25 20 L25 45 L40 45 Q60 45 60 65 Q60 100 35 100 Q15 100 15 85 L25 85 Q25 90 35 90 Q50 90 50 70 Q50 55 35 55 L15 55 L15 10 Z",
    6: "M40 10 Q60 10 60 25 L50 25 Q50 20 40 20 Q30 20 25 30 L25 55 Q30 45 40 45 Q60 45 60 70 Q60 100 35 100 Q15 100 15 70 Q15 30 25 20 Q30 10 40 10 Z M25 70 Q25 90 40 90 Q50 90 50 70 Q50 55 40 55 Q25 55 25 70 Z",
    7: "M20 10 L60 10 L60 20 L35 100 L23 100 L48 20 L20 20 Z",
    8: "M40 10 Q60 10 60 30 Q60 40 50 45 Q60 50 60 70 Q60 100 35 100 Q15 100 15 70 Q15 50 25 45 Q15 40 15 30 Q15 10 40 10 Z M25 30 Q25 40 40 40 Q50 40 50 30 Q50 20 40 20 Q25 20 25 30 Z M25 70 Q25 90 40 90 Q50 90 50 70 Q50 50 40 50 Q25 50 25 70 Z",
    9: "M40 10 Q60 10 60 40 Q60 80 50 90 Q40 100 30 100 Q15 100 15 85 L25 85 Q25 90 35 90 Q45 90 50 80 L50 55 Q45 65 35 65 Q15 65 15 40 Q15 10 40 10 Z M50 40 Q50 20 35 20 Q25 20 25 40 Q25 55 35 55 Q50 55 50 40 Z",
    10: "M20 30 Q20 10 35 10 Q50 10 50 30 L50 80 Q50 100 35 100 Q20 100 20 80 Z M30 80 Q30 90 35 90 Q40 90 40 80 L40 30 Q40 20 35 20 Q30 20 30 30 Z M55 30 Q55 10 70 10 Q85 10 85 30 L85 80 Q85 100 70 100 Q55 100 55 80 Z M65 80 Q65 90 70 90 Q75 90 75 80 L75 30 Q75 20 70 20 Q65 20 65 30 Z"
  };

  return (
    <div className="absolute -left-6 md:-left-8 bottom-6 md:bottom-8 w-20 md:w-28 h-24 md:h-32 z-0 select-none pointer-events-none">
      <svg
        viewBox="0 0 100 110"
        className="w-full h-full drop-shadow-2xl"
        style={{ 
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))',
          transform: 'skewY(-2deg)'
        }}
      >
        {/* Background stroke (thick white border) */}
        <path
          d={numberPaths[rank] || numberPaths[1]}
          fill="none"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Main number (dark fill) */}
        <path
          d={numberPaths[rank] || numberPaths[1]}
          fill="#1a1a1a"
          stroke="#2a2a2a"
          strokeWidth="2"
        />
        {/* Inner highlight */}
        <path
          d={numberPaths[rank] || numberPaths[1]}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          transform="translate(-1, -1)"
        />
      </svg>
    </div>
  );
};

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
      {/* Netflix-Style Rank Badge */}
      {rank && <RankBadge rank={rank} />}

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
