import { supabaseAdmin } from './supabaseAdmin.js';

const URL_COLUMNS_CANDIDATES = ['video_url', 'video_url_1080p', 'video_url_720p', 'source_url'] as const;

export interface VideoBasePatchParams {
  animeId: string;
  seasonId?: string | null;
  dryRun?: boolean;
}

export interface VideoBasePatchSample {
  episodeId: string;
  before: string;
  after: string;
}

export interface VideoBasePatchResult {
  scanned: number;
  willUpdate: number;
  updated: number;
  alreadyNew: number;
  skipped: number;
  sampleWillUpdate: VideoBasePatchSample[];
}

type EpisodeRow = {
  id: string;
  [key: string]: unknown;
};

function ensureBaseUrl(value: string | undefined, fallback: string) {
  const url = (value || fallback).trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Video base URL must start with http:// or https://');
  }
  return url;
}

async function getExistingUrlColumns(): Promise<string[]> {
  // PostgREST environments may not expose information_schema.
  // Probe each optional column directly against episodes and keep only valid ones.
  const existing: string[] = [];

  for (const col of URL_COLUMNS_CANDIDATES) {
    const { error } = await supabaseAdmin.from('episodes').select(`id,${col}`).limit(1);
    if (!error) {
      existing.push(col);
      continue;
    }

    const msg = String(error.message || '').toLowerCase();
    const isMissingColumn =
      msg.includes('column') && (msg.includes('does not exist') || msg.includes('not found'));
    if (!isMissingColumn) {
      throw new Error(`Failed to inspect episodes columns: ${error.message}`);
    }
  }

  return existing;
}

function rewriteUrl(value: unknown, oldBase: string, newBase: string): string | null {
  if (typeof value !== 'string' || !value) return null;
  if (!value.startsWith(oldBase)) return null;
  return `${newBase}${value.slice(oldBase.length)}`;
}

export async function runVideoBasePatch(params: VideoBasePatchParams): Promise<VideoBasePatchResult> {
  const oldBase = ensureBaseUrl(process.env.OLD_VIDEO_BASE_URL, 'https://anirias-videos.b-cdn.net');
  const newBase = ensureBaseUrl(
    process.env.NEW_VIDEO_BASE_URL,
    'https://anirias-media.nbg1.your-objectstorage.com'
  );

  const columns = await getExistingUrlColumns();
  if (columns.length === 0) {
    return { scanned: 0, willUpdate: 0, updated: 0, alreadyNew: 0, skipped: 0, sampleWillUpdate: [] };
  }

  const selectColumns = ['id', ...columns].join(',');
  let query = supabaseAdmin.from('episodes').select(selectColumns).eq('anime_id', params.animeId);
  if (params.seasonId) query = query.eq('season_id', params.seasonId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch episodes for patch: ${error.message}`);

  const episodes = ((data || []) as unknown) as EpisodeRow[];

  let willUpdate = 0;
  let alreadyNew = 0;
  let skipped = 0;
  const sampleWillUpdate: VideoBasePatchSample[] = [];

  const updatePayloads: Array<{ id: string; patch: Record<string, string> }> = [];

  for (const row of episodes) {
    const patch: Record<string, string> = {};
    let firstBefore = '';
    let firstAfter = '';
    let hasOld = false;
    let hasNew = false;

    for (const col of columns) {
      const rawValue = row[col];
      if (typeof rawValue === 'string' && rawValue.startsWith(newBase)) {
        hasNew = true;
      }

      const replaced = rewriteUrl(rawValue, oldBase, newBase);
      if (replaced) {
        hasOld = true;
        patch[col] = replaced;
        if (!firstBefore) {
          firstBefore = rawValue as string;
          firstAfter = replaced;
        }
      }
    }

    if (hasOld) {
      willUpdate += 1;
      updatePayloads.push({ id: row.id, patch });
      if (sampleWillUpdate.length < 10) {
        sampleWillUpdate.push({ episodeId: row.id, before: firstBefore, after: firstAfter });
      }
      continue;
    }

    if (hasNew) {
      alreadyNew += 1;
    } else {
      skipped += 1;
    }
  }

  if (params.dryRun) {
    return {
      scanned: episodes.length,
      willUpdate,
      updated: 0,
      alreadyNew,
      skipped,
      sampleWillUpdate,
    };
  }

  let updated = 0;
  for (const item of updatePayloads) {
    const { error: updateError } = await supabaseAdmin
      .from('episodes')
      .update({
        ...item.patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (!updateError) {
      updated += 1;
      continue;
    }

    throw new Error(`Failed to update episode ${item.id}: ${updateError.message}`);
  }

  return {
    scanned: episodes.length,
    willUpdate,
    updated,
    alreadyNew,
    skipped,
    sampleWillUpdate,
  };
}
