import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { normalizeOrigin } from '../../utils/cors.js';
import {
  buildEpisodeDurationSeconds,
  buildEpisodeThumbnailMap,
  buildTranslatedEpisodeSynopsisMap,
} from '../../services/episodeSynopsisMap.js';

const router = Router();

router.use((req, res, next) => {
  const origin = normalizeOrigin(process.env.CORS_ORIGIN) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

type BackfillEpisodeDescriptionsBody = {
  animeId?: string;
  anilistId?: number;
  dryRun?: boolean;
};

router.post('/backfill-episode-descriptions', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = (req.body || {}) as BackfillEpisodeDescriptionsBody;
    let animeId = typeof body.animeId === 'string' ? body.animeId.trim() : '';
    let anilistId = Number(body.anilistId);
    const dryRun = body.dryRun === true;

    if (!Number.isFinite(anilistId) || anilistId <= 0) {
      if (!animeId) {
        return res.status(400).json({ success: false, error: 'animeId or anilistId is required' });
      }

      const { data: anime, error: animeError } = await supabaseAdmin
        .from('animes')
        .select('anilist_id')
        .eq('id', animeId)
        .maybeSingle();

      if (animeError) {
        return res.status(500).json({ success: false, error: 'Anime fetch failed', details: animeError.message });
      }
      anilistId = Number((anime as any)?.anilist_id);
    }

    if (!Number.isFinite(anilistId) || anilistId <= 0) {
      return res.status(400).json({ success: false, error: 'Valid AniList ID is required' });
    }

    if (!animeId) {
      const { data: animeByAniList, error: lookupError } = await supabaseAdmin
        .from('animes')
        .select('id')
        .eq('anilist_id', anilistId)
        .maybeSingle();

      if (lookupError) {
        return res.status(500).json({ success: false, error: 'Anime lookup failed', details: lookupError.message });
      }
      animeId = String((animeByAniList as any)?.id || '');
      if (!animeId) {
        return res.status(404).json({ success: false, error: 'Anime not found for AniList ID' });
      }
    }

    const [descriptions, thumbnails, durationSeconds] = await Promise.all([
      buildTranslatedEpisodeSynopsisMap(anilistId),
      buildEpisodeThumbnailMap(anilistId),
      buildEpisodeDurationSeconds(anilistId),
    ]);

    let episodeQuery = supabaseAdmin
      .from('episodes')
      .select('id, episode_number, description, description_tr, thumbnail_url, duration_seconds')
      .order('episode_number', { ascending: true });

    episodeQuery = episodeQuery.eq('anime_id', animeId);

    const { data: episodes, error: episodesError } = await episodeQuery;
    if (episodesError) {
      return res.status(500).json({ success: false, error: 'Episode fetch failed', details: episodesError.message });
    }

    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const details: Array<{ id: string; episode_number: number; status: 'updated' | 'skipped' | 'failed'; reason?: string }> = [];

    for (const episode of episodes || []) {
      scanned += 1;
      const episodeNumber = Number((episode as any).episode_number);
      const next = descriptions[episodeNumber];
      const thumbnailUrl = thumbnails[episodeNumber];
      const shouldPatchDuration =
        durationSeconds != null &&
        durationSeconds > 0 &&
        (!(episode as any).duration_seconds || (episode as any).duration_seconds === 1440);
      if (!next && !thumbnailUrl && !shouldPatchDuration) {
        skipped += 1;
        details.push({ id: (episode as any).id, episode_number: episodeNumber, status: 'skipped', reason: 'No API metadata' });
        continue;
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (next && !(episode as any).description) patch.description = next.description;
      if (next && !(episode as any).description_tr) patch.description_tr = next.description_tr;
      if (thumbnailUrl && !(episode as any).thumbnail_url) patch.thumbnail_url = thumbnailUrl;
      if (shouldPatchDuration) patch.duration_seconds = durationSeconds;

      if (Object.keys(patch).length === 1) {
        skipped += 1;
        details.push({ id: (episode as any).id, episode_number: episodeNumber, status: 'skipped', reason: 'Already filled' });
        continue;
      }

      if (dryRun) {
        updated += 1;
        details.push({ id: (episode as any).id, episode_number: episodeNumber, status: 'updated' });
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from('episodes')
        .update(patch)
        .eq('id', (episode as any).id);

      if (updateError) {
        failed += 1;
        details.push({ id: (episode as any).id, episode_number: episodeNumber, status: 'failed', reason: updateError.message });
        continue;
      }

      updated += 1;
      details.push({ id: (episode as any).id, episode_number: episodeNumber, status: 'updated' });
    }

    return res.json({ success: true, dryRun, anilistId, scanned, updated, skipped, failed, details });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Episode description backfill failed' });
  }
});

export default router;
