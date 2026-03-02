import { supabaseAdmin } from './supabaseAdmin.js';

export type EntitlementName = 'pro' | 'pro_max';

export interface Entitlements {
  pro: boolean;
  pro_max: boolean;
}

const REVENUECAT_SECRET = process.env.REVENUECAT_SECRET;

async function fetchEntitlementsFromDb(userId: string): Promise<Entitlements | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_entitlements')
      .select('entitlements')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const raw = (data as any).entitlements || {};
    return {
      pro: !!raw.pro,
      pro_max: !!raw.pro_max,
    };
  } catch {
    return null;
  }
}

async function fetchEntitlementsFromRevenueCat(userId: string): Promise<Entitlements | null> {
  if (!REVENUECAT_SECRET) {
    return null;
  }

  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${REVENUECAT_SECRET}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json() as any;
    const entitlements = json.subscriber?.entitlements || {};

    const hasPro = !!entitlements.pro && entitlements.pro.expires_date === null;
    const hasProMax = !!entitlements.pro_max && entitlements.pro_max.expires_date === null;

    return {
      pro: hasPro,
      pro_max: hasProMax,
    };
  } catch {
    return null;
  }
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  // 1) Try cached entitlements in DB (preferred, updated by webhooks)
  const fromDb = await fetchEntitlementsFromDb(userId);
  if (fromDb) return fromDb;

  // 2) Fallback to RevenueCat REST API
  const fromRc = await fetchEntitlementsFromRevenueCat(userId);
  if (fromRc) return fromRc;

  // 3) Default: no entitlements
  return { pro: false, pro_max: false };
}

export function getDeviceLimit(entitlements: Entitlements): number {
  if (entitlements.pro_max) return 2;
  if (entitlements.pro) return 1;
  return 0;
}

