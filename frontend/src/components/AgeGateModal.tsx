import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AgeGateModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDeny: () => void;
}

/**
 * Age Gate Modal (+18)
 * 
 * Blocks access to adult content until user confirms they are 18+
 * - Portal rendered above all UI
 * - ESC key disabled
 * - Click outside disabled
 * - Mobile bottom-sheet style
 * - Desktop centered modal
 */
const AgeGateModal: React.FC<AgeGateModalProps> = ({ isOpen, onConfirm, onDeny }) => {
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
    <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center">
      {/* Backdrop - Click disabled */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        style={{ pointerEvents: 'all' }}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full lg:max-w-lg bg-gradient-to-br from-brand-dark via-brand-surface to-brand-dark border-t lg:border border-brand-red/50 lg:rounded-[3rem] rounded-t-[2rem] shadow-[0_0_100px_rgba(229,9,20,0.5)] overflow-hidden"
        style={{ pointerEvents: 'all' }}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-brand-red/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 p-6 lg:p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-brand-red/20 border-2 border-brand-red flex items-center justify-center">
              <span className="text-4xl lg:text-5xl">🔞</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter text-center mb-4">
            <span className="text-brand-red">YAŞ</span> UYARISI
          </h2>

          {/* Description */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <p className="text-white/90 text-sm lg:text-base text-center leading-relaxed">
              Bu içerik <strong className="text-brand-red">18 yaş ve üzeri</strong> kullanıcılar içindir.
            </p>
            <p className="text-white/90 text-sm lg:text-base text-center leading-relaxed mt-2">
              Devam etmek için 18 yaşından büyük olduğunu onaylaman gerekir.
            </p>
          </div>

          {/* Warning text */}
          <p className="text-gray-500 text-xs text-center mb-6">
            Bu tercihin cihazında saklanacak ve bir daha sorulmayacak.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full bg-brand-red hover:bg-brand-redHover active:bg-brand-redHover text-white px-6 py-4 rounded-2xl text-sm lg:text-base font-black uppercase tracking-widest transition-all shadow-2xl shadow-brand-red/50 hover:shadow-brand-red/70 hover:scale-[1.02] active:scale-95 touch-manipulation"
            >
              Evet, 18 Yaşından Büyüğüm
            </button>
            <button
              onClick={onDeny}
              className="w-full bg-white/5 hover:bg-white/10 active:bg-white/10 text-white border border-white/10 px-6 py-4 rounded-2xl text-sm lg:text-base font-black uppercase tracking-widest transition-all hover:border-white/20 active:scale-95 touch-manipulation"
            >
              Hayır
            </button>
          </div>

          {/* Footer note */}
          <p className="text-gray-600 text-[10px] text-center mt-6 uppercase tracking-widest font-bold">
            18 Yaşından Küçükler İçin Uygun Değildir
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AgeGateModal;

