import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getLogsStreamUrl } from '@/lib/automationClient';

type ConnectionStatus = 'live' | 'reconnecting' | 'offline';

interface LiveLogsProps {
  jobId?: string | null;
}

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export const LiveLogs: React.FC<LiveLogsProps> = ({ jobId }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [error, setError] = useState<string | null>(null);
  const reconnectMsRef = useRef(INITIAL_RECONNECT_MS);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const url = getLogsStreamUrl(jobId);
    setStatus('reconnecting');
    setError(null);

    fetch(url, { signal: abortRef.current.signal })
      .then((res) => {
        if (!mountedRef.current || !res.body) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStatus('live');
        reconnectMsRef.current = INITIAL_RECONNECT_MS;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const read = async (): Promise<void> => {
          const { done, value } = await reader.read();
          if (done || !mountedRef.current) return;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';
          const newLines: string[] = [];
          for (const p of parts) {
            const line = p.startsWith('data:') ? p.slice(5).trim() : p.trim();
            if (line && line !== '[DONE]') newLines.push(line);
          }
          if (newLines.length > 0) {
            setLines((prev) => [...prev.slice(-500), ...newLines]);
          }
          return read();
        };
        return read();
      })
      .catch((e) => {
        if (!mountedRef.current || e.name === 'AbortError') return;
        setStatus('offline');
        setError(e.message || 'Bağlantı koptu');
        const delay = reconnectMsRef.current;
        reconnectMsRef.current = Math.min(reconnectMsRef.current * 2, MAX_RECONNECT_MS);
        setTimeout(connect, delay);
      });
  }, [jobId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [connect]);

  const statusColors: Record<ConnectionStatus, string> = {
    live: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    reconnecting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    offline: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusLabels: Record<ConnectionStatus, string> = {
    live: 'Live',
    reconnecting: 'Reconnecting…',
    offline: 'Offline',
  };

  return (
    <div className="bg-brand-dark border border-brand-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-brand-border">
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Live Logs</h3>
        <div className="flex items-center gap-2">
          {jobId && (
            <span className="text-[10px] font-mono text-gray-500">jobId={jobId.slice(0, 8)}…</span>
          )}
          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
          {error && <span className="text-[10px] text-red-400">{error}</span>}
        </div>
      </div>
      <div className="h-64 overflow-y-auto bg-black/60 p-4 font-mono text-xs text-gray-300">
        {lines.length === 0 && status === 'offline' && (
          <p className="text-gray-500">Bağlantı bekleniyor veya log gelmedi.</p>
        )}
        {lines.map((line, i) => (
          <div key={i} className="py-0.5 border-b border-white/5 last:border-0">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
