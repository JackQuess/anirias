
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import BackendNotConfiguredBanner from './BackendNotConfiguredBanner';
import { hasSupabaseEnv } from '@/services/supabaseClient';
import MascotLayer from './decorative/MascotLayer';

const Layout: React.FC = () => {
  if (typeof window !== 'undefined' && !hasSupabaseEnv) {
    console.log('[Anirias:Layout] BackendNotConfiguredBanner shown (hasSupabaseEnv=false)');
  }
  return (
    <div className="flex flex-col min-h-screen bg-brand-black">
      <Navbar />
      <main className="flex-grow pt-24 lg:pt-32">
        <Outlet />
      </main>
      <footer className="py-20 border-t border-white/5 bg-brand-dark/80 backdrop-blur-xl mt-20 relative z-10">
        {/* Rias Mascot - Brand Signature (Footer, bottom-left, desktop only) */}
        <div className="absolute bottom-0 left-0 z-0 hidden md:block">
          <MascotLayer type="rias" />
        </div>
        <div className="max-w-7xl mx-auto px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            <div className="text-center md:text-left">
              <div className="text-3xl font-black text-brand-red italic tracking-tighter text-glow uppercase">ANIRIAS</div>
              <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-2">Premium Anime Platformu</p>
            </div>
            <div className="flex justify-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              <Link to="/hakkimizda" className="hover:text-white transition-colors">HAKKIMIZDA</Link>
              <Link to="/gizlilik" className="hover:text-white transition-colors">GİZLİLİK</Link>
              <Link to="/iletisim" className="hover:text-white transition-colors">İLETİŞİM</Link>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest">
                &copy; {new Date().getFullYear()} ANIRIAS. TÜM HAKLARI SAKLIDIR.
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
