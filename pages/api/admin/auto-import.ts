import type { NextApiRequest, NextApiResponse } from 'next';
import { autoImportEpisodes, autoImportAllEpisodes } from '@/server/ingest/autoImport';

function isAdmin(req: NextApiRequest) {
  const headerToken = req.headers['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN;
  return expected && headerToken === expected;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { animeId, seasonNumber, episodes } = req.body as {
      animeId?: string;
      seasonNumber?: number;
      episodes?: Array<{ episodeNumber: number; pageUrl: string }>;
    };

    // Backward compatibility: if episodes provided, use manual import; otherwise require urlTemplate for full auto
    if (episodes && Array.isArray(episodes) && episodes.length > 0) {
      if (!animeId || !seasonNumber) {
        return res.status(400).json({ error: 'animeId and seasonNumber required' });
      }
      const cleanedEpisodes = episodes.map((ep) => ({
        episodeNumber: Number(ep.episodeNumber),
        pageUrl: ep.pageUrl?.trim(),
      })).filter((ep) => ep.episodeNumber > 0 && !!ep.pageUrl);

      if (cleanedEpisodes.length === 0) {
        return res.status(400).json({ error: 'No valid episodes provided' });
      }

      const result = await autoImportEpisodes({
        animeId,
        seasonNumber: Number(seasonNumber),
        episodes: cleanedEpisodes,
      });

      return res.status(200).json(result);
    }

    const { urlTemplate } = req.body as { urlTemplate?: string };
    if (!animeId || !seasonNumber) {
      return res.status(400).json({ error: 'animeId and seasonNumber are required for auto mode' });
    }

    const result = await autoImportAllEpisodes(animeId, Number(seasonNumber), urlTemplate);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('auto-import failed', err);
    return res.status(500).json({ error: err?.message || 'Auto import failed' });
  }
}
