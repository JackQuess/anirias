import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../../services/supabaseAdmin.js';
import { runVideoBasePatch } from '../../services/videoBasePatch.js';

const router = Router();

// CORS middleware - normalize origin to remove trailing slash
router.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  const normalizedOrigin = origin.replace(/\/$/, '');
  res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

async function checkCdnFileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

router.post('/bunny-patch', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId, seasonNumber, overwrite, checkCdn } = req.body || {};
    if (!animeId || !seasonNumber) {
      return res.status(400).json({ success: false, error: 'animeId and seasonNumber required' });
    }

    // Get anime slug first
    const { data: animeData } = await supabaseAdmin
      .from('animes')
      .select('slug')
      .eq('id', animeId)
      .single();
    
    if (!animeData?.slug) {
      return res.status(400).json({ success: false, error: 'Anime slug not found' });
    }

    // Get existing episodes for this season
    const { data: seasonData } = await supabaseAdmin
      .from('seasons')
      .select('id')
      .eq('anime_id', animeId)
      .eq('season_number', Number(seasonNumber))
      .single();

    if (!seasonData) {
      return res.status(400).json({ success: false, error: 'Season not found' });
    }

    const { data: episodes } = await supabaseAdmin
      .from('episodes')
      .select('id, episode_number, video_url')
      .eq('anime_id', animeId)
      .eq('season_id', seasonData.id)
      .order('episode_number', { ascending: true });

    if (!episodes || episodes.length === 0) {
      return res.json({ success: true, patched: 0, errors: [] });
    }

    let patched = 0;
    const errors: Array<{ episode_number: number; error: string }> = [];

    // If checkCdn is true, verify each file exists before patching
    if (checkCdn) {
      for (const ep of episodes) {
        const padded = String(ep.episode_number).padStart(2, '0');
        const expectedUrl = `https://anirias-videos.b-cdn.net/${animeData.slug}/season-${seasonNumber}/episode-${padded}.mp4`;
        
        const exists = await checkCdnFileExists(expectedUrl);
        if (exists) {
          const { error: updateError } = await supabaseAdmin
            .from('episodes')
            .update({
              video_url: expectedUrl,
              status: 'ready',
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', ep.id);
          
          if (!updateError) {
            patched++;
          }
        } else {
          // CDN 404 - mark as pending_download instead of error
          const { error: updateError } = await supabaseAdmin
            .from('episodes')
            .update({
              status: 'pending_download',
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', ep.id);
          
          if (!updateError) {
            // Episode queued for download
          }
          errors.push({
            episode_number: ep.episode_number,
            error: `CDN 404: ${expectedUrl}`
          });
        }
      }
    } else {
      // Original behavior: patch without checking
      const { data, error } = await supabaseAdmin.rpc('bunny_patch_season', {
        p_anime_id: animeId,
        p_season_number: Number(seasonNumber),
        p_overwrite: !!overwrite
      });
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      patched = data ?? 0;
    }

    return res.json({ success: true, patched, errors });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Patch failed' });
  }
});

router.post('/video-base-patch', async (req: Request, res: Response) => {
  try {
    const adminToken = req.header('x-admin-token');
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { animeId, seasonId, dryRun } = req.body || {};
    if (!animeId || typeof animeId !== 'string') {
      return res.status(400).json({ success: false, error: 'animeId required' });
    }

    const result = await runVideoBasePatch({
      animeId,
      seasonId: seasonId || null,
      dryRun: Boolean(dryRun),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Video base patch failed' });
  }
});

export default router;
