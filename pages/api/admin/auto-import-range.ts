import type { NextApiRequest, NextApiResponse } from 'next';
import { autoImportEpisodes } from '@/server/ingest/autoImport';

function isAdmin(req: NextApiRequest) {
  const headerToken = req.headers['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN;
  return expected && headerToken === expected;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { animeId, seasonNumber, startEpisode, endEpisode, urlTemplate } = req.body as {
      animeId?: string;
      seasonNumber?: number;
      startEpisode?: number;
      endEpisode?: number;
      urlTemplate?: string;
    };

    if (!animeId || !seasonNumber || !startEpisode || !endEpisode || !urlTemplate) {
      return res.status(400).json({ error: 'animeId, seasonNumber, startEpisode, endEpisode, urlTemplate required' });
    }

    const start = Number(startEpisode);
    const end = Number(endEpisode);
    if (end < start) return res.status(400).json({ error: 'endEpisode must be >= startEpisode' });

    const episodes = [];
    for (let ep = start; ep <= end; ep++) {
      const url = urlTemplate.replace('{ep}', String(ep));
      episodes.push({ episodeNumber: ep, pageUrl: url });
    }

    const result = await autoImportEpisodes({
      animeId,
      seasonNumber: Number(seasonNumber),
      episodes,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('auto-import-range failed', err);
    return res.status(500).json({ error: err?.message || 'Auto import range failed' });
  }
}
