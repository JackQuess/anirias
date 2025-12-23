import { Router, type Request, type Response } from 'express';
import {
  ensureAnimeSlug,
  expectedCdn,
  getEpisodesBySeason,
  getSeasonByNumber,
  getSeasonsForAnime,
  getEpisodeByKey,
  upsertEpisodeByKey
} from '../../services/supabaseAdmin.js';

const router = Router();
const directProgress: Record<string, any> = {};

router.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

router.post('/auto-import-all', async (req: Request, res: Response) => {
  return handleAutoImport(req, res);
});

router.post('/auto-import', async (req: Request, res: Response) => {
  return handleAutoImport(req, res);
});

router.get('/auto-import-progress/:jobId', async (req: Request, res: Response) => {
  const state = directProgress[req.params.jobId];
  if (!state) return res.status(404).json({ error: 'Job not found' });
  return res.json(state);
});

router.get('/auto-import/:jobId/progress', async (req: Request, res: Response) => {
  const state = directProgress[req.params.jobId];
  if (!state) return res.status(404).json({ error: 'Job not found' });
  return res.json(state);
});

router.get('/bunny/check-file', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const url = req.query.url as string | undefined;
    if (!url) return res.status(400).json({ success: false, error: 'url required' });
    const head = await fetch(url, { method: 'HEAD' });
    return res.json({ exists: head.ok, status: head.status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Check failed' });
  }
});

export default router;

async function handleAutoImport(req: Request, res: Response) {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId, seasonNumber, mode } = req.body || {};
    if (!animeId) return res.status(400).json({ success: false, error: 'animeId required' });

    const jobId = `direct-${Date.now()}`;
    directProgress[jobId] = {
      state: 'active',
      progress: {
        mode: 'direct',
        totalEpisodes: 0,
        completedEpisodes: 0,
        currentEpisode: null,
        status: 'preparing',
        percent: 0,
        message: 'Hazırlanıyor...',
        lastUpdateAt: Date.now(),
        error: null
      },
      finishedOn: null,
      failedReason: null
    };

    const slug = await ensureAnimeSlug(animeId);
    const seasons = mode === 'all' || seasonNumber == null
      ? await getSeasonsForAnime(animeId)
      : (() => {
          if (seasonNumber == null) return [];
          return getSeasonByNumber(animeId, Number(seasonNumber)).then((s) => (s ? [s] : []));
        })();
    const seasonList = await seasons;
    const episodeQueue: Array<{ seasonNumber: number; episodeNumber: number; seasonId: string }> = [];

    for (const season of seasonList) {
      const episodes = await getEpisodesBySeason(season.id);
      const seen = new Set<number>();
      episodes.forEach((ep) => {
        if (seen.has(ep.episode_number)) return;
        seen.add(ep.episode_number);
        episodeQueue.push({ seasonNumber: season.season_number, episodeNumber: ep.episode_number, seasonId: season.id });
      });
    }

    const totalEpisodes = episodeQueue.length;
    let completedEpisodes = 0;
    let updated = 0;
    let skipped = 0;
    let missing = 0;

    directProgress[jobId].progress.totalEpisodes = totalEpisodes;

    for (const item of episodeQueue) {
      const { seasonNumber: sNo, episodeNumber: eNo, seasonId } = item;
      const percent = totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
      directProgress[jobId].progress = {
        ...directProgress[jobId].progress,
        currentEpisode: eNo,
        status: 'checking',
        percent,
        message: `Bölüm ${eNo} kontrol ediliyor`,
        lastUpdateAt: Date.now(),
        error: null
      };

      const cdnUrl = expectedCdn(slug, sNo, eNo);
      const head = await fetch(cdnUrl, { method: 'HEAD' });
      if (!head.ok) {
        missing += 1;
        completedEpisodes += 1;
        directProgress[jobId].progress = {
          ...directProgress[jobId].progress,
          completedEpisodes,
          status: 'error',
          percent: totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0,
          message: `Bölüm ${eNo} CDN bulunamadı`,
          lastUpdateAt: Date.now(),
          error: `HTTP ${head.status}`
        };
        continue;
      }

      const existing = await getEpisodeByKey(animeId, seasonId, eNo);
      if (existing?.video_path === cdnUrl && existing?.stream_url === cdnUrl) {
        skipped += 1;
        completedEpisodes += 1;
        directProgress[jobId].progress = {
          ...directProgress[jobId].progress,
          completedEpisodes,
          status: 'done',
          percent: totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0,
          message: `Bölüm ${eNo} zaten güncel`,
          lastUpdateAt: Date.now(),
          error: null
        };
        continue;
      }

      await upsertEpisodeByKey({
        animeId,
        seasonId,
        episodeNumber: eNo,
        cdnUrl,
        hlsUrl: existing?.hls_url ?? null,
        durationSeconds: existing?.duration_seconds ?? 0,
        title: existing?.title || `Bölüm ${eNo}`
      });

      updated += 1;
      completedEpisodes += 1;
      directProgress[jobId].progress = {
        ...directProgress[jobId].progress,
        completedEpisodes,
        status: 'done',
        percent: totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0,
        message: `Bölüm ${eNo} güncellendi`,
        lastUpdateAt: Date.now(),
        error: null
      };
    }

    directProgress[jobId].state = 'completed';
    directProgress[jobId].finishedOn = Date.now();
    directProgress[jobId].progress = {
      ...directProgress[jobId].progress,
      currentEpisode: null,
      status: 'done',
      percent: 100,
      message: 'İş tamamlandı',
      lastUpdateAt: Date.now()
    };

    return res.json({
      success: true,
      jobId,
      status: 'completed',
      mode: 'direct',
      total: totalEpisodes,
      updated,
      skipped,
      missing
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Auto import failed' });
  }
}
