/**
 * Bölüm kısa metinleri: AniList → MAL id → Jikan API (bölüm özeti).
 * AniList tek başına uzun bölüm özeti sunmaz; streamingEpisodes sadece başlık.
 */

import { getAniListStreamingEpisodeMeta, cleanDescription } from './anilist.js';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const JIKAN_GAP_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type JikanEpisodeRow = {
  episode?: number | null;
  synopsis?: string | null;
  title?: string | null;
};

/**
 * MAL anime id → bölüm numarası → özet veya başlık
 */
export async function fetchJikanEpisodeSynopses(malAnimeId: number): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  let page = 1;

  for (let guard = 0; guard < 80; guard++) {
    await sleep(JIKAN_GAP_MS);
    const res = await fetch(`${JIKAN_BASE}/anime/${malAnimeId}/episodes?page=${page}`, {
      headers: {
        'User-Agent': 'Anirias/1.0 (episode synopsis; +https://anirias.com)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) break;

    const j = (await res.json()) as {
      data?: JikanEpisodeRow[];
      pagination?: { has_next_page?: boolean };
    };

    const rows = j.data || [];

    for (const ep of rows) {
      const num = typeof ep.episode === 'number' ? ep.episode : parseInt(String(ep.episode ?? ''), 10);
      if (!Number.isFinite(num) || num < 1) continue;

      const syn = cleanDescription(ep.synopsis || '') || String(ep.title || '').trim();
      if (syn) out[num] = syn;
    }

    if (!j.pagination?.has_next_page) break;
    page += 1;
  }

  return out;
}

/**
 * AniList id → bölüm numarası → kısa açıklama (önce Jikan, yoksa streaming başlığı)
 */
export async function buildEpisodeSynopsisMap(anilistId: number): Promise<Record<number, string>> {
  const meta = await getAniListStreamingEpisodeMeta(anilistId);
  const out: Record<number, string> = {};

  if (meta.idMal && meta.idMal > 0) {
    const jikan = await fetchJikanEpisodeSynopses(meta.idMal);
    Object.assign(out, jikan);
  }

  // Streaming başlıkları: çoğu serviste 1..N sırasıyla dizilir; boş kalan slotlara düş
  if (meta.streamingEpisodeTitles.length > 0) {
    meta.streamingEpisodeTitles.forEach((raw, idx) => {
      const epNum = idx + 1;
      if (out[epNum]) return;
      const t = cleanDescription(raw);
      if (t) out[epNum] = t;
    });
  }

  return out;
}

const cache = new Map<number, { at: number; data: Record<number, string> }>();
const TTL_MS = 6 * 60 * 60 * 1000;

export function getCachedSynopsisMap(anilistId: number): Record<number, string> | null {
  const row = cache.get(anilistId);
  if (!row || Date.now() - row.at > TTL_MS) return null;
  return row.data;
}

export function setCachedSynopsisMap(anilistId: number, data: Record<number, string>) {
  cache.set(anilistId, { at: Date.now(), data });
}
