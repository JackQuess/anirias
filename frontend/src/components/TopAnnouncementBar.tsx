import React, { useLayoutEffect, useRef, useState } from 'react';
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
  label?: string;
  messages?: string[];
  /** Piksel/saniye — yüksek = daha hızlı kayar */
  speed?: number;
  className?: string;
}

function chipKey(prefix: string, text: string, i: number) {
  return `${prefix}-${i}-${text.slice(0, 24)}`;
}

function AnnouncementChips({
  messages,
  idPrefix,
}: {
  messages: string[];
  idPrefix: 'a' | 'b';
}) {
  return (
    <>
      {messages.map((text, i) => (
        <motion.span
          key={chipKey(idPrefix, text, i)}
          className="inline-flex shrink-0 items-center rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/85 shadow-sm sm:px-3 sm:text-[11px] md:tracking-wider"
          whileHover={{
            borderColor: 'rgba(229, 25, 62, 0.45)',
            boxShadow:
              '0 0 0 1px rgba(229, 25, 62, 0.15), 0 4px 20px rgba(229, 25, 62, 0.08)',
            transition: { duration: 0.2 },
          }}
        >
          {text}
        </motion.span>
      ))}
    </>
  );
}

/**
 * Sürekli otomatik yatay kaydırma (marquee / slider) — motion translateX, sonsuz döngü.
 * Hover’da animasyon durur (mevcut konumda).
 */
export const TopAnnouncementBar: React.FC<TopAnnouncementBarProps> = ({
  label = 'DUYURU',
  messages: messagesProp,
  speed = 48,
  className = '',
}) => {
  const messages = messagesProp?.length ? messagesProp : DEFAULT_MESSAGES;
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripW, setStripW] = useState(0);
  const [paused, setPaused] = useState(false);

  const messagesKey = messages.join('\0');

  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const measure = () => setStripW(el.offsetWidth);

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [messagesKey]);

  const durationSec = stripW > 0 && speed > 0 ? stripW / speed : 1;
  const shouldRun = stripW > 0 && !paused;

  return (
    <div
      className={`relative z-[15] w-full border-y border-white/[0.08] bg-black/35 backdrop-blur-md backdrop-saturate-150 ${className}`}
      style={{ minHeight: 48, maxHeight: 56 }}
    >
      <div className="mx-auto flex h-12 max-h-14 min-h-12 sm:h-[52px] md:h-14 max-w-[1920px] items-stretch px-3 sm:px-5 lg:px-8">
        <div className="flex shrink-0 items-center gap-2 border-r border-white/[0.06] pr-3 sm:pr-4">
          <span
            className="hidden h-5 w-0.5 rounded-full sm:block"
            style={{ backgroundColor: ACCENT }}
            aria-hidden
          />
          <span className="font-inter text-[9px] font-black uppercase tracking-[0.28em] text-white/50 sm:text-[10px]">
            {label}
          </span>
        </div>

        <div
          className="relative min-w-0 flex-1 overflow-hidden"
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

          <div className="flex h-full items-center pl-3 sm:pl-4" role="marquee" aria-label="Duyurular">
            <motion.div
              key={messagesKey}
              className="flex w-max items-center gap-2 sm:gap-2.5 md:gap-3 will-change-transform"
              initial={{ x: 0 }}
              animate={
                shouldRun ? { x: [0, -stripW] } : false
              }
              transition={{
                x: {
                  duration: durationSec,
                  repeat: shouldRun ? Infinity : 0,
                  ease: 'linear',
                  repeatType: 'loop',
                },
              }}
            >
              <div
                ref={stripRef}
                className="flex shrink-0 items-center gap-2 sm:gap-2.5 md:gap-3"
              >
                <AnnouncementChips messages={messages} idPrefix="a" />
              </div>
              <div
                className="flex shrink-0 items-center gap-2 sm:gap-2.5 md:gap-3"
                aria-hidden
              >
                <AnnouncementChips messages={messages} idPrefix="b" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopAnnouncementBar;
