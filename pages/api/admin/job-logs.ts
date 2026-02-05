import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 300;

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const jobId = typeof req.query.job_id === 'string' ? req.query.job_id.trim() : '';
  if (!jobId) {
    return res.status(400).json({ error: 'job_id is required' });
  }

  const limitRaw = req.query.limit;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : DEFAULT_LIMIT) || DEFAULT_LIMIT
  );

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('job_logs')
      .select('id, job_id, level, message, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return res.status(500).json({ error: msg });
  }
}
