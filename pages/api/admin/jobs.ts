import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VALID_STATUSES = ['queued', 'running', 'done', 'error', 'retry'];

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

  const limitRaw = req.query.limit;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : DEFAULT_LIMIT) || DEFAULT_LIMIT
  );
  const status = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : null;
  const type = typeof req.query.type === 'string' ? req.query.type.trim() || null : null;
  const createdAfter = typeof req.query.created_after === 'string' ? req.query.created_after.trim() || null : null;
  const jobKeyPrefix = typeof req.query.job_key_prefix === 'string' ? req.query.job_key_prefix.trim() || null : null;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const supabase = getSupabase();
    const selectCols = 'id, type, status, created_at, started_at, finished_at, locked_by, locked_at, last_error, job_key';
    let q = supabase
      .from('jobs')
      .select(selectCols)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (status) q = q.eq('status', status);
    if (type) q = q.eq('type', type);
    if (createdAfter) q = q.gte('created_at', createdAfter);
    if (jobKeyPrefix) q = q.ilike('job_key', `${jobKeyPrefix}%`);
    const { data, error } = await q;
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return res.status(500).json({ error: msg });
  }
}
