import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Feedback Floating Button - Sağ alt köşe
 * Her zaman görünür (admin panel hariç)
 */
const FeedbackFloatingButton: React.FC = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Admin panel'de gösterilmesin
    if (location.pathname.startsWith('/admin')) {
      setIsVisible(false);
      if (import.meta.env.DEV) console.log('[FeedbackFloatingButton] Hidden: Admin panel');
      return;
    }

    // Login/Signup sayfalarında gösterilmesin
    if (location.pathname === '/login' || location.pathname === '/signup') {
      setIsVisible(false);
      if (import.meta.env.DEV) console.log('[FeedbackFloatingButton] Hidden: Login/Signup page');
      return;
    }

    // Feedback gönderildiyse 14 gün boyunca gösterme
    const feedbackSubmitted = localStorage.getItem('feedback_submitted_at');
    if (feedbackSubmitted) {
      const submittedTime = parseInt(feedbackSubmitted, 10);
      const now = Date.now();
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      
      if (now - submittedTime < fourteenDays) {
        setIsVisible(false);
        if (import.meta.env.DEV) console.log('[FeedbackFloatingButton] Hidden: Feedback submitted within 14 days');
        return;
      }
    }

    // Diğer tüm durumlarda göster
    setIsVisible(true);
    if (import.meta.env.DEV) console.log('[FeedbackFloatingButton] Visible');
  }, [location.pathname]);

  const handleClick = () => {
    // Feedback card'ı aç
    window.dispatchEvent(new CustomEvent('open-feedback-card'));
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[9999] bg-brand-red hover:bg-brand-redHover text-white px-6 py-3 rounded-full shadow-2xl shadow-brand-red/30 font-black text-sm uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
      style={{ zIndex: 9999 }}
      aria-label="Geri Bildirim Gönder"
    >
      <span className="text-lg">💬</span>
      <span className="hidden sm:inline">Geri Bildirim</span>
    </button>
  );
};

export default FeedbackFloatingButton;

