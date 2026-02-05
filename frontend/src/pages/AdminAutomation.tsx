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
const TERMINAL_STATUSES = ['done', 'failed'];

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
    pollDoneToastRef.current = false;
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
      setJobIds(ids);
      setLoading(false);
      if (ids.length > 0) {
        showToast('Job queued', 'info');
      } else {
        showToast('Workflow started (no job ids returned)', 'success');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'İstek başarısız.';
      showToast(msg, 'error');
      setLoading(false);
    }
  };

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
      if (!allTerminal) return;
      clearInterval(intervalId);
      const hasFailed = fetched.some((j) => (j.status || '').toLowerCase() === 'failed');
      if (!pollDoneToastRef.current) {
        pollDoneToastRef.current = true;
        showToast(hasFailed ? 'Job failed' : 'Job completed', hasFailed ? 'error' : 'success');
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    poll();
    return () => clearInterval(intervalId);
  }, [jobIds.join(','), fetchJob]);

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

      {jobIds.length > 0 && (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">
            Job durumu
          </h3>
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
                  return (
                    <tr key={id} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-white font-medium">{job?.type ?? id.slice(0, 8)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            status === 'done'
                              ? 'bg-green-500/20 text-green-400'
                              : status === 'failed'
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
        </div>
      )}
    </div>
  );
}
