import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/services/auth';
import { DESKTOP_DOWNLOAD_URL } from '@/config/desktop';

const DesktopAccess: React.FC = () => {
  const { user, status, activePlan } = useAuth();

  if (status === 'LOADING') {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-red" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isProMax = activePlan === 'pro_max';

  return (
    <div className="min-h-screen bg-brand-black px-4 md:px-8 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tight">
            Desktop <span className="text-brand-red">Access</span>
          </h1>
          <p className="text-gray-400 mt-3 text-sm">
            Masaustu uygulamasi indir, ac ve 6 haneli kod ile hesabinla eslestir.
          </p>
        </div>

        <div className="bg-brand-surface border border-white/10 rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em]">Aktif Plan</p>
            <span
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                isProMax ? 'bg-brand-red text-white' : 'bg-white/10 text-gray-300'
              }`}
            >
              {isProMax ? 'PRO MAX' : activePlan.toUpperCase()}
            </span>
          </div>

          {isProMax ? (
            <div className="space-y-6">
              <a
                href={DESKTOP_DOWNLOAD_URL || '#'}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center justify-center px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.18em] transition-all ${
                  DESKTOP_DOWNLOAD_URL
                    ? 'bg-brand-red text-white hover:bg-brand-redHover'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed pointer-events-none'
                }`}
              >
                Desktop Uygulamasini Indir
              </a>

              {!DESKTOP_DOWNLOAD_URL && (
                <p className="text-amber-400 text-xs">
                  Indirme linki henuz tanimli degil. `VITE_DESKTOP_DOWNLOAD_URL` ayarini yapin.
                </p>
              )}

              <div className="bg-black/20 border border-white/5 rounded-2xl p-5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Kurulum Adimlari</p>
                <ol className="space-y-2 text-sm text-gray-200 list-decimal list-inside">
                  <li>Uygulamayi indir</li>
                  <li>Desktop uygulamasini ac</li>
                  <li>Ekranda 6 haneli kodu gor</li>
                  <li>Hesabinla eslestir ve giris yap</li>
                </ol>
              </div>

              <Link
                to="/profile"
                className="inline-block text-xs font-black uppercase tracking-[0.15em] text-brand-red hover:text-white"
              >
                Cihaz yonetimi icin profile git
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-white font-black uppercase tracking-wider mb-2">Desktop erisimi kilitli</p>
                <p className="text-gray-400 text-sm">Desktop erisimi PRO MAX uyelige dahildir.</p>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-brand-red text-white font-black text-xs uppercase tracking-[0.18em] hover:bg-brand-redHover transition-all"
              >
                PRO MAX'a Yukselt
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopAccess;

