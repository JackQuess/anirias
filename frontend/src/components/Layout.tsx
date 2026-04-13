import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import ScrollToTop from './ScrollToTop';
import MobileBottomNav from './MobileBottomNav';
import BackendNotConfiguredBanner from './BackendNotConfiguredBanner';
import { hasSupabaseEnv } from '@/services/supabaseClient';
import MascotLayer from './decorative/MascotLayer';
import { MatchScoreProvider } from '@/context/MatchScoreContext';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import MaintenancePage from './MaintenancePage';
import { useAuth } from '@/services/auth';

const Layout: React.FC = () => {
  const { user, profile, status } = useAuth();
  const { data: maintenance, loading } = useLoad(() => db.getSiteSetting('maintenance'));
  const maintenanceOn =
    hasSupabaseEnv &&
    !loading &&
    maintenance &&
    typeof maintenance === 'object' &&
    (maintenance as { enabled?: boolean }).enabled === true;

  const isAdmin = profile?.role === 'admin';
  /** Bakım yalnızca admin olmayanlara; admin siteyi normal kullanır */
  const showMaintenanceForUser = maintenanceOn && !isAdmin;

  if (showMaintenanceForUser && user && status === 'AUTHENTICATED' && profile === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-inter text-white px-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Yükleniyor…</p>
      </div>
    );
  }

  if (showMaintenanceForUser) {
    const msg = (maintenance as { message?: string }).message;
    return <MaintenancePage message={typeof msg === 'string' ? msg : undefined} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ScrollToTop />
      <Navbar />
      <MatchScoreProvider>
        <main className="flex-grow pt-[max(6rem,calc(5.5rem+env(safe-area-inset-top,0px)))] md:pt-24 lg:pt-32 pb-mobile-nav md:pb-0 font-inter antialiased">
          <Outlet />
        </main>
      </MatchScoreProvider>
      <MobileBottomNav />
      <footer className="relative z-10 mt-20 border-t border-white/[0.07] bg-gradient-to-b from-[#0a0a10] via-[#08080c] to-[#050508] font-inter">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -left-1/4 bottom-0 h-72 w-1/2 rounded-full bg-primary/[0.07] blur-[100px]" />
          <div className="absolute -right-1/4 bottom-0 h-64 w-1/2 rounded-full bg-violet-600/[0.05] blur-[90px]" />
          <div className="absolute bottom-0 left-1/2 h-px w-[min(90%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        </div>
        {/* Rias Mascot - Brand Signature (Footer, bottom-left, desktop only) */}
        <div className="absolute bottom-0 left-0 z-0 hidden md:block opacity-90">
          <MascotLayer type="rias" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-14 sm:px-8 lg:px-12 lg:pb-20 lg:pt-16">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-10 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:px-8 md:py-12">
            <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_auto_1fr] md:gap-8 lg:gap-12">
              <div className="text-center md:text-left">
                <div className="inline-flex flex-col items-center md:items-start">
                  <span className="mb-3 h-px w-10 bg-gradient-to-r from-primary to-transparent md:w-12" />
                  <div className="text-3xl font-black uppercase italic tracking-tighter text-glow text-primary lg:text-4xl">
                    ANIRIAS
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
                    Premium anime platformu
                  </p>
                </div>
              </div>

              <nav
                aria-label="Alt bilgi"
                className="flex flex-wrap items-center justify-center gap-2 sm:gap-1 md:rounded-full md:border md:border-white/[0.08] md:bg-black/25 md:px-2 md:py-2 md:backdrop-blur-sm"
              >
                {(
                  [
                    ['/hakkimizda', 'Hakkımızda'],
                    ['/gizlilik', 'Gizlilik'],
                    ['/iletisim', 'İletişim'],
                  ] as const
                ).map(([to, label]) => (
                  <Link
                    key={to}
                    to={to}
                    className="rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white md:py-2"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="text-center md:text-right">
                <p className="text-[10px] font-black uppercase leading-relaxed tracking-[0.18em] text-zinc-600">
                  Sinematik yayın deneyimi
                </p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  © {new Date().getFullYear()} ANIRIAS
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                  Tüm hakları saklıdır
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
      {!hasSupabaseEnv && <BackendNotConfiguredBanner />}
    </div>
  );
};

export default Layout;
