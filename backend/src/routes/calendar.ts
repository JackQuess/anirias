import { Router, type Request, type Response } from 'express';
import { getCalendarRange } from '../services/airingSchedule.js';

const router = Router();

const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = Number(process.env.CALENDAR_RATE_LIMIT_PER_MIN || '60');
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = ipHits.get(ip);

  if (!current || now > current.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT) return true;
  current.count += 1;
  return false;
}

router.get('/calendar', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const fromRaw = typeof req.query.from === 'string' ? req.query.from : '';
  const daysRaw = typeof req.query.days === 'string' ? req.query.days : '7';
  const today = new Date().toISOString().slice(0, 10);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : today;
  const days = Number.parseInt(daysRaw, 10);

  try {
    const items = await getCalendarRange(from, Number.isNaN(days) ? 7 : days);
    return res.json(items);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Failed to load calendar' });
  }
});

export default router;
