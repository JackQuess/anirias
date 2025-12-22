
import React from 'react';

const GlobalLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#020202] flex items-center justify-center overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 bg-radial-gradient from-brand-red/10 to-transparent opacity-50 animate-pulse" />

      <div className="relative flex flex-col items-center justify-center">
        {/* Magic Circles */}
        <div className="absolute w-64 h-64 border border-brand-red/20 rounded-full animate-spin-slow" />
        <div className="absolute w-52 h-52 border border-brand-red/10 rounded-full animate-spin-reverse-slow border-dashed" />
        <div className="absolute w-80 h-80 border border-white/5 rounded-full animate-breathe" />

        {/* Core Glowing Orb */}
        <div className="w-4 h-4 bg-brand-red rounded-full shadow-[0_0_40px_rgba(229,9,20,0.8)] animate-ping absolute" />
        
        {/* Logo Text */}
        <div className="relative z-10 text-center mt-32 backdrop-blur-sm px-8 py-2 rounded-full border border-white/5 bg-black/20">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-600 italic tracking-tighter animate-pulse">
                ANIRIAS
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
                <span className="w-1 h-1 bg-brand-red rounded-full" />
                <p className="text-[8px] font-black text-brand-red uppercase tracking-[0.4em]">SİSTEM BAŞLATILIYOR</p>
                <span className="w-1 h-1 bg-brand-red rounded-full" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoader;
