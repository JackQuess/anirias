import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin.js';
import { isEntitlementActive } from '../services/entitlements.js';

const router = Router();

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;
const REVENUECAT_SECRET = process.env.REVENUECAT_SECRET;

// Event types where the subscriber gained or kept entitlements
const POSITIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'PRODUCT_CHANGE',
]);

// Event types where the subscriber may have lost entitlements
const NEGATIVE_EVENT_TYPES = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'SUBSCRIPTION_PAUSED',
]);

/**
 * Fetch the subscriber's current entitlements directly from RevenueCat REST API.
 * Used as fallback when the webhook event payload doesn't carry entitlement data.
 */
async function fetchCurrentEntitlementsFromRc(
  userId: string
): Promise<{ pro: boolean; pro_max: boolean } | null> {
  if (!REVENUECAT_SECRET) return null;

  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${REVENUECAT_SECRET}` } }
    );

    if (!res.ok) {
      console.error(`[revenuecat/webhook] RC API returned ${res.status} for user ${userId}`);
      return null;
    }

    const json = (await res.json()) as any;
    const entitlements = json.subscriber?.entitlements ?? {};

    return {
      pro: isEntitlementActive(entitlements.pro),
      pro_max: isEntitlementActive(entitlements.pro_max),
    };
  } catch (err: any) {
    console.error('[revenuecat/webhook] RC API fetch error:', err?.message);
    return null;
  }
}

/**
 * POST /api/revenuecat/webhook
 *
 * RevenueCat sends events here. We upsert current entitlement state into
 * public.user_entitlements so the app can check entitlements without calling RC.
 *
 * Security: verified via "Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>"
 *
 * RevenueCat Dashboard → Integrations → Webhooks → set Authorization header to:
 *   Bearer <REVENUECAT_WEBHOOK_SECRET>
 */
router.post('/webhook', async (req: Request, res: Response) => {
  // ── 1. Authenticate webhook ─────────────────────────────────────────────────
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.error('[revenuecat/webhook] REVENUECAT_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const authHeader = req.headers.authorization ?? '';
  if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── 2. Parse event ───────────────────────────────────────────────────────────
  const event = req.body?.event as Record<string, any> | undefined;
  if (!event) {
    return res.status(400).json({ error: 'Missing event payload' });
  }

  const userId = event.app_user_id as string | undefined;
  if (!userId) {
    return res.status(400).json({ error: 'Missing app_user_id in event' });
  }

  const eventType = (event.type as string | undefined) ?? '';
  console.log(`[revenuecat/webhook] event=${eventType} user=${userId}`);

  try {
    // ── 3. Determine entitlements ──────────────────────────────────────────────
    let entitlements = { pro: false, pro_max: false };

    // entitlement_ids is the array of currently-active entitlement identifiers
    // included in V2 webhook payloads for positive events
    const entitlementIds: string[] = Array.isArray(event.entitlement_ids)
      ? (event.entitlement_ids as string[])
      : [];

    if (POSITIVE_EVENT_TYPES.has(eventType) && entitlementIds.length > 0) {
      // Derive directly from the event payload – fastest path
      entitlements = {
        pro: entitlementIds.includes('pro') || entitlementIds.includes('pro_max'),
        pro_max: entitlementIds.includes('pro_max'),
      };
    } else {
      // For negative events OR events without entitlement_ids:
      // Query RC REST API to get ground-truth current state
      const fromRc = await fetchCurrentEntitlementsFromRc(userId);
      entitlements = fromRc ?? { pro: false, pro_max: false };
    }

    // ── 4. Upsert into DB ──────────────────────────────────────────────────────
    const { error: upsertError } = await supabaseAdmin
      .from('user_entitlements')
      .upsert(
        {
          user_id: userId,
          entitlements,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('[revenuecat/webhook] DB upsert failed:', upsertError.message);
      return res.status(500).json({ error: 'Failed to update entitlements' });
    }

    console.log(`[revenuecat/webhook] Upserted entitlements for ${userId}:`, entitlements);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[revenuecat/webhook] Unexpected error:', err?.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
