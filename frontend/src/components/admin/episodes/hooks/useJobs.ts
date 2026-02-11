import { useState, useEffect, useCallback } from 'react';
import { automationClient, type AutomationJob } from '@/lib/automationClient';

export function useJobs(options?: { pollInterval?: number; limit?: number }) {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await automationClient.listJobs({ limit: options?.limit ?? 20 });
      setJobs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [options?.limit]);

  useEffect(() => {
    fetchJobs();
    const interval = options?.pollInterval ?? 5000;
    const id = setInterval(fetchJobs, interval);
    return () => clearInterval(id);
  }, [fetchJobs, options?.pollInterval]);

  return { jobs, loading, error, reload: fetchJobs };
}
