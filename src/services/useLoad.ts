
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

  const reload = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

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
  }, [retryCount, ...dependencies]);

  return { data, loading, error, reload };
}
