import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { WatchlistEntry } from '@/types';
import { useAuth } from '@/services/auth';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';

export type MatchScoreContextValue = {
  /** Misafir: []. Girişli ve ilk yanıt gelene kadar null (temel skor). */
  watchlist: WatchlistEntry[] | null;
  reload: () => void;
};

const MatchScoreContext = createContext<MatchScoreContextValue | null>(null);

export const MatchScoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const fetcher = useCallback(async () => {
    if (!uid) return [] as WatchlistEntry[];
    return db.getWatchlist(uid);
  }, [uid]);

  const { data, reload } = useLoad(fetcher, [uid]);

  const value = useMemo<MatchScoreContextValue>(() => {
    if (!uid) {
      return { watchlist: [], reload };
    }
    return { watchlist: data ?? null, reload };
  }, [uid, data, reload]);

  return <MatchScoreContext.Provider value={value}>{children}</MatchScoreContext.Provider>;
};

/** Layout dışında (provider yok) çağrılırsa temel skor için null watchlist varsayılır. */
export function useMatchScoreWatchlist(): MatchScoreContextValue {
  const ctx = useContext(MatchScoreContext);
  if (!ctx) {
    return { watchlist: null, reload: () => {} };
  }
  return ctx;
}
