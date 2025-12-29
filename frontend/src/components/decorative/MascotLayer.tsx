import React from 'react';
import { useMascotSettings } from '@/hooks/useMascotSettings';

export type MascotType = 'rias' | 'lightning' | 'light' | 'angel';

interface MascotLayerProps {
  type: MascotType;
  className?: string;
  showCondition?: boolean;
}

/**
 * MascotLayer - Subtle, atmospheric decorative mascots
 * Very low opacity, slow animations, background decoration only
 * Never overlaps UI elements
 * Respects admin-controlled settings
 */
const MascotLayer: React.FC<MascotLayerProps> = ({ 
  type, 
  className = '',
  showCondition = true 
}) => {
  const settings = useMascotSettings();

  // Don't render if condition is false
  if (!showCondition) return null;

  // Check global enabled flag
  if (!settings.enabled) return null;

  // Check individual mascot flag
  const mascotEnabled = settings[type];
  if (!mascotEnabled) return null;

  const mascotConfig = {
    rias: {
      src: '/assets/mascots/rias.png',
      alt: 'Rias - ANIRIAS Brand Mascot',
      opacity: 'opacity-25',
      size: 'h-[120px] md:h-[180px] w-auto',
      animation: 'animate-mascot-float-subtle',
    },
    lightning: {
      src: '/assets/mascots/lightning.png',
      alt: 'Lightning Girl',
      opacity: 'opacity-[0.18]',
      size: 'h-[200px] w-auto',
      animation: '',
    },
    light: {
      src: '/assets/mascots/light.png',
      alt: 'Light Girl',
      opacity: 'opacity-[0.22]',
      size: 'h-[250px] w-auto',
      animation: '',
    },
    angel: {
      src: '/assets/mascots/angel.png',
      alt: 'Angel Boy',
      opacity: 'opacity-20',
      size: 'h-[180px] md:h-[220px] w-auto',
      animation: 'animate-mascot-scale-in',
    },
  };

  const config = mascotConfig[type];

  return (
    <img
      src={config.src}
      alt={config.alt}
      loading="lazy"
      className={`
        pointer-events-none
        select-none
        ${config.opacity}
        ${config.size}
        ${config.animation}
        ${className}
      `}
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default MascotLayer;

