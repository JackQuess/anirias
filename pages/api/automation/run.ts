import type { NextApiRequest, NextApiResponse } from 'next';

const AUTOMATION_ACTIONS = [
  'DISCOVER_NEW_ANIME',
  'SCAN_NEW_EPISODES',
  'SCAN_MISSING_EPISODES',
  'SCAN_MISSING_METADATA',
] as const;
const VALID_PROVIDERS = ['anilist', 'mal'];
const LIMIT_MIN = 1;
const LIMIT_MAX = 500;
const FETCH_TIMEOUT_MS = 10_000;

function isAuthorized(req: NextApiRequest): boolean {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.AUTOMATION_ADMIN_SECRET;
  if (expected && secret === expected) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

function validateBody(body: unknown): { action: string; providers?: string[]; limit?: number; only_existing?: boolean } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const action = b.action;
  if (typeof action !== 'string' || !AUTOMATION_ACTIONS.includes(action as any)) return null;
  const out: { action: string; providers?: string[]; limit?: number; only_existing?: boolean } = { action };
  if (Array.isArray(b.providers) && b.providers.length > 0) {
    const providers = b.providers.filter((p): p is string => typeof p === 'string' && VALID_PROVIDERS.includes(p));
    if (providers.length > 0) out.providers = providers;
  }
  if (typeof b.limit === 'number' && Number.isInteger(b.limit) && b.limit >= LIMIT_MIN && b.limit <= LIMIT_MAX) {
    out.limit = b.limit;
  }
  if (b.action === 'SCAN_MISSING_METADATA' && typeof b.only_existing === 'boolean') {
    out.only_existing = b.only_existing;
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_CONTROL_URL;
  if (!webhookUrl?.trim()) {
    return res.status(503).json({ error: 'N8N webhook not configured (N8N_WEBHOOK_CONTROL_URL)' });
  }

  const payload = validateBody(req.body);
  if (!payload) {
    return res.status(400).json({
      error: 'Invalid body',
      details: 'action must be one of: DISCOVER_NEW_ANIME, SCAN_NEW_EPISODES, SCAN_MISSING_EPISODES, SCAN_MISSING_METADATA; limit 1-500 if set',
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

    return res.status(200).json(data);
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
}
