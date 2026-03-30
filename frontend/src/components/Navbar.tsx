
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, LogIn } from 'lucide-react';
import { useAuth } from '@/services/auth';
import { db } from '@/services/db';
import { Notification } from '../types';
import { getAvatarSrc } from '@/utils/avatar';
import { supabase } from '@/services/supabaseClient';
import { DESKTOP_ACCESS_PAGE } from '@/config/desktop';

const Navbar: React.FC = () => {
  const { user, profile, activePlan, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false); // Close profile dropdown on nav
    setIsNotifOpen(false); // Close notification dropdown on nav
  }, [location]);

  // Click-away handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close notification dropdown if clicked outside
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      // Close profile dropdown if clicked outside
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    // Only add listener if dropdowns are open
    if (isNotifOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isNotifOpen, isProfileOpen]);

  // Load initial notifications and subscribe to Realtime updates
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Load initial notifications
    db.getNotifications(user.id)
      .then(setNotifications)
      .catch(() => {
        // Silently fail - notifications might not be available
        setNotifications([]);
      });

    // Subscribe to Realtime notifications
    if (!supabase) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          // New notification received via Realtime
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Show toast notification (optional - can be enhanced with a toast library)
          if (import.meta.env.DEV) {
            console.log('[Navbar] New notification received:', newNotification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const isActive = (path: string) => location.pathname === path;
  const isProMax = activePlan === 'pro_max';

  const navLinks = [
    { label: 'Ana Sayfa', path: '/' },
    { label: 'Katalog', path: '/browse' },
    { label: 'Yeni Bölümler', path: '/new-episodes' },
    { label: 'Takvim', path: '/calendar' },
    { label: 'Listem', path: '/list' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[200] font-inter transition-colors duration-300 pt-safe px-3 sm:px-6 md:px-12 py-3 sm:py-4 flex items-center justify-between ${
          scrolled
            ? 'bg-background/95 backdrop-blur-sm shadow-md border-b border-white/5'
            : 'bg-gradient-to-b from-black/80 to-transparent'
        }`}
      >
        <div className="flex items-center gap-6 lg:gap-10 min-w-0">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-white hover:text-primary transition-colors shrink-0"
            aria-label="Menü"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>

          <Link
            to="/"
            className="shrink-0 text-primary font-black text-xl sm:text-2xl md:text-3xl tracking-tighter"
          >
            ANIRIAS
          </Link>

          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-white/70">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`transition-colors hover:text-white ${isActive(item.path) ? 'text-white font-bold' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6 text-white shrink-0">
          <Link
            to="/search"
            className="hover:text-white/70 transition-colors flex items-center gap-2 group"
            aria-label="Ara"
          >
            <Search className="w-5 h-5" />
            <span className="hidden lg:flex items-center gap-1 text-xs font-medium text-white/40 bg-white/5 px-2 py-1 rounded border border-white/10 group-hover:border-white/30 transition-colors">
              <span className="text-[10px]">⌘</span>K
            </span>
          </Link>

            {user && isProMax && (
              <Link
                to={DESKTOP_ACCESS_PAGE}
                className="hidden md:inline-flex items-center px-4 py-2 rounded-xl bg-primary/90 hover:bg-primary text-white text-[9px] font-black uppercase tracking-[0.2em] transition-all"
              >
                Desktop
              </Link>
            )}

            {user ? (
              <>
                {/* Notification Center */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className={`transition-colors relative ${isNotifOpen ? 'text-primary' : 'text-white hover:text-white/70'}`}
                  >
                    <Bell className="w-5 h-5" />
                    <span
                      className={`absolute top-0 right-0 w-2 h-2 rounded-full border border-background ${unreadCount > 0 ? 'bg-primary' : 'bg-white/25'}`}
                    />
                  </button>

                  {isNotifOpen && (
                    <div className="absolute top-full right-0 sm:right-0 left-2 sm:left-auto mt-4 w-[calc(100vw-1rem)] max-w-sm sm:w-72 md:w-80 bg-surface-elevated border border-white/10 rounded-xl shadow-2xl p-5 animate-fade-in overflow-hidden z-50">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                        <h4 className="text-sm font-bold text-white">Bildirimler</h4>
                        <span className="text-xs text-primary font-semibold">{unreadCount} yeni</span>
                      </div>
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                            Bildirim yok
                          </div>
                        ) : (
                          notifications.map(n => {
                            // Build link based on notification type
                            let link = '#';
                            if ((n.type === 'new_episode' || n.type === 'upcoming' || n.type === 'released') && n.episode && n.episode.anime_slug) {
                              // Link directly to episode watch page
                              const seasonNum = n.episode.season_number || 1;
                              const episodeNum = n.episode.episode_number || 1;
                              link = `/watch/${n.episode.anime_slug}/${seasonNum}/${episodeNum}`;
                            } else if (n.anime_id) {
                              link = `/anime/${n.anime_id}`;
                            }
                            
                            return (
                              <Link 
                                key={n.id} 
                                to={link}
                                onClick={async () => {
                                  setIsNotifOpen(false);
                                  if (!n.is_read) {
                                    try {
                                      await db.markNotificationRead(n.id);
                                      setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, is_read: true } : p));
                                    } catch (err) {
                                      if (import.meta.env.DEV) console.error('Bildirim okundu işaretlenemedi', err);
                                    }
                                  }
                                }}
                                className={`block p-4 rounded-2xl border transition-all ${n.is_read ? 'bg-transparent border-white/5 opacity-50' : 'bg-white/5 border-primary/20 hover:border-primary/50'}`}
                              >
                                <p className="text-[10px] font-black text-white mb-1 uppercase tracking-tight">{n.title}</p>
                                <p className="text-[10px] text-gray-500 line-clamp-2">{n.body}</p>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Menu */}
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 p-1 pr-2 md:pr-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
                  >
                    <div className="w-8 h-8 md:w-9 md:h-9 bg-primary rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-primary/20 overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                      ) : profile?.avatar_id ? (
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
                    <div className="absolute top-full right-0 mt-4 w-[min(100vw-1rem,16rem)] max-w-sm sm:w-64 bg-surface-elevated border border-white/10 rounded-[2rem] shadow-2xl p-5 sm:p-6 animate-fade-in z-50">
                      <div className="mb-6 pb-6 border-b border-white/5 flex items-center gap-4">
                         <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black overflow-hidden">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                            ) : profile?.avatar_id ? (
                              <img src={getAvatarSrc(profile.avatar_id)} className="w-full h-full object-cover" alt="avatar" />
                            ) : (
                              (profile?.username || 'U').charAt(0).toUpperCase()
                            )}
                         </div>
                         <div className="min-w-0">
                            <p className="text-[10px] font-black text-white uppercase truncate">{profile?.username}</p>
                            <p className="text-[8px] text-primary font-black uppercase tracking-widest mt-1">PRO ÜYE</p>
                         </div>
                      </div>
                      <div className="space-y-3">
                        <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-[0.2em] transition-all" onClick={() => setIsProfileOpen(false)}>
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                           PROFİLİM
                        </Link>
                        <Link to="/list" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-[0.2em] transition-all" onClick={() => setIsProfileOpen(false)}>
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                           LİSTEM
                        </Link>
                        <Link
                          to={DESKTOP_ACCESS_PAGE}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all text-[9px] font-black uppercase tracking-[0.2em] ${
                            isProMax
                              ? 'hover:bg-white/5 text-primary hover:text-white'
                              : 'text-gray-500 hover:text-white hover:bg-white/5'
                          }`}
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1.25-3H5l2-2.25L5.5 12 8 12.25 9 10l1 2.25L12.5 12 11 14.75 13 17h-3.25zM14 7h5m-5 4h5m-5 4h5" /></svg>
                          {isProMax ? 'DESKTOP ACCESS' : 'DESKTOP (ANDROID PRO MAX)'}
                        </Link>
                        {profile?.role === 'admin' && (
                          <Link to="/admin" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[9px] font-black text-primary hover:text-white uppercase tracking-[0.2em] transition-all" onClick={() => setIsProfileOpen(false)}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                             KOMUTA MERKEZİ
                          </Link>
                        )}
                        <button 
                          onClick={async () => {
                            setIsProfileOpen(false);
                            await signOut();
                          }} 
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[9px] font-black text-gray-600 hover:text-primary uppercase tracking-[0.2em] transition-all text-left"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                           ÇIKIŞ YAP
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 md:gap-4">
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-1.5 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Giriş Yap
                </Link>
                <Link
                  to="/signup"
                  className="hidden md:block text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  Kayıt ol
                </Link>
              </div>
            )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[300] bg-background/98 backdrop-blur-3xl animate-fade-in flex flex-col pt-safe pb-safe px-6 sm:p-8 overflow-y-auto md:hidden font-inter">
           <div className="flex justify-between items-center mb-8 sm:mb-12 shrink-0">
             <span className="text-3xl font-black text-primary italic tracking-tighter">ANIRIAS</span>
             <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white hover:text-primary">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
           
           <div className="flex flex-col gap-4 sm:gap-6 flex-1 justify-center min-h-0">
             {navLinks.map(item => (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className={`text-xl sm:text-2xl font-black uppercase tracking-tighter ${isActive(item.path) ? 'text-primary' : 'text-white/50'}`}
                >
                  {item.label}
                </Link>
             ))}
             {user && (
               <Link
                 to={DESKTOP_ACCESS_PAGE}
                 className={`text-2xl font-black uppercase tracking-tighter ${isProMax ? 'text-primary' : 'text-white/50'}`}
               >
                 DESKTOP
               </Link>
             )}
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
