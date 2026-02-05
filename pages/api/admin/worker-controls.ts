import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const WORKER_CONTROLS_ID = 1;
const MAX_CONCURRENCY_MIN = 1;
const MAX_CONCURRENCY_MAX = 10;
const MAX_PER_ANIME_MIN = 1;
const MAX_PER_ANIME_MAX = 10;

function isAuthorized(req: NextApiRequest): boolean {
  const secret = req.headers['x-admin-secret'];
  const expected = process.env.AUTOMATION_ADMIN_SECRET;
  if (expected && secret === expected) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase config missing');
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('worker_controls')
        .select('*')
        .eq('id', WORKER_CONTROLS_ID)
        .maybeSingle();
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      if (!data) {
        return res.status(404).json({ error: 'Worker controls not found' });
      }
      return res.status(200).json(data);
    }

    const body = req.body as { paused?: boolean; max_concurrency?: number; max_per_anime?: number };
    const updates: Record<string, unknown> = {};
    if (typeof body.paused === 'boolean') updates.paused = body.paused;
    if (typeof body.max_concurrency === 'number') {
      const v = Math.floor(body.max_concurrency);
      if (v < MAX_CONCURRENCY_MIN || v > MAX_CONCURRENCY_MAX) {
        return res.status(400).json({ error: `max_concurrency must be ${MAX_CONCURRENCY_MIN}-${MAX_CONCURRENCY_MAX}` });
      }
      updates.max_concurrency = v;
    }
    if (typeof body.max_per_anime === 'number') {
      const v = Math.floor(body.max_per_anime);
      if (v < MAX_PER_ANIME_MIN || v > MAX_PER_ANIME_MAX) {
        return res.status(400).json({ error: `max_per_anime must be ${MAX_PER_ANIME_MIN}-${MAX_PER_ANIME_MAX}` });
      }
      updates.max_per_anime = v;
    }
    if (Object.keys(updates).length === 0) {
      const { data } = await supabase.from('worker_controls').select('*').eq('id', WORKER_CONTROLS_ID).maybeSingle();
      return res.status(200).json(data ?? {});
    }

    const { data, error } = await supabase
      .from('worker_controls')
      .update(updates)
      .eq('id', WORKER_CONTROLS_ID)
      .select()
      .single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return res.status(500).json({ error: msg });
  }
}
