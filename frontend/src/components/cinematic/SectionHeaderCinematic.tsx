import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderCinematicProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

/** Zip-style rail title: accent bar + italic uppercase heading. */
const SectionHeaderCinematic: React.FC<SectionHeaderCinematicProps> = ({
  title,
  subtitle,
  right,
  className,
}) => (
  <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between font-inter', className)}>
    <div className="flex items-start gap-4 min-w-0">
      <div className="w-1 h-8 sm:h-10 bg-primary shadow-[0_0_12px_rgba(229,9,20,0.35)] shrink-0 mt-1 rounded-full" />
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-[10px] sm:text-[11px] font-bold text-white/45 uppercase tracking-[0.28em] mt-2 max-w-2xl">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
    {right ? <div className="shrink-0 flex items-center gap-2">{right}</div> : null}
  </div>
);

export default SectionHeaderCinematic;
