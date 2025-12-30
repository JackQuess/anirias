import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AgeGateModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDeny: () => void;
  isConfirming?: boolean;
}

/**
 * Age Gate Modal (+18) - Compact & Mobile-Friendly
 * 
 * - Max width: 420px desktop, 92vw mobile
 * - localStorage-based persistence (anirias_age_verified)
 * - ESC and click outside disabled for security
 * - Portal rendered above all UI
 */
const AgeGateModal: React.FC<AgeGateModalProps> = ({ isOpen, onConfirm, onDeny, isConfirming = false }) => {
  // Disable ESC key and background scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable ESC key
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center p-4">
      {/* Backdrop - Click disabled for security */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        style={{ pointerEvents: 'all' }}
        aria-hidden="true"
      />
      
      {/* Modal - Compact design */}
      <div 
        className="relative w-full max-w-[420px] bg-brand-surface border border-brand-red/50 rounded-t-[1.5rem] lg:rounded-[2rem] shadow-2xl overflow-hidden"
        style={{ pointerEvents: 'all' }}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-red/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 p-6 lg:p-8">
          {/* Icon - Smaller */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 lg:w-18 lg:h-18 rounded-full bg-brand-red/20 border-2 border-brand-red flex items-center justify-center">
              <span className="text-3xl lg:text-4xl">🔞</span>
            </div>
          </div>

          {/* Title - Compact */}
          <h2 className="text-xl lg:text-2xl font-black text-white uppercase italic tracking-tighter text-center mb-3">
            <span className="text-brand-red">+18</span> İçerik
          </h2>

          {/* Description - Short */}
          <p className="text-white/90 text-sm text-center leading-relaxed mb-6 px-2">
            Bu içerik <strong className="text-brand-red">18 yaş ve üzeri</strong> kullanıcılar içindir.
            Devam etmek için 18 yaşından büyük olduğunu onaylaman gerekir.
          </p>

          {/* Buttons - Compact */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="w-full bg-brand-red hover:bg-brand-redHover active:bg-brand-redHover text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-red/50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            >
              {isConfirming ? 'ONAYLANIYOR...' : 'Evet, 18+'}
            </button>
            <button
              onClick={onDeny}
              className="w-full bg-white/5 hover:bg-white/10 active:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all hover:border-white/20 active:scale-95 min-h-[44px] touch-manipulation"
            >
              Hayır
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AgeGateModal;
