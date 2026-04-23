import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

interface MaintenancePageProps {
  message?: string;
  endsAt?: string;
}

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const toCountdownParts = (remainingMs: number): CountdownParts => {
  const safeMs = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
};

const formatFullCountdown = (parts: CountdownParts): string => {
  return `${parts.days} gün ${parts.hours} saat ${parts.minutes} dk ${parts.seconds} sn`;
};

/**
 * Tam ekran bakım sayfası — yalnızca Layout altındaki genel site için.
 * /admin ve giriş sayfaları etkilenmez.
 */
const MaintenancePage: React.FC<MaintenancePageProps> = ({ message, endsAt }) => {
  const targetTimeMs = useMemo(() => {
    if (!endsAt) return null;
    const parsed = new Date(endsAt).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }, [endsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetTimeMs) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [targetTimeMs]);

  const remainingMs = targetTimeMs ? Math.max(0, targetTimeMs - now) : null;
  const countdown = remainingMs !== null ? toCountdownParts(remainingMs) : null;
  const hasCountdown = countdown !== null && remainingMs !== null;
  const countdownFinished = remainingMs === 0;

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
        {hasCountdown ? (
          <div className="mt-6 mb-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {countdownFinished ? (
              <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">
                Planlanan bakım süresi doldu, site kısa süre içinde açılabilir.
              </p>
            ) : (
              <>
                <p className="text-gray-300 text-sm font-bold leading-relaxed">
                  Sitenin açılmasına son <span className="text-white">{formatFullCountdown(countdown)}</span> kaldı.
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-black/40 border border-white/10 py-2">
                    <p className="text-lg font-black text-white">{countdown.days}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Gün</p>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/10 py-2">
                    <p className="text-lg font-black text-white">{countdown.hours}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Saat</p>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/10 py-2">
                    <p className="text-lg font-black text-white">{countdown.minutes}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Dakika</p>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/10 py-2">
                    <p className="text-lg font-black text-white">{countdown.seconds}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">Saniye</p>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
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
