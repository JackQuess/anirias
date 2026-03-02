import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface SupabaseJwtPayload {
  sub: string;
  // Other Supabase claims are ignored here
  [key: string]: any;
}

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  console.warn('[auth] SUPABASE_JWT_SECRET is not set. Authenticated routes will fail.');
}

export function getAuthToken(req: Request): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export function verifySupabaseJwt(token: string): SupabaseJwtPayload | null {
  if (!SUPABASE_JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as SupabaseJwtPayload;
    if (!decoded || typeof decoded.sub !== 'string') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const payload = verifySupabaseJwt(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Attach user id for downstream handlers
  (req as any).userId = payload.sub;
  next();
}

export function getUserIdFromRequest(req: Request): string | null {
  const existing = (req as any).userId;
  if (typeof existing === 'string' && existing) return existing;

  const token = getAuthToken(req);
  if (!token) return null;
  const payload = verifySupabaseJwt(token);
  return payload?.sub ?? null;
}

