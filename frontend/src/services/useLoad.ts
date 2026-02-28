
import { useState, useEffect, useCallback, useRef } from 'react';
import { LoadState } from '../types';

export function useLoad<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // SAFE: Ensure dependencies is always an array
  const safeDependencies = Array.isArray(dependencies) ? dependencies : [];

  const reload = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Abort previous request if still pending (prevent duplicate parallel requests)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setLoading(true);
    setError(null);
    // FIXED: Don't clear old data immediately - keep it visible until new data arrives
    // This prevents UI flicker/flash when dependencies change
    // setData(null); // REMOVED: Causes UI to flash empty

    const timeoutId = setTimeout(() => {
      if (isMounted && !controller.signal.aborted) {
        controller.abort();
        setError(new Error('İstek zaman aşımına uğradı. Lütfen bağlantınızı kontrol edin.'));
        setLoading(false);
        console.warn('[Anirias:useLoad] request timeout (25s)');
      }
    }, 25000); // Generous timeout so slow connections don't hit "İstek zaman aşımına uğradı"

    const executeFetch = async () => {
      try {
        const result = await fetcher();
        // Check if request was aborted or component unmounted
        if (controller.signal.aborted || !isMounted) {
          return;
        }
        setData(result);
        setError(null);
      } catch (err: any) {
        // Ignore abort errors
        if (controller.signal.aborted || !isMounted) {
          return;
        }
        // Don't set error for aborted requests
        if (err?.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err : new Error('Beklenmedik bir hata oluştu'));
        console.error('[Anirias:useLoad] fetch error', err?.message || err);
        // Only clear data on error if there's no existing data
        // This prevents clearing good data if a subsequent request fails
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    executeFetch();

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
    };
    // CRITICAL: Only include dependencies, NOT fetcher function
    // - fetcher function should be memoized with useCallback by caller
    // - Including fetcher causes infinite loops if fetcher is recreated
    // - safeDependencies: ensures useEffect re-runs when explicit dependencies change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, ...safeDependencies]);

  return { data, loading, error, reload };
}
