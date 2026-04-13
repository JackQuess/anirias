import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

const ACCENT = '#e5193e';

const DEFAULT_MESSAGES = [
  '4K Yakında',
  'Yeni Importer Sistemi',
  'Takvim Özelliği Geliyor',
  'Premium Güncellemeler',
  'Çoklu Dil Altyazıları',
  'Performans İyileştirmeleri',
];

export interface TopAnnouncementBarProps {
  /** Sol etiket */
  label?: string;
  /** Kaydırmalı duyuru metinleri */
  messages?: string[];
  /** Otomatik kaydırma hızı (px/s) */
  speed?: number;
  className?: string;
}

/**
 * İnce yatay duyuru şeridi — navbar ile hero arası.
 * Animasyon: motion/react (Framer Motion API uyumlu).
 */
export const TopAnnouncementBar: React.FC<TopAnnouncementBarProps> = ({
  label = 'DUYURU',
  messages: messagesProp,
  speed = 22,
  className = '',
}) => {
  const messages = messagesProp?.length ? messagesProp : DEFAULT_MESSAGES;
  const loop = [...messages, ...messages];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const onWheelCapture = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.currentTarget.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      if (!paused && el.scrollWidth > el.clientWidth) {
        const half = el.scrollWidth / 2;
        if (half > 0) {
          el.scrollLeft += speed * delta;
          if (el.scrollLeft >= half - 0.5) {
            el.scrollLeft -= half;
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, speed, messages.length]);

  return (
    <div
      className={`relative z-[15] w-full border-y border-white/[0.08] bg-black/35 backdrop-blur-md backdrop-saturate-150 ${className}`}
      style={{ minHeight: 48, maxHeight: 56 }}
    >
      <div className="mx-auto flex h-12 max-h-14 min-h-12 sm:h-[52px] md:h-14 max-w-[1920px] items-stretch px-3 sm:px-5 lg:px-8">
        {/* Sol etiket */}
        <div className="flex shrink-0 items-center gap-2 border-r border-white/[0.06] pr-3 sm:pr-4">
          <span
            className="hidden h-5 w-0.5 rounded-full sm:block"
            style={{ backgroundColor: ACCENT }}
            aria-hidden
          />
          <span
            className="font-inter text-[9px] font-black uppercase tracking-[0.28em] text-white/50 sm:text-[10px]"
            style={{ letterSpacing: '0.22em' }}
          >
            {label}
          </span>
        </div>

        {/* Kaydırmalı şerit */}
        <div
          className="relative min-w-0 flex-1"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#08080c]/95 to-transparent sm:w-12"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#08080c]/95 to-transparent sm:w-12"
            aria-hidden
          />

          <div
            ref={scrollRef}
            onWheel={onWheelCapture}
            className="announcement-bar-scroll flex h-full touch-pan-x items-center gap-2 overflow-x-auto overflow-y-hidden pl-3 sm:gap-2.5 sm:pl-4 md:gap-3"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            role="marquee"
            aria-label="Duyurular"
          >
            {loop.map((text, i) => (
              <motion.span
                key={`${text}-${i}`}
                className="inline-flex shrink-0 items-center rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/85 shadow-sm sm:px-3 sm:text-[11px] md:tracking-wider"
                whileHover={{
                  borderColor: 'rgba(229, 25, 62, 0.45)',
                  boxShadow: `0 0 0 1px rgba(229, 25, 62, 0.15), 0 4px 20px rgba(229, 25, 62, 0.08)`,
                  transition: { duration: 0.2 },
                }}
              >
                {text}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .announcement-bar-scroll::-webkit-scrollbar { display: none; height: 0; }
      `}</style>
    </div>
  );
};

export default TopAnnouncementBar;
