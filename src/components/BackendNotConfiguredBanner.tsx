
import React from 'react';

const BackendNotConfiguredBanner: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-600 to-orange-700 text-white p-5 z-[9999] shadow-2xl border-t border-white/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2 rounded-full animate-pulse">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-black text-xs uppercase tracking-widest">Backend Yapılandırması Eksik</p>
            <p className="text-sm opacity-90 font-medium">Supabase URL veya Anon Key bulunamadı. Lütfen <code>.env</code> dosyanızı kontrol edin.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <code className="bg-black/30 px-3 py-1.5 rounded-lg text-[10px] font-mono border border-white/10">VITE_SUPABASE_URL</code>
          <code className="bg-black/30 px-3 py-1.5 rounded-lg text-[10px] font-mono border border-white/10">VITE_SUPABASE_ANON_KEY</code>
        </div>
      </div>
    </div>
  );
};

export default BackendNotConfiguredBanner;
