
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { fetchProfile } from './authHelpers';
import { Profile, AuthStatus, ActivePlan } from '../types';
import { db } from './db';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  activePlan: ActivePlan;
  status: AuthStatus;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshEntitlements: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_REQUEST_TIMEOUT_MS = 8000;  // 8 sn - getSession icin (Supabase yavassa hizlica UNAUTH)
const PROFILE_REQUEST_TIMEOUT_MS = 10000; // 10 sn - profil sorgusu

const isProfileBanned = (profile: Profile | null): boolean => {
  if (!profile?.is_banned) return false;
  if (!profile.banned_until) return true;
  const until = new Date(profile.banned_until).getTime();
  return Number.isNaN(until) || until > Date.now();
};

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
  const [activePlan, setActivePlan] = useState<ActivePlan>('free');
  const [status, setStatus] = useState<AuthStatus>('LOADING');

  const loadUserProfile = async (currentUser: User) => {
    if (!supabase) return;
    try {
      const prof = await withTimeout(
        fetchProfile(currentUser.id),
        PROFILE_REQUEST_TIMEOUT_MS,
        'Profil isteği zaman aşımına uğradı'
      );
      const moderation = prof ? await db.getOwnUserModeration(currentUser.id) : null;
      const mergedProfile = prof ? ({ ...prof, ...(moderation || {}) } as Profile) : null;
      if (mergedProfile && isProfileBanned(mergedProfile)) {
        setProfile(mergedProfile);
        const reason = mergedProfile.ban_reason?.trim();
        if (typeof window !== 'undefined') {
          window.alert(reason ? `Hesabınız banlandı.\n\nSebep: ${reason}` : 'Hesabınız banlandı.');
        }
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        localStorage.clear();
        sessionStorage.clear();
        setUser(null);
        setProfile(null);
        setActivePlan('free');
        setStatus('UNAUTHENTICATED');
        return;
      }
      if (mergedProfile) setProfile(mergedProfile);
    } catch (e) {
      console.error('[Auth] Profil yüklenirken hata:', e);
    }
  };

  const loadEntitlements = async (currentUser: User) => {
    try {
      const plan = await db.getActivePlan(currentUser.id);
      setActivePlan(plan);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Auth] Entitlement load failed:', err);
      setActivePlan('free');
    }
  };

  const refreshProfile = async () => {
    if (user) await loadUserProfile(user);
  };

  const refreshEntitlements = async () => {
    if (user) await loadEntitlements(user);
  };

  const signOut = async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (e) {
      console.error('[Auth] Çıkış hatası:', e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setProfile(null);
      setActivePlan('free');
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
          void loadEntitlements(session.user);
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('[Auth] getSession failed:', error);
      }
      try {
        const fallbackTimeout = 5000;
        const { data: { session } } = await Promise.race([
          supabase!.auth.getSession(),
          new Promise<{ data: { session: null } }>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), fallbackTimeout)
          ),
        ]);
        if (session?.user) {
          setUser(session.user);
          setStatus('AUTHENTICATED');
          void loadUserProfile(session.user);
          void loadEntitlements(session.user);
          return;
        }
      } catch (_) {}
      setStatus('UNAUTHENTICATED');
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setStatus('AUTHENTICATED');
        void loadUserProfile(session.user);
        void loadEntitlements(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setActivePlan('free');
        setStatus('UNAUTHENTICATED');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      void loadEntitlements(user);
    }, 30000);

    const onFocus = () => {
      void loadEntitlements(user);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activePlan,
        status,
        signOut,
        refreshProfile,
        refreshEntitlements,
        setProfile,
      }}
    >
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
