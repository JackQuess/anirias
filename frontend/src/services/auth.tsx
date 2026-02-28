
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { fetchProfile } from './authHelpers';
import { Profile, AuthStatus } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  status: AuthStatus;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_REQUEST_TIMEOUT_MS = 20000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('LOADING');

  const loadUserProfile = async (currentUser: User) => {
    if (!supabase) return;
    try {
      const prof = await withTimeout(
        fetchProfile(currentUser.id),
        AUTH_REQUEST_TIMEOUT_MS,
        'Profil isteği zaman aşımına uğradı'
      );
      if (prof) {
        setProfile(prof);
        if (import.meta.env.DEV) {
          console.log('[Auth] Profile loaded:', { id: prof.id, username: prof.username, role: prof.role, avatar_id: prof.avatar_id, avatar_url: prof.avatar_url });
        }
      } else {
        console.warn('[Auth] Profile fetch returned null for user:', currentUser.id);
      }
    } catch (e) {
      console.error("[Auth] Profil yüklenirken hata:", e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    } else {
      console.warn('[Auth] refreshProfile called but user is null');
    }
  };

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("Çıkış hatası:", e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setProfile(null);
      setStatus('UNAUTHENTICATED');
    }
  };

  useEffect(() => {
    if (!supabase) {
      setStatus('UNAUTHENTICATED');
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase!.auth.getSession(),
          AUTH_REQUEST_TIMEOUT_MS,
          'Oturum kontrolü zaman aşımına uğradı'
        );
        if (session?.user) {
          setUser(session.user);
          setStatus('AUTHENTICATED');
          void loadUserProfile(session.user);
        } else {
          setStatus('UNAUTHENTICATED');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] initAuth failed:', error);
        }
        setStatus('UNAUTHENTICATED');
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setStatus('AUTHENTICATED');
        void loadUserProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setStatus('UNAUTHENTICATED');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, status, signOut, refreshProfile, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
