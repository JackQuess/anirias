import React from 'react';
import { Home, LayoutGrid, PlaySquare, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/services/auth';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Ana Sayfa', path: '/' },
    { icon: LayoutGrid, label: 'Katalog', path: '/browse' },
    { icon: PlaySquare, label: 'Listem', path: user ? '/list' : '/login' },
    { icon: User, label: 'Profil', path: user ? '/profile' : '/login' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-lg border-t border-white/5 z-[190] flex items-center justify-around px-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors',
              isActive ? 'text-primary' : 'text-muted hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
