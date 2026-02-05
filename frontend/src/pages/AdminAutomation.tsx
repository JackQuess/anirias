import React, { useState, useCallback, useEffect, useRef } from 'react';
import { showToast } from '@/components/ToastProvider';
import type {
  AutomationAction,
  SourceProvider,
  MetadataProvider,
  AutomationRunPayload,
} from '@/utils/automationTypes';
import {
  AUTOMATION_ACTIONS,
  SOURCE_PROVIDERS,
  METADATA_PROVIDERS,
  SOURCE_ACTIONS,
  LIMIT_MIN,
  LIMIT_MAX,
  LIMIT_DEFAULT,
  DEFAULT_SOURCE_PROVIDERS,
  DEFAULT_METADATA_PROVIDERS,
} from '@/utils/automationTypes';

const ACTION_LABELS: Record<AutomationAction, string> = {
  DISCOVER_NEW_ANIME: 'Discover New Anime',
  SCAN_NEW_EPISODES: 'Scan New Episodes',
  SCAN_MISSING_EPISODES: 'Scan Missing Episodes',
  SCAN_MISSING_METADATA: 'Scan Missing Metadata',
};

const ACTION_DESCRIPTIONS: Record<AutomationAction, string> = {
  DISCOVER_NEW_ANIME: 'Yeni anime keşfet ve kataloğa ekle.',
  SCAN_NEW_EPISODES: 'Mevcut animelerde yeni bölümleri tara.',
  SCAN_MISSING_EPISODES: 'Eksik bölümleri tespit et ve kuyruğa al.',
  SCAN_MISSING_METADATA: 'Eksik metadata (AniList/MAL) alanlarını doldur.',
};

export interface AutomationJobStatus {
  id: string;
  type: string | null;
  status: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
  attempts: number | null;
  max_attempts: number | null;
}

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = ['done', 'failed', 'error', 'retry'];
const DISCOVERY_WINDOW_SEC = 10;
const DISCOVERY_TIMEOUT_MS = 90_000;
const LOGS_LIMIT = 300;

export interface AnimeSearchResult {
  id: number;
  title: string;
  year: number | null;
  image: string | null;
}

function getApiBase(): string | undefined {
  return (import.meta as any).env?.VITE_API_BASE_URL;
}

function isSourceAction(action: AutomationAction): boolean {
  return SOURCE_ACTIONS.includes(action);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function durationMs(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null;
  try {
    return new Date(endIso).getTime() - new Date(startIso).getTime();
  } catch {
    return null;
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min} m ${s} s`;
}

export default function AdminAutomation() {
  const [selectedAction, setSelectedAction] = useState<AutomationAction | null>(null);
  const [sourceProviders, setSourceProviders] = useState<SourceProvider[]>(() => [...DEFAULT_SOURCE_PROVIDERS]);
  const [metadataProviders, setMetadataProviders] = useState<MetadataProvider[]>(() => [...DEFAULT_METADATA_PROVIDERS]);
  const [limit, setLimit] = useState(LIMIT_DEFAULT);
  const [onlyExisting, setOnlyExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [jobStatuses, setJobStatuses] = useState<Record<string, AutomationJobStatus>>({});
  const pollDoneToastRef = useRef(false);
  const [runStartedAt, setRunStartedAt] = useState<string | null>(null);
  const [runJobKeyPrefix, setRunJobKeyPrefix] = useState<string | null>(null);
  const [runAction, setRunAction] = useState<string | null>(null);
  const [selectedRunJobId, setSelectedRunJobId] = useState<string | null>(null);
  const [runJobLogs, setRunJobLogs] = useState<Array<{ id: string; job_id: string; level: string | null; message: string | null; created_at: string | null }>>([]);
  const terminalStableSinceRef = useRef<number | null>(null);
  const [manualSource, setManualSource] = useState<'anilist' | 'mal'>('anilist');
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState<AnimeSearchResult[]>([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualImportingId, setManualImportingId] = useState<number | null>(null);
  const [workerControls, setWorkerControls] = useState<{
    id: number;
    paused?: boolean;
    max_concurrency?: number;
    max_per_anime?: number;
  } | null>(null);
  const [workerControlsLoading, setWorkerControlsLoading] = useState(false);
  const [workerControlsPatching, setWorkerControlsPatching] = useState(false);
  const [maxConcurrencyInput, setMaxConcurrencyInput] = useState('');
  const [maxPerAnimeInput, setMaxPerAnimeInput] = useState('');
  const [liveJobs, setLiveJobs] = useState<
    Array<{
      id: string;
      type: string | null;
      status: string | null;
      created_at: string | null;
      started_at: string | null;
      finished_at: string | null;
      locked_by: string | null;
      locked_at: string | null;
      last_error: string | null;
    }>
  >([]);
  const [liveJobsLoading, setLiveJobsLoading] = useState(false);
  const [selectedLiveJobId, setSelectedLiveJobId] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<Array<{ id: string; job_id: string; level: string | null; message: string | null; created_at: string | null }>>([]);
  const [jobLogsLoading, setJobLogsLoading] = useState(false);

  const toggleSourceProvider = useCallback((p: SourceProvider) => {
    setSourceProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }, []);

  const toggleMetadataProvider = useCallback((p: MetadataProvider) => {
    setMetadataProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }, []);

  const buildPayload = useCallback((): AutomationRunPayload => {
    const action = selectedAction!;
    const payload: AutomationRunPayload = { action };
    if (isSourceAction(action)) {
      if (sourceProviders.length > 0) payload.providers = [...sourceProviders];
    } else {
      if (metadataProviders.length > 0) payload.providers = [...metadataProviders];
    }
    if (limit >= LIMIT_MIN && limit <= LIMIT_MAX) payload.limit = limit;
    if (action === 'SCAN_MISSING_METADATA') payload.only_existing = onlyExisting;
    return payload;
  }, [selectedAction, sourceProviders, metadataProviders, limit, onlyExisting]);

  const fetchJob = useCallback(async (id: string): Promise<AutomationJobStatus | null> => {
    const apiBase = getApiBase();
    if (!apiBase) return null;
    try {
      const res = await fetch(`${apiBase}/api/automation/job?id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data?.job) return data.job as AutomationJobStatus;
      return null;
    } catch {
      return null;
    }
  }, []);

  const fetchRecentJobs = useCallback(
    async (opts: { startedAt: string; jobKeyPrefix: string; type: string; limit?: number }) => {
      const apiBase = getApiBase();
      if (!apiBase) return [];
      const since = new Date(new Date(opts.startedAt).getTime() - DISCOVERY_WINDOW_SEC * 1000).toISOString();
      const params = new URLSearchParams({
        created_after: since,
        job_key_prefix: opts.jobKeyPrefix,
        type: opts.type,
        limit: String(opts.limit ?? 10),
      });
      try {
        const res = await fetch(`${apiBase}/api/admin/jobs?${params}`);
        const data = await res.json().catch(() => []);
        if (!res.ok || !Array.isArray(data)) return [];
        return data as Array<{ id: string }>;
      } catch {
        return [];
      }
    },
    []
  );

  const fetchRunJobLogs = useCallback(async (jobId: string) => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    try {
      const res = await fetch(
        `${apiBase}/api/admin/job-logs?job_id=${encodeURIComponent(jobId)}&limit=${LOGS_LIMIT}`
      );
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) setRunJobLogs(data);
    } catch {
      setRunJobLogs([]);
    }
  }, []);

  const runWorkflow = async () => {
    if (!selectedAction) {
      showToast('Lütfen bir işlem seçin.', 'error');
      return;
    }
    const apiBase = getApiBase();
    if (!apiBase) {
      showToast('VITE_API_BASE_URL tanımlı değil.', 'error');
      return;
    }
    const limitNum = Number(limit);
    if (Number.isNaN(limitNum) || limitNum < LIMIT_MIN || limitNum > LIMIT_MAX) {
      showToast(`Limit ${LIMIT_MIN}-${LIMIT_MAX} arasında olmalı.`, 'error');
      return;
    }

    setLoading(true);
    setJobIds([]);
    setJobStatuses({});
    setRunStartedAt(null);
    setRunJobKeyPrefix(null);
    setRunAction(null);
    setSelectedRunJobId(null);
    setRunJobLogs([]);
    pollDoneToastRef.current = false;
    terminalStableSinceRef.current = null;
    try {
      const res = await fetch(`${apiBase}/api/automation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data && typeof data.error === 'string') ? data.error : `HTTP ${res.status}`;
        showToast(msg, 'error');
        setLoading(false);
        return;
      }
      const ids = Array.isArray(data?.job_ids) ? data.job_ids.filter((id: unknown) => typeof id === 'string') : [];
      const startedAt = typeof data?.startedAt === 'string' ? data.startedAt : null;
      const jobKeyPrefix = typeof data?.jobKeyPrefix === 'string' ? data.jobKeyPrefix : null;
      const action = typeof data?.action === 'string' ? data.action : selectedAction ?? null;
      setLoading(false);
      if (ids.length > 0) {
        setJobIds(ids);
        showToast('Job queued', 'info');
      } else if (startedAt && jobKeyPrefix && action) {
        setRunStartedAt(startedAt);
        setRunJobKeyPrefix(jobKeyPrefix);
        setRunAction(action);
        showToast('Workflow started — searching for jobs…', 'info');
      } else {
        showToast('Workflow started', 'success');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'İstek başarısız.';
      showToast(msg, 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!runStartedAt || !runJobKeyPrefix || !runAction || jobIds.length > 0) return;
    const start = Date.now();
    const poll = async () => {
      if (Date.now() - start > DISCOVERY_TIMEOUT_MS) return;
      const list = await fetchRecentJobs({
        startedAt: runStartedAt,
        jobKeyPrefix: runJobKeyPrefix,
        type: runAction,
        limit: 10,
      });
      if (list.length > 0) {
        const ids = list.map((j) => j.id);
        setJobIds(ids);
        setRunStartedAt(null);
        setRunJobKeyPrefix(null);
        setRunAction(null);
        showToast('Jobs found', 'info');
      }
    };
    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [runStartedAt, runJobKeyPrefix, runAction, jobIds.length, fetchRecentJobs]);

  useEffect(() => {
    if (jobIds.length === 0) return;
    const apiBase = getApiBase();
    if (!apiBase) return;

    const poll = async () => {
      const fetched: AutomationJobStatus[] = [];
      for (const id of jobIds) {
        const job = await fetchJob(id);
        if (job) {
          fetched.push(job);
          setJobStatuses((prev) => ({ ...prev, [id]: job }));
        }
      }
      const allTerminal =
        fetched.length === jobIds.length &&
        fetched.every((j) => TERMINAL_STATUSES.includes((j.status || '').toLowerCase()));
      if (!allTerminal) {
        terminalStableSinceRef.current = null;
        return;
      }
      const now = Date.now();
      if (terminalStableSinceRef.current === null) terminalStableSinceRef.current = now;
      if (now - terminalStableSinceRef.current < 10000) return;
      clearInterval(intervalId);
      const hasFailed = fetched.some(
        (j) => ['failed', 'error', 'retry'].includes((j.status || '').toLowerCase())
      );
      if (!pollDoneToastRef.current) {
        pollDoneToastRef.current = true;
        showToast(hasFailed ? 'Job failed' : 'Job completed', hasFailed ? 'error' : 'success');
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    poll();
    return () => clearInterval(intervalId);
  }, [jobIds.join(','), fetchJob]);

  useEffect(() => {
    if (!selectedRunJobId) {
      setRunJobLogs([]);
      return;
    }
    fetchRunJobLogs(selectedRunJobId);
    const t = setInterval(() => fetchRunJobLogs(selectedRunJobId), POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [selectedRunJobId, fetchRunJobLogs]);

  const runManualSearch = async () => {
    const apiBase = getApiBase();
    if (!apiBase || !manualQuery.trim()) {
      if (!manualQuery.trim()) showToast('Arama terimi girin.', 'error');
      return;
    }
    setManualSearching(true);
    setManualResults([]);
    try {
      const res = await fetch(
        `${apiBase}/api/anime/search?source=${encodeURIComponent(manualSource)}&q=${encodeURIComponent(manualQuery.trim())}`
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        showToast((data && data.error) || 'Arama başarısız', 'error');
        return;
      }
      setManualResults(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Arama başarısız', 'error');
    } finally {
      setManualSearching(false);
    }
  };

  const runManualImport = async (item: AnimeSearchResult) => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    setManualImportingId(item.id);
    try {
      const payload =
        manualSource === 'anilist'
          ? { source: 'anilist' as const, anilist_id: item.id }
          : { source: 'mal' as const, mal_id: item.id };
      const res = await fetch(`${apiBase}/api/automation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'IMPORT_ANIME', payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data?.error as string) || 'Import başarısız', 'error');
        return;
      }
      const ids = Array.isArray(data?.job_ids) ? data.job_ids.filter((id: unknown) => typeof id === 'string') : [];
      if (ids.length > 0) {
        setJobIds((prev) => [...prev, ...ids]);
        setJobStatuses({});
        pollDoneToastRef.current = false;
        showToast('Job queued', 'info');
      } else {
        showToast('Import başlatıldı (job id yok)', 'info');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import başarısız', 'error');
    } finally {
      setManualImportingId(null);
    }
  };

  const fetchWorkerControls = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    setWorkerControlsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/worker-controls`);
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setWorkerControls(data);
        setMaxConcurrencyInput(String(data.max_concurrency ?? ''));
        setMaxPerAnimeInput(String(data.max_per_anime ?? ''));
      }
    } finally {
      setWorkerControlsLoading(false);
    }
  }, []);

  const patchWorkerControls = useCallback(
    async (updates: { paused?: boolean; max_concurrency?: number; max_per_anime?: number }) => {
      const apiBase = getApiBase();
      if (!apiBase) return;
      setWorkerControlsPatching(true);
      try {
        const res = await fetch(`${apiBase}/api/admin/worker-controls`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast((data?.error as string) || 'Update failed', 'error');
          return;
        }
        setWorkerControls(data);
        if (typeof updates.max_concurrency === 'number') setMaxConcurrencyInput(String(updates.max_concurrency));
        if (typeof updates.max_per_anime === 'number') setMaxPerAnimeInput(String(updates.max_per_anime));
        showToast('Updated', 'success');
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Update failed', 'error');
      } finally {
        setWorkerControlsPatching(false);
      }
    },
    []
  );

  const fetchLiveJobs = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    setLiveJobsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/jobs?limit=20`);
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) setLiveJobs(data);
    } finally {
      setLiveJobsLoading(false);
    }
  }, []);

  const fetchJobLogs = useCallback(async (jobId: string) => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    setJobLogsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/job-logs?job_id=${encodeURIComponent(jobId)}&limit=100`);
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) setJobLogs(data);
    } finally {
      setJobLogsLoading(false);
    }
  }, []);

  const runReclaimStale = useCallback(async () => {
    const apiBase = getApiBase();
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/reclaim-stale`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data?.error as string) || 'Reclaim failed', 'error');
        return;
      }
      showToast('Updated', 'success');
      fetchLiveJobs();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Reclaim failed', 'error');
    }
  }, [fetchLiveJobs]);

  useEffect(() => {
    fetchWorkerControls();
  }, [fetchWorkerControls]);

  useEffect(() => {
    fetchLiveJobs();
    const t = setInterval(fetchLiveJobs, 2000);
    return () => clearInterval(t);
  }, [fetchLiveJobs]);

  useEffect(() => {
    if (!selectedLiveJobId) {
      setJobLogs([]);
      return;
    }
    fetchJobLogs(selectedLiveJobId);
    const t = setInterval(() => fetchJobLogs(selectedLiveJobId), 2000);
    return () => clearInterval(t);
  }, [selectedLiveJobId, fetchJobLogs]);

  return (
    <div className="space-y-8">
      <header className="pb-4 border-b border-white/5">
        <h1 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter">
          Otomasyon
        </h1>
        <p className="text-[10px] lg:text-xs text-gray-500 uppercase tracking-widest mt-1">
          n8n iş akışlarını tek tıkla çalıştır
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AUTOMATION_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setSelectedAction(action)}
            disabled={loading}
            className={`text-left p-5 rounded-2xl border transition-all ${
              selectedAction === action
                ? 'bg-brand-red/10 border-brand-red text-white'
                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
            } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className="text-xs font-black uppercase tracking-widest text-brand-red">
              {action.replace(/_/g, ' ')}
            </span>
            <h3 className="mt-2 text-sm font-bold text-white">
              {ACTION_LABELS[action]}
            </h3>
            <p className="mt-1 text-[10px] text-gray-500">
              {ACTION_DESCRIPTIONS[action]}
            </p>
          </button>
        ))}
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">
          Manual Import
        </h3>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-4">
          Kaynak seçin, arayın, listeden import edin.
        </p>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Source</label>
            <select
              value={manualSource}
              onChange={(e) => setManualSource(e.target.value as 'anilist' | 'mal')}
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-brand-red outline-none"
            >
              <option value="anilist">AniList</option>
              <option value="mal">MAL</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Arama (q)</label>
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runManualSearch()}
              placeholder="Anime adı..."
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-red outline-none"
            />
          </div>
          <button
            type="button"
            onClick={runManualSearch}
            disabled={manualSearching}
            className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/20 disabled:opacity-50"
          >
            {manualSearching ? 'Aranıyor…' : 'Search'}
          </button>
        </div>
        {manualResults.length > 0 && (
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3 w-20">Year</th>
                  <th className="text-left p-3 w-24">ID</th>
                  <th className="text-left p-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {manualResults.map((item) => (
                  <tr key={`${manualSource}-${item.id}`} className="border-t border-white/5">
                    <td className="p-3 text-white font-medium">{item.title}</td>
                    <td className="p-3 text-gray-400">{item.year ?? '—'}</td>
                    <td className="p-3 text-gray-400 font-mono text-xs">{item.id}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => runManualImport(item)}
                        disabled={manualImportingId !== null}
                        className="px-3 py-1.5 rounded-lg bg-brand-red/20 text-brand-red text-xs font-bold uppercase hover:bg-brand-red/30 disabled:opacity-50"
                      >
                        {manualImportingId === item.id ? '…' : 'Import'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">
          Worker Controls
        </h3>
        {workerControlsLoading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : workerControls ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  workerControls.paused ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}
              >
                {workerControls.paused ? 'PAUSED' : 'RUNNING'}
              </span>
              <button
                type="button"
                onClick={() => patchWorkerControls({ paused: !workerControls.paused })}
                disabled={workerControlsPatching}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold uppercase hover:bg-white/20 disabled:opacity-50"
              >
                {workerControls.paused ? 'Resume' : 'Pause'}
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">max_concurrency (1–10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxConcurrencyInput}
                  onChange={(e) => setMaxConcurrencyInput(e.target.value)}
                  className="w-20 rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white focus:border-brand-red outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">max_per_anime (1–10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxPerAnimeInput}
                  onChange={(e) => setMaxPerAnimeInput(e.target.value)}
                  className="w-20 rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white focus:border-brand-red outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const mc = parseInt(maxConcurrencyInput, 10);
                  const mp = parseInt(maxPerAnimeInput, 10);
                  const up: { max_concurrency?: number; max_per_anime?: number } = {};
                  if (mc >= 1 && mc <= 10) up.max_concurrency = mc;
                  if (mp >= 1 && mp <= 10) up.max_per_anime = mp;
                  if (Object.keys(up).length) patchWorkerControls(up);
                }}
                disabled={workerControlsPatching}
                className="px-3 py-1.5 rounded-lg bg-brand-red/20 text-brand-red text-xs font-bold uppercase hover:bg-brand-red/30 disabled:opacity-50"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={runReclaimStale}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold uppercase hover:bg-white/20"
              >
                Reclaim stale locks
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Worker controls not found</p>
        )}
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">
          Live Jobs
        </h3>
        {liveJobsLoading && liveJobs.length === 0 ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2 pr-4">Started</th>
                  <th className="pb-2 pr-4">Finished</th>
                  <th className="pb-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {liveJobs.map((job) => {
                  const status = (job.status ?? '').toLowerCase();
                  const duration = durationMs(job.started_at, job.finished_at);
                  const isSelected = selectedLiveJobId === job.id;
                  return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedLiveJobId(isSelected ? null : job.id)}
                      className={`border-b border-white/5 cursor-pointer ${isSelected ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
                    >
                      <td className="py-2 pr-4 text-white font-medium">{job.type ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            status === 'done' ? 'bg-green-500/20 text-green-400' :
                            status === 'error' || status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            status === 'running' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-white/10 text-gray-400'
                          }`}
                        >
                          {status || 'queued'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-400">{formatDate(job.created_at)}</td>
                      <td className="py-2 pr-4 text-gray-400">{formatDate(job.started_at)}</td>
                      <td className="py-2 pr-4 text-gray-400">{formatDate(job.finished_at)}</td>
                      <td className="py-2 text-gray-400">{formatDuration(duration)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {selectedLiveJobId && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
              Logs — {selectedLiveJobId.slice(0, 8)}…
            </p>
            {jobLogsLoading && jobLogs.length === 0 ? (
              <p className="text-gray-500 text-sm">Loading logs…</p>
            ) : (
              <ul className="space-y-1 font-mono text-xs text-gray-300 max-h-60 overflow-y-auto">
                {jobLogs.map((log) => (
                  <li key={log.id} className="flex gap-2">
                    <span
                      className={`shrink-0 w-12 uppercase ${
                        log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-gray-500'
                      }`}
                    >
                      [{log.level ?? 'info'}]
                    </span>
                    <span className="text-gray-400 shrink-0">{formatDate(log.created_at)}</span>
                    <span className="break-all">{log.message ?? ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {selectedAction && (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 max-w-xl">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">
            Parametreler — {ACTION_LABELS[selectedAction]}
          </h3>

          <div className="space-y-4">
            {isSourceAction(selectedAction) ? (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                  Kaynak sağlayıcılar (Source)
                </p>
                <div className="flex gap-4">
                  {SOURCE_PROVIDERS.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 cursor-pointer text-sm text-white"
                    >
                      <input
                        type="checkbox"
                        checked={sourceProviders.includes(p)}
                        onChange={() => toggleSourceProvider(p)}
                        className="rounded border-white/30 bg-white/5 text-brand-red focus:ring-brand-red"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                  Metadata sağlayıcılar
                </p>
                <div className="flex gap-4">
                  {METADATA_PROVIDERS.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 cursor-pointer text-sm text-white"
                    >
                      <input
                        type="checkbox"
                        checked={metadataProviders.includes(p)}
                        onChange={() => toggleMetadataProvider(p)}
                        className="rounded border-white/30 bg-white/5 text-brand-red focus:ring-brand-red"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Limit (1–{LIMIT_MAX})
              </label>
              <input
                type="number"
                min={LIMIT_MIN}
                max={LIMIT_MAX}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || LIMIT_DEFAULT)}
                className="w-24 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-brand-red outline-none"
              />
            </div>

            {selectedAction === 'SCAN_MISSING_METADATA' && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                  <input
                    type="checkbox"
                    checked={onlyExisting}
                    onChange={(e) => setOnlyExisting(e.target.checked)}
                    className="rounded border-white/30 bg-white/5 text-brand-red focus:ring-brand-red"
                  />
                  <span className="text-[10px] uppercase tracking-wider">
                    Only existing (sadece mevcut kayıtlar)
                  </span>
                </label>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={runWorkflow}
            disabled={loading}
            className="mt-6 px-6 py-3 rounded-xl bg-brand-red text-white text-xs font-black uppercase tracking-widest hover:bg-brand-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Çalışıyor…' : 'Run'}
          </button>
        </div>
      )}

      {(jobIds.length > 0 || runStartedAt) && (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest">
              Job durumu
            </h3>
            <button
              type="button"
              onClick={() => {
                setJobIds([]);
                setJobStatuses({});
                setRunStartedAt(null);
                setRunJobKeyPrefix(null);
                setRunAction(null);
                setSelectedRunJobId(null);
                setRunJobLogs([]);
                pollDoneToastRef.current = false;
                terminalStableSinceRef.current = null;
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-400 text-xs font-bold uppercase hover:bg-white/20 hover:text-white"
            >
              Clear
            </button>
          </div>
          {runStartedAt && jobIds.length === 0 ? (
            <p className="text-gray-500 text-sm">Searching for jobs…</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-gray-500">
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Created</th>
                      <th className="pb-2 pr-4">Finished</th>
                      <th className="pb-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobIds.map((id) => {
                      const job = jobStatuses[id];
                      const status = (job?.status ?? 'queued').toLowerCase();
                      const duration = durationMs(job?.started_at ?? null, job?.finished_at ?? null);
                      const isSelected = selectedRunJobId === id;
                      return (
                        <tr
                          key={id}
                          onClick={() => setSelectedRunJobId(isSelected ? null : id)}
                          className={`border-b border-white/5 cursor-pointer ${isSelected ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
                        >
                          <td className="py-3 pr-4 text-white font-medium">{job?.type ?? id.slice(0, 8)}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                status === 'done'
                                  ? 'bg-green-500/20 text-green-400'
                                  : status === 'failed' || status === 'error' || status === 'retry'
                                    ? 'bg-red-500/20 text-red-400'
                                    : status === 'running'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-white/10 text-gray-400'
                              }`}
                            >
                              {status || 'queued'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-400">{formatDate(job?.created_at ?? null)}</td>
                          <td className="py-3 pr-4 text-gray-400">{formatDate(job?.finished_at ?? null)}</td>
                          <td className="py-3 text-gray-400">{formatDuration(duration)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {jobIds.some((id) => (jobStatuses[id]?.last_error ?? '').trim()) && (
                <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-2">Hatalar</p>
                  {jobIds.map((id) => {
                    const err = jobStatuses[id]?.last_error?.trim();
                    if (!err) return null;
                    return (
                      <p key={id} className="text-xs text-red-300/90 font-mono break-all">
                        {err}
                      </p>
                    );
                  })}
                </div>
              )}
              {selectedRunJobId && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    Logs — {selectedRunJobId.slice(0, 8)}…
                  </p>
                  <ul className="space-y-1 font-mono text-xs text-gray-300 max-h-60 overflow-y-auto">
                    {runJobLogs.map((log) => (
                      <li key={log.id} className="flex gap-2">
                        <span
                          className={`shrink-0 w-12 uppercase ${
                            log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-gray-500'
                          }`}
                        >
                          [{log.level ?? 'info'}]
                        </span>
                        <span className="text-gray-400 shrink-0">{formatDate(log.created_at)}</span>
                        <span className="break-all">{log.message ?? ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
