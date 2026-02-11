/**
 * Client for automation server (3190) via backend proxy.
 * All calls go to VITE_API_BASE_URL/api/automation-proxy/...
 */

const getBase = (): string => {
  const base = (import.meta as any).env?.VITE_API_BASE_URL;
  if (!base) throw new Error('VITE_API_BASE_URL not configured');
  return `${base.replace(/\/+$/, '')}/api/automation-proxy`;
};

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const url = `${getBase()}/${path.replace(/^\/+/, '')}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const err = typeof data === 'object' && data?.error ? data.error : `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

export interface AutomationJob {
  id: string;
  type?: string;
  status?: string;
  season_id?: string;
  episode_number?: number;
  source_id?: string;
  source_slug?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface AutomationHealth {
  ok?: boolean;
  [key: string]: unknown;
}

export const automationClient = {
  getHealth: () => request<AutomationHealth>('api/health'),

  listJobs: (params?: { status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return request<AutomationJob[]>(`api/jobs${suffix}`);
  },

  getJob: (id: string) => request<AutomationJob>(`api/jobs/${id}`),

  getJobLogs: (id: string, limit = 200) =>
    request<{ logs?: string[]; lines?: string[] }>(`api/jobs/${id}/logs?limit=${limit}`),

  createScanMissing: (payload?: Record<string, unknown>) =>
    request<{ job_id?: string; id?: string }>('jobs/scan-missing', { method: 'POST', body: payload ?? {} }),

  createImportMissing: (payload?: Record<string, unknown>) =>
    request<{ job_id?: string; id?: string }>('jobs/import-missing', { method: 'POST', body: payload ?? {} }),

  createMetadataPatch: (payload?: Record<string, unknown>) =>
    request<{ job_id?: string; id?: string }>('jobs/metadata-patch', { method: 'POST', body: payload ?? {} }),

  watchStart: () => request<{ ok?: boolean }>('api/watch_new/start', { method: 'POST' }),

  watchStop: () => request<{ ok?: boolean }>('api/watch_new/stop', { method: 'POST' }),

  resumeJob: (id: string) => request<{ ok?: boolean }>(`api/jobs/${id}/resume`, { method: 'POST' }),

  cancelJob: (id: string) => request<{ ok?: boolean }>(`api/jobs/${id}/cancel`, { method: 'POST' }),

  replyPaused: (payload: { jobId: string; season_id: string; source_id: string; source_slug: string }) =>
    request<{ ok?: boolean }>('jobs/reply', { method: 'POST', body: payload }),

  runJob: (id: string) => request<{ ok?: boolean }>(`api/jobs/${id}/run`, { method: 'POST' }),

  addAnime: (payload: { query?: string; anilistId?: number }) =>
    request<{ job_id?: string; id?: string }>('jobs/add-anime', { method: 'POST', body: payload }),

  manualImport: (payload: { animeSlug: string; seasonNumber: number; sourceId: string; sourceSlug: string }) =>
    request<{ job_id?: string; id?: string }>('jobs/manual-import', { method: 'POST', body: payload }),
};

/** SSE logs stream URL (use with fetch + ReadableStream or EventSource) */
export function getLogsStreamUrl(jobId?: string | null): string {
  const base = (import.meta as any).env?.VITE_API_BASE_URL;
  if (!base) throw new Error('VITE_API_BASE_URL not configured');
  const url = `${base.replace(/\/+$/, '')}/api/automation-proxy/api/logs/stream`;
  return jobId ? `${url}?jobId=${encodeURIComponent(jobId)}` : url;
}
