
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/services/auth';
import { db } from '@/services/db';
import { Notification, Anime } from '../types';
import { getAvatarSrc } from '@/utils/avatar';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';

const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); // Global Search State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false); // Close search on nav
  }, [location]);

  useEffect(() => {
    if (user) {
      db.getNotifications(user.id)
        .then(setNotifications)
        .catch(() => {
          // Silently fail - notifications might not be available
          setNotifications([]);
        });
    }
  }, [user]);

  // Handle Search Input
  useEffect(() => {
    if (isSearchOpen && searchTerm) {
      db.getAllAnimes().then(animes => {
        const results = animes.filter(a => getDisplayTitle(a.title).toLowerCase().includes(searchTerm.toLowerCase()));
        setSearchResults(results.slice(0, 6));
      });
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, isSearchOpen]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { label: 'ANA SAYFA', path: '/' },
    { label: 'KATALOG', path: '/browse' },
    { label: 'YENİ BÖLÜMLER', path: '/new-episodes' },
    { label: 'TAKVİM', path: '/calendar' }
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-500 ${
        scrolled ? 'bg-brand-black/90 backdrop-blur-xl border-b border-white/5 py-3 shadow-2xl' : 'bg-transparent py-4 lg:py-6'
      }`}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex items-center justify-between">
          
          {/* Left Side: Logo & Links */}
          <div className="flex items-center gap-4 md:gap-8 lg:gap-12">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-white hover:text-brand-red transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
            </button>

            <Link to="/" className="text-2xl md:text-3xl font-black text-brand-red tracking-tighter italic drop-shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-105">
              ANIRIAS
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4 lg:gap-8 bg-black/20 px-6 py-2.5 rounded-full border border-white/5 backdrop-blur-md">
              {navLinks.map(item => (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`text-[9px] lg:text-[10px] font-black tracking-[0.2em] uppercase transition-all relative group ${isActive(item.path) ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {item.label}
                  <span className={`absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-red transition-all duration-300 ${isActive(item.path) ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side: Auth & Profile */}
          <div className="flex items-center gap-3 md:gap-6">
            
            {/* Search Trigger */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </button>

            {user ? (
              <>
                {/* Notification Center */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className={`relative p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all ${unreadCount > 0 ? 'text-brand-red' : 'text-gray-400'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-brand-red text-white text-[8px] font-black flex items-center justify-center rounded-full animate-bounce shadow-lg ring-2 ring-brand-black">{unreadCount}</span>}
                  </button>

                  {isNotifOpen && (
                    <div className="absolute top-full right-0 mt-4 w-72 md:w-80 bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl p-6 animate-fade-in overflow-hidden z-50">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">BİLDİRİMLER</h4>
                        <span className="text-[8px] font-bold text-gray-500">{unreadCount} YENİ</span>
                      </div>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {notifications.map(n => (
                          <Link 
                            key={n.id} 
                            to={n.link || '#'} 
                            onClick={async () => {
                              setIsNotifOpen(false);
                              try {
                                await db.markNotificationRead(n.id);
                                setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, is_read: true } : p));
                              } catch (err) {
                                console.error('Bildirim okundu işaretlenemedi', err);
                              }
                            }}
                            className={`block p-4 rounded-2xl border transition-all ${n.is_read ? 'bg-transparent border-white/5 opacity-50' : 'bg-white/5 border-brand-red/20 hover:border-brand-red/50'}`}
                          >
                            <p className="text-[10px] font-black text-white mb-1 uppercase tracking-tight">{n.title}</p>
                            <p className="text-[10px] text-gray-500 line-clamp-2">{n.message}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 p-1 pr-2 md:pr-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
                  >
                    <div className="w-8 h-8 md:w-9 md:h-9 bg-brand-red rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-brand-red/20 overflow-hidden">
                      {profile?.avatar_id ? (
                        <img src={getAvatarSrc(profile.avatar_id)} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        (profile?.username || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="hidden md:block text-left">
                       <p className="text-[9px] font-black text-white uppercase leading-none">{profile?.username}</p>
                       <p className="text-[8px] font-bold text-gray-500 uppercase leading-none mt-1">{profile?.role === 'admin' ? 'ADMIN' : 'ÜYE'}</p>
                    </div>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-4 w-64 bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl p-6 animate-fade-in z-50">
                      <div className="mb-6 pb-6 border-b border-white/5 flex items-center gap-4">
                         <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center text-white font-black overflow-hidden">
                            {profile?.avatar_id ? (
                              <img src={getAvatarSrc(profile.avatar_id)} className="w-full h-full object-cover" alt="avatar" />
                            ) : (
                              (profile?.username || 'U').charAt(0).toUpperCase()
                            )}
                         </div>
                         <div className="min-w-0">
                            <p className="text-[10px] font-black text-white uppercase truncate">{profile?.username}</p>
                            <p className="text-[8px] text-brand-red font-black uppercase tracking-widest mt-1">PRO ÜYE</p>
                         </div>
                      </div>
                      <div className="space-y-3">
                        <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-[0.2em] transition-all" onClick={() => setIsProfileOpen(false)}>
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                           PROFİLİM
                        </Link>
                        {profile?.role === 'admin' && (
                          <Link to="/admin" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[9px] font-black text-brand-red hover:text-white uppercase tracking-[0.2em] transition-all" onClick={() => setIsProfileOpen(false)}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                             ADMİN PANELİ
                          </Link>
                        )}
                        <button onClick={() => signOut()} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[9px] font-black text-gray-600 hover:text-brand-red uppercase tracking-[0.2em] transition-all text-left">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                           ÇIKIŞ YAP
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 md:gap-6">
                <Link to="/login" className="text-[10px] font-black text-white hover:text-brand-red uppercase tracking-widest transition-colors hidden md:block">GİRİŞ</Link>
                <Link to="/signup" className="bg-brand-red text-white px-5 md:px-8 py-2 md:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-red/20 hover:scale-105 transition-all">KAYIT OL</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Global Search Overlay (Spotlight Style) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-start justify-center pt-32 px-4 animate-fade-in">
           <div className="w-full max-w-2xl bg-brand-surface border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative animate-fade-in-up">
              <button onClick={() => setIsSearchOpen(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-4">
                 <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                 <input 
                   autoFocus
                   type="text" 
                   placeholder="ANIME ARA..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-transparent text-3xl font-black text-white italic uppercase tracking-tighter outline-none placeholder:text-gray-700"
                 />
              </div>

              <div className="space-y-4">
                 {searchTerm && searchResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {searchResults.map(anime => {
                         const rawImage = anime.cover_image || anime.banner_image || '';
                         const defaultCover = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAtMB9mMfFZsAAAAASUVORK5CYII=';
                         const imageSrc = rawImage || defaultCover;
                         return (
                           <Link 
                             key={anime.id} 
                             to={`/anime/${anime.id}`} 
                             onClick={() => setIsSearchOpen(false)}
                             className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group"
                           >
                             <img src={imageSrc} className="w-12 h-16 object-cover rounded-lg shadow-lg" />
                             <div>
                                <h4 className="text-sm font-black text-white uppercase italic group-hover:text-brand-red transition-colors">{getDisplayTitle(anime.title) || 'Bilinmeyen Anime'}</h4>
                                <p className="text-[9px] text-gray-500 font-bold uppercase">
                                  {anime.year ? `${anime.year}` : ''}{anime.genres?.[0] ? ` • ${anime.genres[0]}` : ''}
                                </p>
                             </div>
                           </Link>
                         );
                       })}
                    </div>
                 )}
                 {searchTerm && searchResults.length === 0 && (
                    <p className="text-center text-gray-600 font-black uppercase tracking-widest py-8">Sonuç bulunamadı.</p>
                 )}
                 {!searchTerm && (
                    <div className="text-center py-8">
                       <p className="text-gray-600 text-xs font-black uppercase tracking-widest">Aramak için yazmaya başla</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[300] bg-brand-black/95 backdrop-blur-3xl animate-fade-in flex flex-col p-8 md:hidden">
           <div className="flex justify-between items-center mb-12">
             <span className="text-3xl font-black text-brand-red italic tracking-tighter">ANIRIAS</span>
             <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white hover:text-brand-red">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
           
           <div className="flex flex-col gap-6 flex-1 justify-center">
             {navLinks.map(item => (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`text-2xl font-black uppercase tracking-tighter ${isActive(item.path) ? 'text-brand-red' : 'text-white/50'}`}
                >
                  {item.label}
                </Link>
             ))}
             {!user && (
               <Link to="/login" className="text-2xl font-black uppercase tracking-tighter text-white/50 mt-4">GİRİŞ YAP</Link>
             )}
           </div>

           <div className="mt-auto pt-8 border-t border-white/10 text-center">
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">© 2024 ANIRIAS</p>
           </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
