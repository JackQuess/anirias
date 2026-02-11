import { useState, useEffect, useCallback } from 'react';
import { automationClient } from '@/lib/automationClient';

export function useLiveLogs(jobId: string | null, options?: { pollInterval?: number }) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!jobId) {
      setLines([]);
      return;
    }
    setLoading(true);
    try {
      const data = await automationClient.getJobLogs(jobId, 200);
      const arr = Array.isArray(data?.logs) ? data.logs : Array.isArray(data?.lines) ? data.lines : [];
      setLines(arr);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs');
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchLogs();
    if (!jobId) return;
    const interval = options?.pollInterval ?? 2000;
    const id = setInterval(fetchLogs, interval);
    return () => clearInterval(id);
  }, [jobId, fetchLogs, options?.pollInterval]);

  return { lines, loading, error, reload: fetchLogs };
}
