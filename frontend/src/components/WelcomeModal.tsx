import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';

/**
 * Welcome Modal - Sadece ilk girişte gösterilir
 * Kullanıcıyı feedback göndermeye zorlamaz
 */
const WelcomeModal: React.FC = () => {
  const location = useLocation();
  const { data: maintenance } = useLoad(() => db.getSiteSetting('maintenance'));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const maintenanceOn =
      maintenance &&
      typeof maintenance === 'object' &&
      (maintenance as { enabled?: boolean }).enabled === true;
    if (maintenanceOn) {
      setIsOpen(false);
      return;
    }

    // Admin panel'de açılmasın
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    // Login/Signup sayfalarında açılmasın
    if (location.pathname === '/login' || location.pathname === '/signup') {
      return;
    }

    // Eğer feedback gönderildiyse ASLA açılma
    const feedbackSubmitted = localStorage.getItem('feedback_submitted_at');
    if (feedbackSubmitted) {
      return;
    }

    // İlk giriş kontrolü - daha önce gösterildi mi?
    const lastShown = localStorage.getItem('welcome_modal_last_shown');
    if (lastShown) {
      // 24 saat içinde gösterildiyse tekrar gösterme
      const lastShownTime = parseInt(lastShown, 10);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - lastShownTime < oneDay) {
        return;
      }
    }

    // Show modal after delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [location.pathname, maintenance]);

  const handleClose = () => {
    setIsOpen(false);
    // Son gösterim zamanını kaydet (feedback göndermeden kapattı)
    localStorage.setItem('welcome_modal_last_shown', Date.now().toString());
  };

  const handleFeedback = () => {
    setIsOpen(false);
    // Feedback card'ı açmak için event dispatch et
    window.dispatchEvent(new CustomEvent('open-feedback-card'));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />

      {/* Modal Content */}
      <div
        className={`relative w-full max-w-md bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl ${
          window.innerWidth < 768
            ? 'animate-slide-up'
            : 'animate-fade-in-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 text-center border-b border-white/5">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            Anirias'a <span className="text-brand-red">Hoş Geldin</span>
          </h2>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="space-y-4 text-center">
            <p className="text-gray-300 text-base leading-relaxed">
              Anirias şu anda <span className="text-brand-red font-bold">test sürecindedir</span>.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Amacımız, en iyi anime deneyimini birlikte oluşturmak.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Karşılaştığın hataları, önerilerini ve fikirlerini bizimle paylaşırsan
              hepsini tek tek inceliyor ve ciddiye alıyoruz.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleFeedback}
              className="w-full bg-brand-red hover:bg-brand-redHover text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-brand-red/20 transition-all active:scale-95"
            >
              Geri Bildirim Gönder
            </button>
            <button
              onClick={handleClose}
              className="w-full bg-white/5 hover:bg-white/10 text-gray-400 font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all"
            >
              Şimdilik Geç
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WelcomeModal;

