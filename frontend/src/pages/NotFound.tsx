
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Noise/Static Effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Glitch Circle */}
      <div className="absolute w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-[150px] animate-pulse" />

      <div className="relative z-10 text-center space-y-6 p-6">
         <div className="relative inline-block">
            <h1 className="text-[120px] md:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-900 leading-none tracking-tighter select-none">
              404
            </h1>
            <div className="absolute top-0 left-0 w-full h-full text-brand-red opacity-50 blur-sm animate-pulse" style={{ clipPath: 'inset(40% 0 61% 0)' }}>404</div>
         </div>

         <div className="space-y-2">
            <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-widest">SİNYAL <span className="text-brand-red">KAYBI</span></h2>
            <p className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-[0.4em]">Aradığın koordinatlar bu evrende mevcut değil.</p>
         </div>

         <div className="pt-8">
            <Link to="/" className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-brand-red/50 transition-all">
               <div className="absolute inset-0 bg-brand-red/0 group-hover:bg-brand-red/10 transition-colors" />
               <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
               <span className="text-[10px] font-black text-white uppercase tracking-widest relative z-10">ANA ÜSSE DÖN</span>
            </Link>
         </div>
      </div>

      {/* Footer Decoration */}
      <div className="absolute bottom-10 left-0 right-0 text-center">
         <p className="text-[8px] font-mono text-gray-700 uppercase">ERR_ANIME_NOT_FOUND_EXCEPTION</p>
      </div>
    </div>
  );
};

export default NotFound;
