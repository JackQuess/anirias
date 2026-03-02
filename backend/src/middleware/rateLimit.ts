import type { Request, Response, NextFunction } from 'express';

type Key = string;

interface Bucket {
  minute: number;
  count: number;
}

const buckets = new Map<Key, Bucket>();

function getIp(req: Request): string {
  const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return xff || req.socket.remoteAddress || 'unknown';
}

function checkLimit(key: string, limit: number): boolean {
  const nowMinute = Math.floor(Date.now() / 60000);
  const existing = buckets.get(key);

  if (!existing || existing.minute !== nowMinute) {
    buckets.set(key, { minute: nowMinute, count: 1 });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function rateLimitPairingCreate(limitPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const deviceId = (req.body?.deviceId as string | undefined) || 'unknown-device';
    const ip = getIp(req);
    const key = `pairing_create:${deviceId}:${ip}`;

    if (!checkLimit(key, limitPerMinute)) {
      res.status(429).json({ error: 'Too many pairing create requests' });
      return;
    }

    next();
  };
}

export function rateLimitPairingClaim(limitPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getIp(req);
    const key = `pairing_claim:${ip}`;

    if (!checkLimit(key, limitPerMinute)) {
      res.status(429).json({ error: 'Too many pairing claim requests' });
      return;
    }

    next();
  };
}

