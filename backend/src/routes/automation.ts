import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin.js';

const AUTOMATION_ACTIONS = [
  'DISCOVER_NEW_ANIME',
  'SCAN_NEW_EPISODES',
  'SCAN_MISSING_EPISODES',
  'SCAN_MISSING_METADATA',
] as const;
const VALID_PROVIDERS = ['diziwatch', 'animecix', 'anilist', 'mal'];
const LIMIT_MIN = 1;
const LIMIT_MAX = 500;
const FETCH_TIMEOUT_MS = 10_000;

function isAuthorized(req: Request): boolean {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.AUTOMATION_ADMIN_SECRET;
  if (expected && secret === expected) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

function validateBody(
  body: unknown
): { action: string; providers?: string[]; limit?: number; only_existing?: boolean; job_key?: string } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const action = b.action;
  if (typeof action !== 'string' || !AUTOMATION_ACTIONS.includes(action as (typeof AUTOMATION_ACTIONS)[number]))
    return null;
  const out: {
    action: string;
    providers?: string[];
    limit?: number;
    only_existing?: boolean;
    job_key?: string;
  } = { action };
  if (Array.isArray(b.providers) && b.providers.length > 0) {
    const providers = b.providers.filter(
      (p): p is string => typeof p === 'string' && VALID_PROVIDERS.includes(p)
    );
    if (providers.length > 0) out.providers = providers;
  }
  if (
    typeof b.limit === 'number' &&
    Number.isInteger(b.limit) &&
    b.limit >= LIMIT_MIN &&
    b.limit <= LIMIT_MAX
  ) {
    out.limit = b.limit;
  }
  if (b.action === 'SCAN_MISSING_METADATA' && typeof b.only_existing === 'boolean') {
    out.only_existing = b.only_existing;
  }
  if (typeof b.job_key === 'string' && b.job_key.trim()) out.job_key = b.job_key.trim();
  return out;
}

const router = Router();

/** GET /api/automation/job?id=<job_id> — job status from Supabase jobs table (no auth: job id is UUID) */
router.get('/job', async (req: Request, res: Response) => {
  const id = typeof req.query.id === 'string' ? req.query.id.trim() : null;
  if (!id) {
    return res.status(200).json({ ok: false, error: 'JOB_NOT_FOUND' });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('id, type, status, created_at, started_at, finished_at, last_error, attempts, max_attempts')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      return res.status(200).json({ ok: false, error: 'JOB_NOT_FOUND' });
    }
    if (!data) {
      return res.status(200).json({ ok: false, error: 'JOB_NOT_FOUND' });
    }
    return res.status(200).json({
      ok: true,
      job: {
        id: data.id,
        type: data.type ?? null,
        status: data.status ?? null,
        created_at: data.created_at ?? null,
        started_at: data.started_at ?? null,
        finished_at: data.finished_at ?? null,
        last_error: data.last_error ?? null,
        attempts: data.attempts ?? null,
        max_attempts: data.max_attempts ?? null,
      },
    });
  } catch {
    return res.status(200).json({ ok: false, error: 'JOB_NOT_FOUND' });
  }
});

/** Validate IMPORT_ANIME payload: { source: 'anilist'|'mal', anilist_id?: number, mal_id?: number } */
function validateImportAnimePayload(payload: unknown): { source: 'anilist'; anilist_id: number } | { source: 'mal'; mal_id: number } | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const source = p.source;
  if (source === 'anilist') {
    const id = p.anilist_id;
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) return null;
    return { source: 'anilist', anilist_id: id };
  }
  if (source === 'mal') {
    const id = p.mal_id;
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) return null;
    return { source: 'mal', mal_id: id };
  }
  return null;
}

router.post('/run', async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as { action?: string; payload?: unknown };
  const action = body?.action;

  if (action === 'IMPORT_ANIME') {
    const payload = validateImportAnimePayload(body.payload);
    if (!payload) {
      return res.status(400).json({
        error: 'Invalid body',
        details: 'IMPORT_ANIME requires payload: { source: "anilist", anilist_id: number } or { source: "mal", mal_id: number }',
      });
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('jobs')
        .insert({
          type: 'IMPORT_ANIME',
          status: 'queued',
          payload: payload,
        })
        .select('id')
        .single();
      if (error) {
        return res.status(500).json({ error: error.message || 'Failed to create job' });
      }
      const id = data?.id;
      if (!id) {
        return res.status(500).json({ error: 'Job created but no id returned' });
      }
      return res.status(200).json({ ok: true, job_ids: [String(id)] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create job';
      return res.status(500).json({ error: msg });
    }
  }

  const webhookUrl = process.env.N8N_WEBHOOK_CONTROL_URL;
  if (!webhookUrl?.trim()) {
    return res.status(503).json({
      error: 'N8N webhook not configured (N8N_WEBHOOK_CONTROL_URL)',
    });
  }

  const payload = validateBody(req.body);
  if (!payload) {
    return res.status(400).json({
      error: 'Invalid body',
      details:
        'action must be one of: DISCOVER_NEW_ANIME, SCAN_NEW_EPISODES, SCAN_MISSING_EPISODES, SCAN_MISSING_METADATA; limit 1-500 if set',
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    const text = await response.text();
    const data = isJson ? (JSON.parse(text) as unknown) : { raw: text };

    if (!response.ok) {
      return res.status(response.status).json(
        typeof data === 'object' && data !== null && 'error' in (data as object)
          ? data
          : { error: text || `n8n returned ${response.status}` }
      );
    }

    const startedAt = new Date().toISOString();
    const jobKeyPrefixMap: Record<string, string> = {
      DISCOVER_NEW_ANIME: 'n8n:discover:',
      SCAN_NEW_EPISODES: 'n8n:scan_new:',
      SCAN_MISSING_EPISODES: 'n8n:scan_missing:',
      SCAN_MISSING_METADATA: 'n8n:scan_missing_metadata:',
    };
    const jobKeyPrefix = payload.job_key
      ? (payload.job_key.endsWith(':') ? payload.job_key : payload.job_key + ':')
      : jobKeyPrefixMap[payload.action] ?? `n8n:${payload.action.toLowerCase()}:`;
    const jobIds = Array.isArray((data as { job_ids?: unknown }).job_ids)
      ? (data as { job_ids: string[] }).job_ids.filter((id): id is string => typeof id === 'string')
      : typeof (data as { job_id?: unknown }).job_id === 'string'
        ? [(data as { job_id: string }).job_id]
        : [];
    const executionId = (data as { executionId?: string }).executionId ?? (data as { execution_id?: string }).execution_id;
    return res.status(200).json({
      ok: true,
      action: payload.action,
      startedAt,
      jobKeyPrefix,
      ...(jobIds.length > 0 && { job_ids: jobIds }),
      ...(typeof executionId === 'string' && executionId && { executionId }),
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Request to n8n timed out' });
      }
      return res.status(502).json({ error: err.message || 'n8n request failed' });
    }
    return res.status(502).json({ error: 'n8n request failed' });
  }
});

export default router;
