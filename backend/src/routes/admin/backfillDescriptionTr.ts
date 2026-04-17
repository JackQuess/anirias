import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { normalizeOrigin } from '../../utils/cors.js';
import { translateToTurkish } from '../../services/translator.js';

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

type BackfillBody = {
  limit?: number;
  dryRun?: boolean;
};

router.post('/backfill-description-tr', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = (req.body || {}) as BackfillBody;
    const limitRaw = Number(body.limit ?? 25);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 25;
    const dryRun = body.dryRun === true;

    const { data: rows, error } = await supabaseAdmin
      .from('animes')
      .select('id, title, description, description_tr')
      .or('description_tr.is.null,description_tr.eq.')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Anime list fetch failed',
        details: error.message,
      });
    }

    const list = Array.isArray(rows) ? rows : [];
    let scanned = 0;
    let translated = 0;
    let skipped = 0;
    let failed = 0;
    const details: Array<{ id: string; title: string; status: 'translated' | 'skipped' | 'failed'; reason?: string }> = [];

    for (const row of list) {
      scanned += 1;
      const titleValue = row?.title as { romaji?: string; english?: string } | null;
      const title = String(titleValue?.romaji || titleValue?.english || row.id || '').trim();
      const description = String(row?.description || '').trim();

      if (!description) {
        skipped += 1;
        details.push({ id: row.id, title, status: 'skipped', reason: 'Empty description' });
        continue;
      }

      const tr = await translateToTurkish(description);
      if (!tr) {
        failed += 1;
        details.push({ id: row.id, title, status: 'failed', reason: 'Translation unavailable' });
        continue;
      }

      if (dryRun) {
        translated += 1;
        details.push({ id: row.id, title, status: 'translated' });
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from('animes')
        .update({
          description_tr: tr,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updateError) {
        failed += 1;
        details.push({ id: row.id, title, status: 'failed', reason: updateError.message });
        continue;
      }

      translated += 1;
      details.push({ id: row.id, title, status: 'translated' });
    }

    return res.json({
      success: true,
      dryRun,
      scanned,
      translated,
      skipped,
      failed,
      details,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Backfill failed',
    });
  }
});

export default router;
