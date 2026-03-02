import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../services/supabaseAdmin.js';
import { requireUser, getUserIdFromRequest } from '../utils/auth.js';
import { getEntitlements, getDeviceLimit } from '../services/entitlements.js';
import { rateLimitPairingCreate, rateLimitPairingClaim } from '../middleware/rateLimit.js';

const router = Router();

type Platform = 'desktop' | 'mobile';

const DEVICE_SESSION_JWT_SECRET = process.env.DEVICE_SESSION_JWT_SECRET;

if (!DEVICE_SESSION_JWT_SECRET) {
  console.warn('[devices] DEVICE_SESSION_JWT_SECRET is not set. sessionToken will not be issued.');
}

function signDeviceSessionToken(userId: string, desktopDeviceId: string): string | null {
  if (!DEVICE_SESSION_JWT_SECRET) return null;
  return jwt.sign(
    { sub: userId, device_id: desktopDeviceId, type: 'device_session' },
    DEVICE_SESSION_JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function generateCode(): string {
  const num = crypto.randomInt(0, 1_000_000);
  return num.toString().padStart(6, '0');
}

async function createUniqueCode(): Promise<string> {
  for (let i = 0; i < 5; i += 1) {
    const code = generateCode();
    const { data, error } = await supabaseAdmin
      .from('pairing_codes')
      .select('code')
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return code;
  }
  return generateCode();
}

async function countActiveDeviceSessions(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('device_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) throw new Error(`Failed to count device sessions: ${error.message}`);
  return count ?? 0;
}

// ──────────────────────────────────────────────────────────────
// 1) POST /pairing/create
//    Auth: optional (desktop may be unauth)
// ──────────────────────────────────────────────────────────────
router.post('/pairing/create', rateLimitPairingCreate(5), async (req: Request, res: Response) => {
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
    const expires = new Date(now.getTime() + 30_000); // 30 s TTL

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
    console.error('[pairing/create] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// 2) GET /pairing/status?code=XXXXXX
//    Auth: none – desktop polls this to know when claimed
// ──────────────────────────────────────────────────────────────
router.get('/pairing/status', async (req: Request, res: Response) => {
  const { code } = req.query as { code?: string };
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('pairing_codes')
      .select('code, desktop_device_id, expires_at, used_at, user_id')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: `Failed to fetch pairing code: ${error.message}` });
    }

    if (!data) return res.json({ status: 'expired' });

    if (data.used_at) {
      // Issue device session JWT signed with our own secret (not Supabase JWT secret)
      const sessionToken = data.user_id
        ? signDeviceSessionToken(data.user_id as string, data.desktop_device_id as string)
        : null;

      return res.json({
        status: 'claimed',
        claimedAt: data.used_at,
        sessionToken,
      });
    }

    if (new Date() > new Date(data.expires_at as string)) {
      return res.json({ status: 'expired' });
    }

    return res.json({ status: 'pending' });
  } catch (err: any) {
    console.error('[pairing/status] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// 3) POST /pairing/claim
//    Auth: required (Supabase JWT)
//    Entitlement: pro_max required
//    Device limit enforced
// ──────────────────────────────────────────────────────────────
router.post('/pairing/claim', rateLimitPairingClaim(10), requireUser, async (req: Request, res: Response) => {
  const { code, deviceId, platform } = req.body as {
    code?: string;
    deviceId?: string;
    platform?: Platform;
  };

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
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const nowIso = new Date().toISOString();

    const { data: pairing, error } = await supabaseAdmin
      .from('pairing_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: `Failed to fetch pairing code: ${error.message}` });
    }
    if (!pairing) return res.status(400).json({ error: 'Invalid code' });
    if (pairing.used_at) return res.status(400).json({ error: 'Code already used' });
    if (new Date(pairing.expires_at as string) < new Date()) {
      return res.status(400).json({ error: 'Code expired' });
    }

    const entitlements = await getEntitlements(userId);
    if (!entitlements.pro_max) {
      return res.status(403).json({ error: 'Pairing requires pro_max entitlement' });
    }

    const deviceLimit = getDeviceLimit(entitlements);
    const activeCount = await countActiveDeviceSessions(userId);
    if (activeCount >= deviceLimit) {
      return res.status(409).json({ error: 'Device limit exceeded' });
    }

    // Mark code as used
    const { error: updateError } = await supabaseAdmin
      .from('pairing_codes')
      .update({ used_at: nowIso, user_id: userId })
      .eq('code', code);

    if (updateError) {
      return res.status(500).json({ error: `Failed to update pairing code: ${updateError.message}` });
    }

    // Create desktop device session
    const { error: sessionError } = await supabaseAdmin.from('device_sessions').upsert(
      {
        user_id: userId,
        device_id: pairing.desktop_device_id,
        platform: 'desktop',
        created_at: nowIso,
        last_seen: nowIso,
        revoked_at: null,
      },
      { onConflict: 'user_id,device_id,platform' }
    );

    if (sessionError) {
      return res.status(500).json({ error: `Failed to create device session: ${sessionError.message}` });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[pairing/claim] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// 4) GET /devices
//    Auth: required
// ──────────────────────────────────────────────────────────────
router.get('/devices', requireUser, async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
    console.error('[devices] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// 5) POST /devices/revoke
//    Auth: required
// ──────────────────────────────────────────────────────────────
router.post('/devices/revoke', requireUser, async (req: Request, res: Response) => {
  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { error } = await supabaseAdmin
      .from('device_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .is('revoked_at', null);

    if (error) {
      return res.status(500).json({ error: `Failed to revoke device: ${error.message}` });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[devices/revoke] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// 6) POST /stream/start
//    Auth: required
//    Device limit enforced
// ──────────────────────────────────────────────────────────────
router.post('/stream/start', requireUser, async (req: Request, res: Response) => {
  const { deviceId, platform } = req.body as { deviceId?: string; platform?: Platform };

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'deviceId is required' });
  }
  if (platform !== 'desktop' && platform !== 'mobile') {
    return res.status(400).json({ error: 'platform must be "desktop" or "mobile"' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const entitlements = await getEntitlements(userId);
    const deviceLimit = getDeviceLimit(entitlements);

    if (deviceLimit <= 0) {
      return res.status(403).json({ error: 'No active subscription' });
    }

    const nowIso = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from('device_sessions')
      .select('id, revoked_at')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('platform', platform)
      .maybeSingle();

    if (!existing || existing.revoked_at) {
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
      await supabaseAdmin
        .from('device_sessions')
        .update({ last_seen: nowIso })
        .eq('id', existing.id);
    }

    // Best-effort streaming session log
    try {
      await supabaseAdmin.from('streaming_sessions').insert({
        user_id: userId,
        device_id: deviceId,
        started_at: nowIso,
        ended_at: null,
      });
    } catch {
      /* non-blocking */
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[stream/start] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
