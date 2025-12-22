import type { NextApiRequest, NextApiResponse } from 'next';
import { autoImportAllEpisodes } from '@/server/ingest/autoImport';

function isAdmin(req: NextApiRequest) {
  const headerToken = req.headers['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN;
  return expected && headerToken === expected;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { animeId, urlTemplate, seasonNumber } = req.body as { animeId?: string; urlTemplate?: string; seasonNumber?: number };
    if (!animeId || !seasonNumber) {
      return res.status(400).json({ error: 'animeId and seasonNumber are required' });
    }

    const result = await autoImportAllEpisodes(animeId, Number(seasonNumber), urlTemplate);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('auto-import-all failed', err);
    return res.status(500).json({ error: err?.message || 'Auto import failed' });
  }
}
