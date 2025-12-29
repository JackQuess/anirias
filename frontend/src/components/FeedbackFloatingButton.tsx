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
      return;
    }

    // Login/Signup sayfalarında gösterilmesin
    if (location.pathname === '/login' || location.pathname === '/signup') {
      setIsVisible(false);
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
        return;
      }
    }

    // Welcome modal gösterildiyse 24 saat sonra göster
    const lastShown = localStorage.getItem('welcome_modal_last_shown');
    if (lastShown) {
      const lastShownTime = parseInt(lastShown, 10);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (now - lastShownTime < oneDay) {
        setIsVisible(false);
        return;
      }
    }

    setIsVisible(true);
  }, [location.pathname]);

  const handleClick = () => {
    // Feedback card'ı aç
    window.dispatchEvent(new CustomEvent('open-feedback-card'));
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[9997] bg-brand-red hover:bg-brand-redHover text-white px-6 py-3 rounded-full shadow-2xl shadow-brand-red/30 font-black text-sm uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
      aria-label="Geri Bildirim Gönder"
    >
      <span className="text-lg">💬</span>
      <span className="hidden sm:inline">Geri Bildirim</span>
    </button>
  );
};

export default FeedbackFloatingButton;

