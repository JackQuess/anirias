import { Router, type Request, type Response } from 'express';

const router = Router();

const ALLOWED_HOSTNAMES = new Set([
  'anirias-videos.nbg1.your-objectstorage.com',
  'anirias-media.nbg1.your-objectstorage.com',
  'anirias-videos.b-cdn.net',
]);

router.get('/vtt-proxy', async (req: Request, res: Response) => {
  const { url } = req.query;
  if (typeof url !== 'string' || !url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!['https:', 'http:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Invalid protocol' });
  }

  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    return res.status(403).json({ error: 'URL host not allowed' });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AniRias/1.0)',
      },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).send(`Upstream error ${upstream.status}`);
    }
    const text = await upstream.text();
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(text);
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'Upstream fetch failed' });
  }
});

export default router;
