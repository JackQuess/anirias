import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { uploadToBunny } from './bunnyUpload.js';
import { ANIRIAS_VIDEO_CDN_BASE, type EpisodeSubtitleTrackRow } from './supabaseAdmin.js';

const LANG_LABELS: Record<string, string> = {
  tr: 'Türkçe',
  en: 'English',
  ja: '日本語',
  'pt-br': 'Português',
  ar: 'العربية',
};

function remoteSubtitlePath(slug: string, seasonNumber: number, episodeNumber: number, langCode: string) {
  const padded = episodeNumber.toString().padStart(2, '0');
  const safe = langCode.replace(/[^a-zA-Z0-9-]/g, '') || 'sub';
  return `${slug}/season-${seasonNumber}/episode-${padded}.${safe}.vtt`;
}

function publicSubtitleUrl(slug: string, seasonNumber: number, episodeNumber: number, langCode: string) {
  const padded = episodeNumber.toString().padStart(2, '0');
  const safe = langCode.replace(/[^a-zA-Z0-9-]/g, '') || 'sub';
  return `${ANIRIAS_VIDEO_CDN_BASE}/${slug}/season-${seasonNumber}/episode-${padded}.${safe}.vtt`;
}

/** Language segment from yt-dlp sidecar name, e.g. episode-1.tr.vtt → tr, episode-01.zh-Hans.vtt → zh-Hans */
export function parseLangFromVttFilename(filename: string): string {
  const base = path.basename(filename, '.vtt');
  const parts = base.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 1] || 'und';
  }
  return 'und';
}

function labelForLang(lang: string): string {
  const lower = lang.toLowerCase();
  if (LANG_LABELS[lower]) return LANG_LABELS[lower];
  if (LANG_LABELS[lang]) return LANG_LABELS[lang];
  return lang;
}

/**
 * Uploads all .vtt files next to the downloaded video, names them episode-XX.<lang>.vtt on CDN,
 * deletes local vtt files after upload. Returns rows for `episodes.subtitle_tracks`.
 */
export async function uploadEpisodeVttSidecars(params: {
  videoFilePath: string;
  slug: string;
  seasonNumber: number;
  episodeNumber: number;
}): Promise<EpisodeSubtitleTrackRow[]> {
  const { videoFilePath, slug, seasonNumber, episodeNumber } = params;
  const dir = path.dirname(videoFilePath);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const vttFiles = entries.filter((f) => f.toLowerCase().endsWith('.vtt'));
  const tracks: EpisodeSubtitleTrackRow[] = [];

  for (const name of vttFiles) {
    const lang = parseLangFromVttFilename(name);
    const localPath = path.join(dir, name);
    const remote = remoteSubtitlePath(slug, seasonNumber, episodeNumber, lang);
    try {
      await uploadToBunny(remote, localPath);
      tracks.push({
        url: publicSubtitleUrl(slug, seasonNumber, episodeNumber, lang),
        label: labelForLang(lang),
        lang,
      });
    } catch (e) {
      console.warn(`[subtitlePipeline] VTT upload failed (${name}):`, e);
    } finally {
      await rm(localPath, { force: true }).catch(() => {});
    }
  }

  return tracks.sort((a, b) => (a.lang || '').localeCompare(b.lang || ''));
}
