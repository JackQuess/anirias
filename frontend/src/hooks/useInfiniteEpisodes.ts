import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/services/db';
import { Episode, Anime } from '../types';

interface UseInfiniteEpisodesReturn {
  episodes: (Episode & { anime: Anime })[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  reload: () => void;
}

const PAGE_SIZE = 24;

export function useInfiniteEpisodes(): UseInfiniteEpisodesReturn {
  const [episodes, setEpisodes] = useState<(Episode & { anime: Anime })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState<number>(0);
  const isLoadingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  const fetchEpisodes = useCallback(async (pageNum: number, append: boolean = false) => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const offset = pageNum * PAGE_SIZE;
      const data = await db.getLatestEpisodes(PAGE_SIZE, offset);
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setHasMore(data.length === PAGE_SIZE);
      }
      
      if (append) {
        setEpisodes(prev => {
          // Prevent duplicates by checking episode IDs
          const existingIds = new Set(prev.map(ep => ep.id));
          const newEpisodes = data.filter(ep => !existingIds.has(ep.id));
          return [...prev, ...newEpisodes];
        });
      } else {
        setEpisodes(data);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error('Bölümler yüklenirken bir hata oluştu'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading || isLoadingRef.current) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEpisodes(nextPage, true);
  }, [hasMore, loadingMore, loading, page, fetchEpisodes]);

  const reload = useCallback(() => {
    setPage(0);
    setHasMore(true);
    setEpisodes([]);
    hasInitializedRef.current = false;
    fetchEpisodes(0, false);
  }, [fetchEpisodes]);

  // Initial load
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchEpisodes(0, false);
    }
  }, [fetchEpisodes]);

  return {
    episodes,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reload,
  };
}

