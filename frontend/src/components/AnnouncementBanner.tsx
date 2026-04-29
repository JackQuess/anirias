import React, { useState, useEffect } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';

const AnnouncementBanner: React.FC = () => {
  const { data: maintenance } = useLoad(() => db.getSiteSetting('maintenance'));
  const { data: announcement } = useLoad(() => db.getActiveAnnouncement());
  const [isDismissed, setIsDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!announcement) return;

    // Check if user has dismissed this announcement
    const dismissedKey = `announcement_hidden_${announcement.id}`;
    const dismissed = localStorage.getItem(dismissedKey) === 'true';
    setIsDismissed(dismissed);
  }, [announcement]);

  const handleDismiss = () => {
    if (!announcement) return;

    const dismissedKey = `announcement_hidden_${announcement.id}`;

    if (dontShowAgain) {
      localStorage.setItem(dismissedKey, 'true');
    }
    // Always close immediately; localStorage decides persistence.
    setIsDismissed(true);
  };

  const handleBackdropClick = () => {
    handleDismiss();
  };

  const maintenanceOn =
    maintenance &&
    typeof maintenance === 'object' &&
    (maintenance as { enabled?: boolean }).enabled === true;

  if (maintenanceOn || !announcement || isDismissed) return null;

  useEffect(() => {
    if (!announcement || isDismissed) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [announcement, isDismissed, dontShowAgain]);

  useEffect(() => {
    if (!announcement || isDismissed) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [announcement, isDismissed]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        className="w-full max-w-2xl rounded-2xl border border-brand-red/40 bg-[#130407] shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-brand-red/95 to-brand-red/80 rounded-t-2xl px-5 py-4 md:px-6">
          <h3 id="announcement-title" className="text-base md:text-lg font-black text-white uppercase tracking-tight">
            {announcement.title}
          </h3>
        </div>
        <div className="px-5 py-5 md:px-6 md:py-6">
          <p className="text-sm md:text-base text-white/90 leading-relaxed whitespace-pre-line">
            {announcement.message}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-white/80 text-[11px] md:text-xs font-bold uppercase tracking-widest cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-white/10 checked:bg-brand-red focus:ring-2 focus:ring-white/50"
              />
              Bir daha gösterme
            </label>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-xl bg-brand-red px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-brand-red/90 active:scale-95"
              aria-label="Duyuruyu kapat"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;

