
import React, { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/services/auth';
import { hasSupabaseEnv } from '@/services/supabaseClient';
import BackendNotConfiguredBanner from '@/components/BackendNotConfiguredBanner';

const ADMIN_LOADING_MAX_MS = 20000; // 20 sn sonra giris sayfasina yonlendir

const AdminLayout: React.FC = () => {
  const { user, profile, status } = useAuth();
  const location = useLocation();
  const loadingStartRef = useRef<number | null>(null);

  // Mobile'da default kapalı, desktop'ta açık
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Yetkiler cok uzun surerse (Supabase yanit vermiyorsa) giris sayfasina yonlendir
  useEffect(() => {
    if (status === 'LOADING' && hasSupabaseEnv) {
      if (loadingStartRef.current === null) loadingStartRef.current = Date.now();
      const t = setTimeout(() => {
        if (loadingStartRef.current && Date.now() - loadingStartRef.current >= ADMIN_LOADING_MAX_MS) {
          setLoadingTimeout(true);
        }
      }, ADMIN_LOADING_MAX_MS);
      return () => clearTimeout(t);
    } else {
      loadingStartRef.current = null;
    }
  }, [status]);

  // Body scroll lock when sidebar is open on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Supabase bağlı değilse (Mock modu), girişi ve rolü zorunlu tutma (Test amaçlı)
  const isTestMode = !hasSupabaseEnv;

  // Yetkiler cok uzun surdu, giris sayfasina yonlendir
  if (loadingTimeout) {
    return <Navigate to="/login?admin_timeout=1" replace />;
  }

  if (status === 'LOADING' && !isTestMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-black text-white px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-red"></div>
        <span className="mt-4 font-bold tracking-widest uppercase text-xs">Yetkiler Kontrol Ediliyor...</span>
        <p className="mt-2 text-[10px] text-gray-500 max-w-xs text-center">Bu ekranda takılı kalırsanız birkaç saniye içinde giriş sayfasına yönlendirileceksiniz.</p>
      </div>
    );
  }

  // Test modunda değilsek normal güvenlik kontrollerini yap
  if (!isTestMode) {
    if (status === 'UNAUTHENTICATED' || !user) {
      return <Navigate to="/login" replace />;
    }
    if (profile?.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
  }

  const navItems = [
    { label: 'Genel Bakış', path: '/admin', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { label: 'İçerik Yönetimi', path: '/admin/animes', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' },
    { label: 'AI Sihirbazı', path: '/admin/import', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { label: 'Takvim', path: '/admin/calendar', icon: 'M8 7V5a3 3 0 013-3h2a3 3 0 013 3v2h3a1 1 0 011 1v11a3 3 0 01-3 3H7a3 3 0 01-3-3V8a1 1 0 011-1h3zm2-2a1 1 0 011-1h2a1 1 0 011 1v2h-4V5z' },
    { label: 'Analitik', path: '/admin/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z' },
    { label: 'Kullanıcılar', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Geri Bildirimler', path: '/admin/feedback', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { label: 'Mascot Ayarları', path: '/admin/site-settings/mascots', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Duyuru Yönetimi', path: '/admin/announcement', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    { label: 'Hata Logları', path: '/admin/errors', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { label: 'Otomasyon', path: '/admin/automation', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  ];

  const username = profile?.username || (isTestMode ? 'Test Admin' : 'Admin');

  return (
    <div className="min-h-screen bg-brand-black flex font-sans">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          w-80 bg-[#080808] border-r border-white/5 flex flex-col h-screen z-[1000] shadow-2xl
          fixed lg:sticky top-0 left-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${!sidebarOpen && 'lg:hidden'}
        `}
      >
          <div className="p-10 pb-8">
            <Link to="/" className="block">
              <h1 className="text-4xl font-black text-white italic tracking-tighter drop-shadow-md">
                ANIRIAS
                <span className="text-brand-red text-lg not-italic ml-1">.OS</span>
              </h1>
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">Sistem Çevrimiçi</p>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-3 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? 'bg-brand-red text-white shadow-xl shadow-brand-red/20' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] relative z-10">{item.label}</span>
                
                {/* Active Indicator Glow */}
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-4">
           {/* Return to Live Site Button */}
           <Link 
             to="/" 
             className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all group hover:border-brand-red/50"
           >
             <span className="w-8 h-8 rounded-full bg-brand-red/20 text-brand-red flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-colors">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             </span>
             <span className="text-[10px] font-black uppercase tracking-widest">Canlı Siteye Dön</span>
           </Link>

           <div className="p-6 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center text-xs font-black text-white shadow-lg ring-2 ring-brand-black">
                  {username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                  <p className="text-[10px] font-black text-white uppercase truncate">{username}</p>
                  <p className="text-[8px] text-brand-red font-black uppercase tracking-widest">Master Admin</p>
              </div>
           </div>
        </div>
          </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-brand-black relative">
        {/* Hamburger Menu Button - Mobile Only */}
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="fixed top-5 left-5 z-[1100] bg-white/10 text-white border border-white/15 rounded-lg p-3 hover:bg-white/20 transition-all shadow-lg lg:rounded-full lg:px-4 lg:py-2"
          aria-label={sidebarOpen ? 'Sidebar Gizle' : 'Sidebar Aç'}
        >
          {/* Hamburger Icon - Mobile */}
          <span className="flex flex-col gap-1 lg:hidden">
            <span className={`w-5 h-0.5 bg-white transition-all ${sidebarOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`w-5 h-0.5 bg-white transition-all ${sidebarOpen ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-0.5 bg-white transition-all ${sidebarOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </span>
          {/* Text - Desktop */}
          <span className="hidden lg:block text-xs font-black uppercase tracking-widest">
            {sidebarOpen ? 'Gizle' : 'Aç'}
          </span>
        </button>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
        <div className="relative z-10 max-w-[1600px] mx-auto p-4 lg:p-8 xl:p-12">
          <Outlet />
        </div>
      </main>
      {!hasSupabaseEnv && <BackendNotConfiguredBanner />}
    </div>
  );
};

export default AdminLayout;
