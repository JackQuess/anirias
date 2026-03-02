import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { supabaseAdmin } from '../services/supabaseAdmin.js';
import { requireUser, getUserIdFromRequest } from '../utils/auth.js';
import { getEntitlements, getDeviceLimit } from '../services/entitlements.js';
import { rateLimitPairingCreate, rateLimitPairingClaim } from '../middleware/rateLimit.js';
import jwt from 'jsonwebtoken';

const router = Router();

type Platform = 'desktop' | 'mobile';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'missing';

function generateCode(): string {
  // 6-digit numeric code using crypto-safe random
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(6, '0');
}

async function createUniqueCode(): Promise<string> {
  const maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i += 1) {
    const code = generateCode();
    const { data, error } = await supabaseAdmin
      .from('pairing_codes')
      .select('code')
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      // On error, still return this code to avoid blocking (collision risk is negligible)
      return code;
    }

    if (!data) {
      return code;
    }
  }

  // Fall back if collisions keep happening
  return generateCode();
}

// 1) POST /pairing/create
router.post(
  '/pairing/create',
  rateLimitPairingCreate(5),
  async (req: Request, res: Response) => {
    const { deviceId, platform } = req.body as { deviceId?: string; platform?: Platform };

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    if (platform !== 'desktop') {
      return res.status(400).json({ error: 'platform must be "desktop"' });
    }

    try {
      const code = await createUniqueCode();
      const now = new Date();
      const expires = new Date(now.getTime() + 30_000); // 30 seconds

      const { error } = await supabaseAdmin.from('pairing_codes').insert({
        code,
        desktop_device_id: deviceId,
        created_at: now.toISOString(),
        expires_at: expires.toISOString(),
        used_at: null,
        user_id: null,
      });

      if (error) {
        return res.status(500).json({ error: `Failed to create pairing code: ${error.message}` });
      }

      return res.json({ code, expiresAt: expires.toISOString() });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[pairing/create] Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// 2) GET /pairing/status?code=XXXXXX
router.get('/pairing/status', async (req: Request, res: Response) => {
  const { code } = req.query as { code?: string };
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('pairing_codes')
      .select('code, desktop_device_id, created_at, expires_at, used_at, user_id')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: `Failed to fetch pairing code: ${error.message}` });
    }

    if (!data) {
      return res.json({ status: 'expired' });
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at as string);

    if (data.used_at) {
      // Claimed
      let sessionToken: string | null = null;

      if (data.user_id && SUPABASE_JWT_SECRET !== 'missing') {
        // Issue a device session token bound to this desktop device
        sessionToken = jwt.sign(
          {
            sub: data.user_id,
            device_id: data.desktop_device_id,
            type: 'device_session',
          },
          SUPABASE_JWT_SECRET,
          { expiresIn: '7d' }
        );
      }

      return res.json({
        status: 'claimed',
        claimedAt: data.used_at,
        sessionToken,
      });
    }

    if (now > expiresAt) {
      return res.json({ status: 'expired' });
    }

    return res.json({ status: 'pending' });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[pairing/status] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to count active device sessions
async function countActiveDeviceSessions(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('device_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) {
    throw new Error(`Failed to count device sessions: ${error.message}`);
  }

  return count ?? 0;
}

// 3) POST /pairing/claim
router.post(
  '/pairing/claim',
  rateLimitPairingClaim(10),
  requireUser,
  async (req: Request, res: Response) => {
    const { code, deviceId, platform } = req.body as { code?: string; deviceId?: string; platform?: Platform };

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required' });
    }
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    if (platform !== 'mobile') {
      return res.status(400).json({ error: 'platform must be "mobile"' });
    }

    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const nowIso = new Date().toISOString();

      // Fetch pairing code
      const { data: pairing, error } = await supabaseAdmin
        .from('pairing_codes')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: `Failed to fetch pairing code: ${error.message}` });
      }

      if (!pairing) {
        return res.status(400).json({ error: 'Invalid code' });
      }

      if (pairing.used_at) {
        return res.status(400).json({ error: 'Code already used' });
      }

      if (new Date(pairing.expires_at as string) < new Date()) {
        return res.status(400).json({ error: 'Code expired' });
      }

      // Entitlements
      const entitlements = await getEntitlements(userId);

      if (!entitlements.pro_max) {
        return res.status(403).json({ error: 'Pairing requires pro_max entitlement' });
      }

      const deviceLimit = getDeviceLimit(entitlements);

      // Enforce device limit for new desktop session
      const activeCount = await countActiveDeviceSessions(userId);
      if (activeCount >= deviceLimit) {
        return res.status(409).json({ error: 'Device limit exceeded' });
      }

      // Mark code as used and link to user
      const { error: updateError } = await supabaseAdmin
        .from('pairing_codes')
        .update({
          used_at: nowIso,
          user_id: userId,
        })
        .eq('code', code);

      if (updateError) {
        return res.status(500).json({ error: `Failed to update pairing code: ${updateError.message}` });
      }

      // Create desktop device session
      const { error: sessionError } = await supabaseAdmin.from('device_sessions').insert({
        user_id: userId,
        device_id: pairing.desktop_device_id,
        platform: 'desktop',
        created_at: nowIso,
        last_seen: nowIso,
        revoked_at: null,
      });

      if (sessionError) {
        return res.status(500).json({ error: `Failed to create device session: ${sessionError.message}` });
      }

      return res.json({ ok: true });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[pairing/claim] Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// 4) GET /devices
router.get('/devices', requireUser, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('device_sessions')
      .select('device_id, platform, created_at, last_seen, revoked_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: `Failed to fetch devices: ${error.message}` });
    }

    return res.json({
      devices: (data || []).map((row: any) => ({
        deviceId: row.device_id,
        platform: row.platform,
        createdAt: row.created_at,
        lastSeen: row.last_seen,
        revokedAt: row.revoked_at,
      })),
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[devices] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5) POST /devices/revoke
router.post('/devices/revoke', requireUser, async (req: Request, res: Response) => {
  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('device_sessions')
      .update({ revoked_at: nowIso })
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .is('revoked_at', null);

    if (error) {
      return res.status(500).json({ error: `Failed to revoke device: ${error.message}` });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[devices/revoke] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// OPTIONAL: Streaming session start with device limit enforcement
router.post('/stream/start', requireUser, async (req: Request, res: Response) => {
  const { deviceId, platform } = req.body as { deviceId?: string; platform?: Platform };

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'deviceId is required' });
  }
  if (platform !== 'desktop' && platform !== 'mobile') {
    return res.status(400).json({ error: 'platform must be "desktop" or "mobile"' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const entitlements = await getEntitlements(userId);
    const deviceLimit = getDeviceLimit(entitlements);

    if (deviceLimit <= 0) {
      return res.status(403).json({ error: 'No active subscription' });
    }

    // Check if there is already a non-revoked session for this device
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('device_sessions')
      .select('id, revoked_at')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('platform', platform)
      .maybeSingle();

    const nowIso = new Date().toISOString();

    if (!existing || existing.revoked_at) {
      // Need to create a new session; enforce global device limit
      const activeCount = await countActiveDeviceSessions(userId);
      if (activeCount >= deviceLimit) {
        return res.status(409).json({ error: 'Device limit exceeded' });
      }

      const { error: insertError } = await supabaseAdmin.from('device_sessions').insert({
        user_id: userId,
        device_id: deviceId,
        platform,
        created_at: nowIso,
        last_seen: nowIso,
        revoked_at: null,
      });

      if (insertError) {
        return res.status(500).json({ error: `Failed to create device session: ${insertError.message}` });
      }
    } else {
      // Update last_seen
      const { error: updateError } = await supabaseAdmin
        .from('device_sessions')
        .update({ last_seen: nowIso })
        .eq('id', existing.id);

      if (updateError) {
        return res.status(500).json({ error: `Failed to update device session: ${updateError.message}` });
      }
    }

    // Optionally record streaming session row
    try {
      await supabaseAdmin.from('streaming_sessions').insert({
        user_id: userId,
        device_id: deviceId,
        started_at: nowIso,
        ended_at: null,
      });
    } catch {
      // Best-effort; do not block streaming on logging errors
    }

    return res.json({ ok: true });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[stream/start] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

