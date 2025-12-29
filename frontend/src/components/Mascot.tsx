import React from 'react';

export type MascotType = 'rias' | 'lightning' | 'light' | 'angel';

interface MascotProps {
  type: MascotType;
  position: 'footer-left' | 'watch-top-right' | 'home-right' | 'auth-bottom-right';
  className?: string;
}

/**
 * Mascot Component - Dekoratif karakter görselleri
 * UI öğelerinin altında, tıklanamaz, sadece görsel amaçlı
 */
const Mascot: React.FC<MascotProps> = ({ type, position, className = '' }) => {
  const mascotConfig = {
    rias: {
      src: '/assets/mascots/rias.png',
      alt: 'Rias - ANIRIAS Mascot',
    },
    lightning: {
      src: '/assets/mascots/lightning.png',
      alt: 'Lightning Girl',
    },
    light: {
      src: '/assets/mascots/light.png',
      alt: 'Light Girl',
    },
    angel: {
      src: '/assets/mascots/angel.png',
      alt: 'Angel Boy',
    },
  };

  const config = mascotConfig[type];

  // Position-based styling
  const positionStyles = {
    'footer-left': 'fixed bottom-0 left-0 z-0 opacity-90 pointer-events-none',
    'watch-top-right': 'absolute top-0 right-0 z-0 opacity-80 pointer-events-none hidden lg:block',
    'home-right': 'absolute top-1/2 right-0 -translate-y-1/2 z-0 opacity-70 pointer-events-none hidden xl:block',
    'auth-bottom-right': 'fixed bottom-0 right-0 z-0 opacity-75 pointer-events-none',
  };

  // Animation classes
  const animationClass = position === 'footer-left' ? 'animate-mascot-float' : '';

  // Size classes based on position
  const sizeClasses = {
    'footer-left': 'h-[140px] md:h-[250px] w-auto', // Mobile: 70% of desktop (175px ≈ 140px)
    'watch-top-right': 'h-[180px] w-auto',
    'home-right': 'h-[300px] w-auto',
    'auth-bottom-right': 'h-[200px] md:h-[250px] w-auto',
  };

  return (
    <img
      src={config.src}
      alt={config.alt}
      loading="lazy"
      className={`
        ${positionStyles[position]}
        ${animationClass}
        ${sizeClasses[position]}
        ${className}
      `}
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default Mascot;

