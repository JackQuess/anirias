import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
import { showToast } from './ToastProvider';

/**
 * Feedback Card / Bottom Sheet
 * Floating button veya welcome modal'dan açılır
 */
const FeedbackCard: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Custom event listener for opening feedback card
    const handleOpenFeedback = () => {
      setIsOpen(true);
    };

    window.addEventListener('open-feedback-card', handleOpenFeedback);
    return () => {
      window.removeEventListener('open-feedback-card', handleOpenFeedback);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setMessage('');
    setRating(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Lütfen geri bildiriminizi yazın', 'error');
      return;
    }

    if (!hasSupabaseEnv || !supabase) {
      showToast('Bağlantı hatası. Lütfen daha sonra tekrar deneyin.', 'error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id || null,
        message: message.trim(),
        rating: rating || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      // Feedback gönderildi - 14 gün boyunca tekrar gösterilmesin
      localStorage.setItem('feedback_submitted_at', Date.now().toString());
      
      showToast('Geri bildiriminiz için teşekkürler! 🎉', 'success');
      handleClose();
    } catch (err: any) {
      console.error('[FeedbackCard] Submit error:', err);
      showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const isMobile = window.innerWidth < 768;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />

      {/* Card Content */}
      <div
        className={`relative w-full ${
          isMobile ? 'max-h-[85vh] rounded-t-[2.5rem]' : 'max-w-lg rounded-[2.5rem]'
        } bg-brand-surface border border-brand-border shadow-2xl ${
          isMobile ? 'animate-slide-up' : 'animate-fade-in-up'
        } overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-brand-surface border-b border-white/5 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            🧪 Anirias <span className="text-brand-red">Test Sürecinde</span>
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            aria-label="Kapat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-3">
            <p className="text-gray-300 text-sm leading-relaxed">
              Deneyimini daha iyi hale getirmek için
              geri bildirimlerini gerçekten önemsiyoruz.
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              Yazdığın her mesaj okunur ve değerlendirilir.
            </p>
          </div>

          {/* Rating (Optional) */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">
              Değerlendirme (Opsiyonel)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    rating && rating >= star
                      ? 'bg-brand-red text-white'
                      : 'bg-white/5 text-gray-500 hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Message (Required) */}
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
              Geri Bildiriminiz <span className="text-brand-red">*</span>
            </label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bir hata, öneri ya da fikir yazabilirsin…"
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all placeholder:text-gray-700 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="w-full bg-brand-red hover:bg-brand-redHover text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-brand-red/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              'Gönder'
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default FeedbackCard;

