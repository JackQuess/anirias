import React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeroProps {
  title: string;
  description?: string;
  image?: string;
  className?: string;
}

/** Zip catalog / inner-page hero band */
const PageHero: React.FC<PageHeroProps> = ({ title, description, image, className }) => {
  return (
    <div
      className={cn(
        'relative w-full h-[300px] md:h-[400px] overflow-hidden rounded-2xl mb-12',
        className
      )}
    >
      <div className="absolute inset-0">
        <img
          src={image || 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=1920'}
          alt={title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative h-full flex flex-col justify-center px-6 md:px-12 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-white drop-shadow-2xl">{title}</h1>
        {description ? (
          <p className="text-base sm:text-lg font-medium max-w-xl line-clamp-3 text-muted">{description}</p>
        ) : null}
      </div>
    </div>
  );
};

export default PageHero;
