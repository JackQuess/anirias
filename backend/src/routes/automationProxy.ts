/**
 * Proxy to automation server (port 3190).
 * Forwards requests to AUTOMATION_BASE_URL with X-API-KEY when AUTOMATION_API_KEY is set.
 */

import { Router, Request, Response } from 'express';

const router = Router();
const baseUrl = process.env.AUTOMATION_BASE_URL || '';
const apiKey = process.env.AUTOMATION_API_KEY || '';

function isConfigured(): boolean {
  return !!baseUrl && baseUrl.length > 0;
}

router.use(async (req: Request, res: Response) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Automation server not configured (AUTOMATION_BASE_URL)' });
  }

  const path = (req.path || '').replace(/^\/+/, '') || 'api/health';
  const targetUrl = `${baseUrl.replace(/\/+$/, '')}/${path}`;
  const method = req.method;

  const headers: Record<string, string> = {
    'Content-Type': req.headers['content-type'] || 'application/json',
    ...(req.headers['accept'] && { Accept: req.headers['accept'] as string }),
  };
  if (apiKey) headers['X-API-KEY'] = apiKey;

  try {
    const fetchRes = await fetch(targetUrl, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(req.body || {}),
    });

    const contentType = fetchRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await fetchRes.json();
      return res.status(fetchRes.status).json(data);
    }
    const text = await fetchRes.text();
    return res.status(fetchRes.status).send(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Proxy request failed';
    return res.status(502).json({ error: msg });
  }
});

export default router;
