import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Supabase config missing' });

  const { animeId } = req.body as { animeId?: string };
  if (!animeId) return res.status(400).json({ error: 'animeId is required' });

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase.rpc('patch_episode_videos', { p_anime_id: animeId });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const updated = typeof data === 'number' ? data : 0;
  return res.status(200).json({ updated });
}
