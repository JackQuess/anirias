import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import { useAuth } from '@/services/auth';
import { showToast } from './ToastProvider';

const FeedbackModal: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check localStorage
    const hidden = localStorage.getItem('feedback_modal_hidden');
    if (hidden === 'true') {
      return;
    }

    // Show modal after delay (500-700ms)
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (dontShowAgain) {
      localStorage.setItem('feedback_modal_hidden', 'true');
    }
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

      showToast('Geri bildiriminiz için teşekkürler! 🎉', 'success');
      handleClose();
      setMessage('');
      setRating(null);
    } catch (err: any) {
      console.error('[FeedbackModal] Submit error:', err);
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

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6"
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
        className={`relative w-full max-w-lg bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl ${
          window.innerWidth < 768
            ? 'animate-slide-up max-h-[90vh] overflow-y-auto'
            : 'animate-fade-in-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
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
          <p className="text-gray-400 text-sm leading-relaxed">
            Anirias'ı test ediyoruz! Deneyimlerinizi bizimle paylaşın. Geri bildiriminiz uygulamayı geliştirmemize yardımcı olacak.
          </p>

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
              placeholder="Deneyimlerinizi, önerilerinizi veya sorunları paylaşın..."
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all placeholder:text-gray-700 resize-none"
            />
          </div>

          {/* Don't Show Again Checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="dont-show-again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-5 h-5 rounded bg-white/5 border-white/10 text-brand-red focus:ring-brand-red focus:ring-2"
            />
            <label htmlFor="dont-show-again" className="text-xs text-gray-400 cursor-pointer">
              Bir daha gösterme
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] transition-all"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="flex-1 bg-brand-red hover:bg-brand-redHover text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-brand-red/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
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
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default FeedbackModal;

