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
  const { user, profile, status, setProfile } = useAuth();
  const { data: maintenance, loading } = useLoad(() => db.getSiteSetting('maintenance'));
  const maintenanceOn =
    hasSupabaseEnv &&
    !loading &&
    maintenance &&
    typeof maintenance === 'object' &&
    (maintenance as { enabled?: boolean }).enabled === true;

  const isAdmin = profile?.role === 'admin';
  const warningUpdatedAt = profile?.account_warning_updated_at
    ? new Date(profile.account_warning_updated_at).getTime()
    : null;
  const warningSeenAt = profile?.account_warning_seen_at
    ? new Date(profile.account_warning_seen_at).getTime()
    : null;
  const showAccountWarning = Boolean(
    user &&
    profile?.account_warning_message &&
    warningUpdatedAt &&
    (!warningSeenAt || warningSeenAt < warningUpdatedAt)
  );

  const acknowledgeAccountWarning = async () => {
    if (!user || !profile) return;
    const seenAt = new Date().toISOString();
    try {
      await db.acknowledgeAccountWarning();
      setProfile({ ...profile, account_warning_seen_at: seenAt });
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Layout] account warning ack failed:', err);
    }
  };
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
    const data = maintenance as { message?: string; endsAt?: string };
    const msg = data.message;
    const endsAt = data.endsAt;
    return (
      <MaintenancePage
        message={typeof msg === 'string' ? msg : undefined}
        endsAt={typeof endsAt === 'string' ? endsAt : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ScrollToTop />
      <Navbar />
      {showAccountWarning ? (
        <div className="fixed inset-x-0 top-[max(5.5rem,calc(5rem+env(safe-area-inset-top,0px)))] z-[1200] px-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-amber-400/30 bg-[#15110a]/95 p-5 shadow-2xl shadow-black/30 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Hesap Uyarısı</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-white/90">
                {profile?.account_warning_message}
              </p>
            </div>
            <button
              type="button"
              onClick={acknowledgeAccountWarning}
              className="shrink-0 rounded-xl border border-amber-300/30 bg-amber-300 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-amber-200"
            >
              Okudum
            </button>
          </div>
        </div>
      ) : null}
      <MatchScoreProvider>
        <main className="flex-grow pt-[max(6rem,calc(5.5rem+env(safe-area-inset-top,0px)))] md:pt-24 lg:pt-32 pb-mobile-nav md:pb-0 font-inter antialiased">
          <Outlet />
        </main>
      </MatchScoreProvider>
      <MobileBottomNav />
      <footer className="relative z-10 mt-20 border-t border-white/10 bg-[#08080c] font-inter">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-primary/[0.06] via-transparent to-transparent opacity-80"
          aria-hidden
        />
        <div className="absolute bottom-0 left-0 z-0 hidden md:block opacity-80">
          <MascotLayer type="rias" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-14">
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="text-center md:text-left">
              <div className="text-2xl font-black uppercase italic tracking-tighter text-primary sm:text-3xl">ANIRIAS</div>
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Premium anime platformu
              </p>
            </div>

            <nav
              aria-label="Alt bilgi"
              className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500"
            >
              {(
                [
                  ['/hakkimizda', 'Hakkımızda'],
                  ['/gizlilik', 'Gizlilik'],
                  ['/iletisim', 'İletişim'],
                  ['/cevirmen-basvuru', 'Çeviri başvurusu'],
                ] as const
              ).map(([to, label], i) => (
                <React.Fragment key={to}>
                  {i > 0 ? <span className="mx-3 hidden text-zinc-700 sm:inline" aria-hidden>|</span> : null}
                  <Link to={to} className="px-1 transition-colors hover:text-primary">
                    {label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>

            <div className="text-center md:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                © {new Date().getFullYear()} ANIRIAS · Tüm hakları saklıdır
              </p>
            </div>
          </div>
        </div>
      </footer>
      {!hasSupabaseEnv && <BackendNotConfiguredBanner />}
    </div>
  );
};

export default Layout;
