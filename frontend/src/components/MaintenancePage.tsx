import React from 'react';
import { Link } from 'react-router-dom';

interface MaintenancePageProps {
  message?: string;
}

/**
 * Tam ekran bakım sayfası — yalnızca Layout altındaki genel site için.
 * /admin ve giriş sayfaları etkilenmez.
 */
const MaintenancePage: React.FC<MaintenancePageProps> = ({ message }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16 text-center font-inter">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(153,0,17,0.12)_0%,_transparent_55%)] pointer-events-none" />
      <div className="relative z-10 max-w-lg">
        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-red/15 border border-brand-red/30 text-brand-red">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter mb-3">
          Bakım <span className="text-brand-red">Modunda</span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-2">
          {message?.trim()
            ? message
            : 'Sitemiz şu anda kısa süreli bakımda. Yakında tekrar buradayız.'}
        </p>
        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mt-6 mb-8">
          Yönetici misiniz? Giriş yaparak panele ulaşabilirsiniz.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/login?returnUrl=/admin"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-brand-red text-white text-xs font-black uppercase tracking-widest hover:bg-brand-red/90 transition-colors"
          >
            Giriş Yap
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl border border-white/15 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors"
          >
            Yenile
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
