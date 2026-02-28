
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
const AUTH_REQUEST_TIMEOUT_MS = 12000; // 12 sn - admin takilmasin

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
    if (!supabase) {
      console.warn('[Anirias:Auth] loadUserProfile skipped: supabase null');
      return;
    }
    console.log('[Anirias:Auth] loadUserProfile start', { userId: currentUser.id });
    try {
      const prof = await withTimeout(
        fetchProfile(currentUser.id),
        AUTH_REQUEST_TIMEOUT_MS,
        'Profil isteği zaman aşımına uğradı'
      );
      if (prof) {
        setProfile(prof);
        console.log('[Anirias:Auth] loadUserProfile ok', { id: prof.id, username: prof.username, role: prof.role });
      } else {
        console.warn('[Anirias:Auth] loadUserProfile: fetchProfile returned null', { userId: currentUser.id });
      }
    } catch (e) {
      console.error('[Anirias:Auth] loadUserProfile error', e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('[Anirias:Auth] refreshProfile called', { userId: user.id });
      await loadUserProfile(user);
    } else {
      console.warn('[Anirias:Auth] refreshProfile called but user is null');
    }
  };

  const signOut = async () => {
    console.log('[Anirias:Auth] signOut called');
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('[Anirias:Auth] signOut error', e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setProfile(null);
      setStatus('UNAUTHENTICATED');
      console.log('[Anirias:Auth] signOut done, status=UNAUTHENTICATED');
    }
  };

  useEffect(() => {
    if (!supabase) {
      console.log('[Anirias:Auth] init: supabase null, setting UNAUTHENTICATED');
      setStatus('UNAUTHENTICATED');
      return;
    }

    console.log('[Anirias:Auth] init: starting getSession...');
    const initAuth = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase!.auth.getSession(),
          AUTH_REQUEST_TIMEOUT_MS,
          'Oturum kontrolü zaman aşımına uğradı'
        );
        console.log('[Anirias:Auth] getSession result', { hasSession: !!session, userId: session?.user?.id });
        if (session?.user) {
          setUser(session.user);
          setStatus('AUTHENTICATED');
          console.log('[Anirias:Auth] status=AUTHENTICATED');
          void loadUserProfile(session.user);
          return;
        }
      } catch (error) {
        console.error('[Anirias:Auth] initAuth first getSession failed', error);
      }
      console.log('[Anirias:Auth] no session or timeout, retrying getSession (fallback)...');
      try {
        const fallbackTimeout = 8000;
        const { data: { session } } = await Promise.race([
          supabase!.auth.getSession(),
          new Promise<{ data: { session: null } }>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), fallbackTimeout)
          ),
        ]);
        console.log('[Anirias:Auth] fallback getSession result', { hasSession: !!session });
        if (session?.user) {
          setUser(session.user);
          setStatus('AUTHENTICATED');
          void loadUserProfile(session.user);
          return;
        }
      } catch (_) {
        console.log('[Anirias:Auth] fallback getSession failed or timeout');
      }
      console.log('[Anirias:Auth] setting status=UNAUTHENTICATED');
      setStatus('UNAUTHENTICATED');
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Anirias:Auth] onAuthStateChange', { event, hasSession: !!session, userId: session?.user?.id });
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
