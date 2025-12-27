
import { useState, useEffect, useCallback } from 'react';
import { LoadState } from '../types';

export function useLoad<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // SAFE: Ensure dependencies is always an array
  const safeDependencies = Array.isArray(dependencies) ? dependencies : [];

  const reload = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    // Clear old data when dependencies change to prevent stale data display
    setData(null);

    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setError(new Error('İstek zaman aşımına uğradı. Lütfen bağlantınızı kontrol edin.'));
        setLoading(false);
      }
    }, 8000);

    const executeFetch = async () => {
      try {
        const result = await fetcher();
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Beklenmedik bir hata oluştu'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    executeFetch();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
    // CRITICAL: Include fetcher in dependencies so useEffect re-runs when fetcher changes
    // This ensures episodes are refetched when selectedSeasonId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, retryCount, ...safeDependencies]);

  return { data, loading, error, reload };
}
