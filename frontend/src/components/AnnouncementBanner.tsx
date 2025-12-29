import React, { useState, useEffect } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { Announcement } from '@/types';

const AnnouncementBanner: React.FC = () => {
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
    } else {
      // Just hide for this session
      setIsDismissed(true);
    }
  };

  if (!announcement || isDismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[300] bg-gradient-to-r from-brand-red/90 to-brand-red/80 backdrop-blur-md border-b border-brand-red/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tighter mb-1">
              {announcement.title}
            </h3>
            <p className="text-xs md:text-sm text-white/90 leading-relaxed">
              {announcement.message}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="flex items-center gap-2 text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-widest cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3 h-3 rounded border-white/30 bg-white/10 checked:bg-brand-red focus:ring-2 focus:ring-white/50"
              />
              <span className="hidden md:inline">Bir daha gösterme</span>
              <span className="md:hidden">Gizle</span>
            </label>
            
            <button
              onClick={handleDismiss}
              className="p-1.5 md:p-2 text-white hover:bg-white/20 rounded-lg transition-all active:scale-95"
              aria-label="Kapat"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;

