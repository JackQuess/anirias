import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { normalizeOrigin } from '../../utils/cors.js';
import { getAniListMedia, deriveAdultRatingFromAniListMedia } from '../../services/anilist.js';
import { updateAnimeAdultMetadata } from '../../utils/animeAdultDb.js';

const router = Router();

router.use((req, res, next) => {
  const origin = normalizeOrigin(process.env.CORS_ORIGIN) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

type AnimeRowPatch = {
  id: string;
  anilist_id?: number | null;
  is_adult?: boolean | null;
  rating?: string | null;
  anilist_content_rating?: string | null;
};

async function applyAniListAdultForAnime(
  row: AnimeRowPatch,
  anilistMediaId: number,
  options: { backfillAnimeAnilistId?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const aid = Number(anilistMediaId);
  if (!Number.isFinite(aid) || aid <= 0) {
    return { ok: false, message: 'invalid anilist id' };
  }

  const media = await getAniListMedia(aid);
  if (!media) {
    return { ok: false, message: `medya yok (anilist ${aid})` };
  }

  const derived = deriveAdultRatingFromAniListMedia(media);
  const prevAdult = Boolean(row.is_adult);
  const is_adult = prevAdult || derived.is_adult;
  const prevLabel = row.anilist_content_rating ?? row.rating ?? null;
  const contentLabel = derived.is_adult ? derived.rating ?? prevLabel : null;

  return updateAnimeAdultMetadata(supabaseAdmin, row.id, {
    is_adult,
    contentLabel: contentLabel ?? undefined,
    anilistIdBackfill: options.backfillAnimeAnilistId ? aid : undefined,
  });
}

async function fetchAnimeRowForPatch(animeId: string): Promise<{ data: AnimeRowPatch | null; error: string | null }> {
  const q1 = await supabaseAdmin
    .from('animes')
    .select('id, anilist_id, is_adult, rating, anilist_content_rating')
    .eq('id', animeId)
    .maybeSingle();
  if (!q1.error) return { data: (q1.data as AnimeRowPatch) ?? null, error: null };
  let lastErr = q1.error.message;
  if (!/column|42703|does not exist/i.test(lastErr || '')) return { data: null, error: lastErr };

  const q2 = await supabaseAdmin.from('animes').select('id, anilist_id, is_adult').eq('id', animeId).maybeSingle();
  if (!q2.error) return { data: (q2.data as AnimeRowPatch) ?? null, error: null };
  lastErr = q2.error.message;
  if (!/column|42703|does not exist/i.test(lastErr || '')) return { data: null, error: lastErr };

  const q3 = await supabaseAdmin.from('animes').select('id, anilist_id').eq('id', animeId).maybeSingle();
  if (!q3.error) return { data: (q3.data as AnimeRowPatch) ?? null, error: null };
  return { data: null, error: q3.error.message };
}

/**
 * Anime satırında anilist_id yok; sezonlardan en küçük season_number ile bağlı AniList ID.
 */
async function buildSeasonFallbackCandidates(): Promise<{ anime_id: string; anilist_id: number }[]> {
  const best = new Map<string, { aid: number; sn: number }>();
  let from = 0;
  const PAGE = 1000;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('seasons')
      .select('anime_id, season_number, anilist_id')
      .not('anilist_id', 'is', null)
      .range(from, from + PAGE - 1);

    if (error) {
      throw new Error(`seasons scan: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      const aid = Number((row as any).anilist_id);
      if (!Number.isFinite(aid) || aid <= 0) continue;
      const animeId = String((row as any).anime_id);
      const sn = Number((row as any).season_number);
      const seasonNum = Number.isFinite(sn) ? sn : 999;
      const prev = best.get(animeId);
      if (!prev || seasonNum < prev.sn) {
        best.set(animeId, { aid, sn: seasonNum });
      }
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  const animeIds = Array.from(best.keys());
  const nullIds = new Set<string>();
  const ID_CHUNK = 200;
  for (let i = 0; i < animeIds.length; i += ID_CHUNK) {
    const slice = animeIds.slice(i, i + ID_CHUNK);
    const { data: chunkRows, error: e2 } = await supabaseAdmin
      .from('animes')
      .select('id')
      .in('id', slice)
      .is('anilist_id', null);
    if (e2) {
      throw new Error(`animes null anilist scan: ${e2.message}`);
    }
    for (const r of chunkRows || []) {
      nullIds.add(String((r as any).id));
    }
  }

  const out: { anime_id: string; anilist_id: number }[] = [];
  for (const [anime_id, v] of best) {
    if (nullIds.has(anime_id)) {
      out.push({ anime_id, anilist_id: v.aid });
    }
  }
  out.sort((a, b) => a.anime_id.localeCompare(b.anime_id));
  return out;
}

async function selectAnimesWithAnilistPage(offset: number, limit: number) {
  const full = await supabaseAdmin
    .from('animes')
    .select('id, anilist_id, is_adult, rating, anilist_content_rating', { count: 'exact' })
    .not('anilist_id', 'is', null)
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (!full.error) return full;
  if (/column|42703|does not exist/i.test(full.error.message || '')) {
    return supabaseAdmin
      .from('animes')
      .select('id, anilist_id', { count: 'exact' })
      .not('anilist_id', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);
  }
  return full;
}

/**
 * POST /api/admin/sync-anilist-adult-flags
 */
router.post('/sync-anilist-adult-flags', async (req: Request, res: Response) => {
  const adminToken = req.header('x-admin-token');
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const rawLimit = Number((req.body as any)?.limit);
  const rawOffset = Number((req.body as any)?.offset);
  const limit = Math.min(40, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20));
  const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);
  const source = (req.body as any)?.source === 'seasons' ? 'seasons' : 'anime';

  try {
    if (source === 'seasons') {
      const candidates = await buildSeasonFallbackCandidates();
      const totalMatching = candidates.length;
      const batchPairs = candidates.slice(offset, offset + limit);

      let batchUpdated = 0;
      let batchErrors = 0;
      const errorSamples: string[] = [];

      for (const { anime_id, anilist_id } of batchPairs) {
        try {
          const { data: row, error: fetchErr } = await fetchAnimeRowForPatch(anime_id);

          if (fetchErr || !row) {
            batchErrors++;
            if (errorSamples.length < 5) errorSamples.push(`${anime_id}: anime okunamadı`);
            continue;
          }

          if (row.anilist_id != null && row.anilist_id !== undefined) {
            continue;
          }

          const result = await applyAniListAdultForAnime(row, anilist_id, {
            backfillAnimeAnilistId: true,
          });

          if (!result.ok) {
            batchErrors++;
            if (errorSamples.length < 5) errorSamples.push(`${anime_id}: ${result.message}`);
            continue;
          }
          batchUpdated++;
        } catch (e: any) {
          batchErrors++;
          if (errorSamples.length < 5) errorSamples.push(`${anime_id}: ${e?.message || e}`);
        }
      }

      const nextOffset = offset + batchPairs.length;
      const done = nextOffset >= totalMatching || batchPairs.length === 0;

      return res.json({
        success: true,
        source: 'seasons',
        offset,
        limit,
        batchScanned: batchPairs.length,
        batchUpdated,
        batchErrors,
        nextOffset: done ? null : nextOffset,
        done,
        totalWithAnilistId: totalMatching,
        errorSamples,
      });
    }

    const { data: rows, error, count } = await selectAnimesWithAnilistPage(offset, limit);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Supabase query failed',
        details: error.message,
        hint: 'Supabase SQL: supabase/sql/ensure_animes_is_adult.sql dosyasını çalıştırın.',
      });
    }

    const batch = rows || [];
    const totalMatching = typeof count === 'number' ? count : batch.length;

    let batchUpdated = 0;
    let batchErrors = 0;
    const errorSamples: string[] = [];

    for (const row of batch) {
      const aid = Number((row as any).anilist_id);
      if (!Number.isFinite(aid) || aid <= 0) {
        batchErrors++;
        continue;
      }

      try {
        const result = await applyAniListAdultForAnime(row as AnimeRowPatch, aid, {
          backfillAnimeAnilistId: false,
        });
        if (!result.ok) {
          batchErrors++;
          if (errorSamples.length < 5) {
            errorSamples.push(`id=${(row as any).id}: ${result.message}`);
          }
          continue;
        }
        batchUpdated++;
      } catch (e: any) {
        batchErrors++;
        if (errorSamples.length < 5) errorSamples.push(`id=${(row as any).id}: ${e?.message || e}`);
      }
    }

    const nextOffset = offset + batch.length;
    const done = nextOffset >= totalMatching || batch.length === 0;

    return res.json({
      success: true,
      source: 'anime',
      offset,
      limit,
      batchScanned: batch.length,
      batchUpdated,
      batchErrors,
      nextOffset: done ? null : nextOffset,
      done,
      totalWithAnilistId: totalMatching,
      errorSamples,
    });
  } catch (err: any) {
    console.error('[sync-anilist-adult-flags]', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Sync failed',
      hint: 'Logları kontrol edin; eksik sütun için supabase/sql/ensure_animes_is_adult.sql çalıştırın.',
    });
  }
});

export default router;
