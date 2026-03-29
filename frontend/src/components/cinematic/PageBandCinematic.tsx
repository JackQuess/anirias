import React from 'react';
import { cn } from '@/lib/utils';

export interface PageBandCinematicProps {
  accent?: string;
  title: React.ReactNode;
  titleHighlight?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

/**
 * Full-width top band (zip / NewEpisodes / Calendar style): gradient wash + big display type.
 */
const PageBandCinematic: React.FC<PageBandCinematicProps> = ({
  accent = 'ÖNE ÇIKAN',
  title,
  titleHighlight,
  description,
  className,
}) => (
  <section
    className={cn(
      'relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-primary/[0.07] to-transparent pb-12 pt-24 md:pt-28 font-inter',
      className
    )}
  >
    <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
    <div className="relative z-10 mx-auto max-w-[1600px] px-6 md:px-14">
      <div className="inline-block rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-primary mb-4">
        {accent}
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase italic tracking-tighter text-white leading-[0.95]">
        {title}
        {titleHighlight ? <span className="text-primary"> {titleHighlight}</span> : null}
      </h1>
      {description ? (
        <p className="mt-5 max-w-2xl text-xs font-bold uppercase tracking-[0.3em] text-white/50 leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  </section>
);

export default PageBandCinematic;
