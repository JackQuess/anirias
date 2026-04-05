import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface PageHeroProps {
  title: string;
  description?: string;
  /** Tek görsel (varsayılan; `imageUrls` yoksa veya boşsa kullanılır) */
  image?: string;
  /** Dönen arka planlar (ör. katalog — vitrin/popüler kapaklar) */
  imageUrls?: string[];
  className?: string;
}

const DEFAULT_BG =
  'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=1920';

/** Zip catalog / inner-page hero band — opsiyonel çoklu görsel, hero ile uyumlu gradient + cover */
const PageHero: React.FC<PageHeroProps> = ({ title, description, image, imageUrls, className }) => {
  const resolvedUrls = useMemo(() => {
    const fromPool = imageUrls?.filter((u) => u && !u.startsWith('data:')) ?? [];
    if (fromPool.length > 0) return fromPool;
    return [image || DEFAULT_BG];
  }, [imageUrls, image]);

  const [idx, setIdx] = useState(0);
  const activeIdx = Math.min(idx, Math.max(0, resolvedUrls.length - 1));
  const activeSrc = resolvedUrls[activeIdx] ?? DEFAULT_BG;

  const poolKey = useMemo(() => resolvedUrls.join('\0'), [resolvedUrls]);
  useEffect(() => {
    setIdx(0);
  }, [poolKey]);

  useEffect(() => {
    if (resolvedUrls.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % resolvedUrls.length);
    }, 7500);
    return () => clearInterval(t);
  }, [resolvedUrls.length]);

  return (
    <div
      className={cn(
        'relative w-full min-h-[260px] h-[min(42vh,520px)] sm:min-h-[300px] sm:h-[min(40vh,540px)] md:h-[min(46vh,560px)] max-h-[600px] overflow-hidden rounded-2xl mb-12',
        className
      )}
    >
      <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden>
        {/* Hafif büyütme: kenarlarda boşluk / %100 uyum için object-cover */}
        <div className="absolute inset-0">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={`${activeSrc}-${activeIdx}`}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                src={activeSrc}
                alt=""
                className="absolute inset-0 h-full w-full min-h-full min-w-full object-cover object-center scale-[1.03] sm:scale-100"
                referrerPolicy="no-referrer"
                decoding="async"
                fetchPriority="high"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  if (el.src !== DEFAULT_BG) el.src = DEFAULT_BG;
                  else el.style.display = 'none';
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent w-[85%] sm:w-[80%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="relative z-10 h-full min-h-0 flex flex-col justify-center px-4 sm:px-6 md:px-12 max-w-3xl py-10 sm:py-12">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter mb-3 sm:mb-4 text-white drop-shadow-2xl leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm sm:text-base md:text-lg font-medium max-w-xl text-white/85 line-clamp-4 md:line-clamp-3 drop-shadow-md">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default PageHero;
