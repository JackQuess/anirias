import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin.js';

export function getAuthToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const spaceIndex = header.indexOf(' ');
  if (spaceIndex === -1) return null;
  const scheme = header.slice(0, spaceIndex).toLowerCase();
  const token = header.slice(spaceIndex + 1).trim();
  if (scheme !== 'bearer' || !token) return null;
  return token;
}

/**
 * Verifies a Supabase access token via supabaseAdmin.auth.getUser().
 * This works with both HS256 and ECC P-256 (JWT V2) signing keys.
 */
export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.id) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    (req as any).userId = data.user.id;
    next();
  } catch (err: any) {
    console.error('[auth.requireUser] Unexpected error:', err?.message);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

export function getUserIdFromRequest(req: Request): string | null {
  const id = (req as any).userId;
  if (typeof id === 'string' && id) return id;
  return null;
}
