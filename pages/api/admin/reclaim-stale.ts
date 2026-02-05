import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

function isAuthorized(req: NextApiRequest): boolean {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.AUTOMATION_ADMIN_SECRET;
  if (expected && secret === expected) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

/**
 * Reclaim stale locks: unlock jobs that have been locked too long.
 * Requires Supabase RPC or direct update. If no RPC exists, returns 501.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Supabase config missing' });
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: updated, error } = await supabase
      .from('jobs')
      .update({ status: 'retry', locked_by: null, locked_at: null })
      .eq('status', 'running')
      .lt('locked_at', staleThreshold)
      .select('id');
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    const count = Array.isArray(updated) ? updated.length : 0;
    return res.status(200).json({ ok: true, reclaimed: count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return res.status(500).json({ error: msg });
  }
}
