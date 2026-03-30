import React from 'react';
import { Home, Search, PlaySquare, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/services/auth';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Ana Sayfa', path: '/' },
    { icon: Search, label: 'Ara', path: '/search' },
    { icon: PlaySquare, label: 'Listem', path: user ? '/list' : '/login' },
    { icon: User, label: 'Profil', path: user ? '/profile' : '/login' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[190] flex flex-col border-t border-white/5 bg-surface/90 backdrop-blur-lg pb-safe">
      <div className="flex h-14 sm:h-16 items-center justify-around px-2 sm:px-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors touch-manipulation',
              isActive ? 'text-primary' : 'text-muted hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-full px-0.5 text-center">
              {item.label}
            </span>
          </Link>
        );
      })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
