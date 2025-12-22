
import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/services/auth';
import { hasSupabaseEnv } from '@/services/supabaseClient';

const AdminLayout: React.FC = () => {
  const { user, profile, status } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Supabase bağlı değilse (Mock modu), girişi ve rolü zorunlu tutma (Test amaçlı)
  const isTestMode = !hasSupabaseEnv;

  if (status === 'LOADING' && !isTestMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-red"></div>
        <span className="ml-4 font-bold tracking-widest uppercase text-xs">Yetkiler Kontrol Ediliyor...</span>
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
  ];

  const username = profile?.username || (isTestMode ? 'Test Admin' : 'Admin');

  return (
    <div className="min-h-screen bg-brand-black flex font-sans">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-80 bg-[#080808] border-r border-white/5 hidden lg:flex flex-col sticky top-0 h-screen z-50 shadow-2xl">
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
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-brand-black relative">
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="fixed top-5 left-5 z-[1200] bg-white/10 text-white border border-white/15 rounded-full px-3 py-2 text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-colors shadow-lg"
        >
          {sidebarOpen ? 'Sidebar Gizle' : 'Sidebar Aç'}
        </button>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
        <div className="relative z-10 max-w-[1600px] mx-auto p-8 lg:p-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
