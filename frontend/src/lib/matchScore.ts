import type { Anime, WatchlistEntry } from '@/types';

/** DB'de score yoksa veya 0 ise: izlenme + tür çeşitliliğinden zayıf bir öncü (1–10). */
function inferScoreTen(anime: Pick<Anime, 'score' | 'view_count' | 'genres'>): number {
  const vc = Number(anime.view_count) || 0;
  let x = 6.4 + Math.min(2.5, Math.log10(vc + 14) * 0.68);
  const genres = anime.genres?.length ?? 0;
  if (genres > 0) x += Math.min(0.5, genres * 0.065);
  return Math.min(9.3, Math.max(5.0, x));
}

/** Liste durumuna göre tür sinyali ağırlığı */
const STATUS_WEIGHT: Record<string, number> = {
  completed: 1,
  watching: 0.78,
  planning: 0.42,
  paused: 0.32,
  dropped: 0.12,
};

function normGenre(g: string): string {
  return String(g).trim().toLowerCase();
}

function animeGenres(anime: Anime | undefined | null): string[] {
  if (!anime?.genres?.length) return [];
  return [...new Set(anime.genres.map(normGenre).filter(Boolean))];
}

function animeTags(anime: Anime | undefined | null): string[] {
  if (!anime?.tags?.length) return [];
  return [...new Set(anime.tags.map(normGenre).filter(Boolean))];
}

/**
 * Sitedeki puan (1–10) → yüzde; puan yoksa inferScoreTen ile tahmin (0% göstermeyi önler).
 */
export function fallbackMatchFromSiteScore(
  anime: Anime | Pick<Anime, 'score' | 'view_count' | 'genres'>
): number {
  const raw = Number(anime.score);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.min(100, Math.max(8, Math.round(raw * 10)));
  }
  const ten = inferScoreTen(anime);
  return Math.min(96, Math.max(40, Math.round(ten * 10)));
}

/**
 * Kullanıcı listesi + hedef anime verisiyle kişiselleştirilmiş uyum (%).
 * Veritabanında ayrı kolon yok; watchlist.anime join ile türler ve puan eğilimi çıkarılır.
 */
export function computeAnimeMatchPercent(params: {
  watchlist: WatchlistEntry[] | null | undefined;
  targetAnime: Anime;
  userId: string | null | undefined;
}): number {
  const { watchlist, targetAnime, userId } = params;
  const base = fallbackMatchFromSiteScore(targetAnime);

  if (!userId || !watchlist?.length) {
    return base;
  }

  const genreWeights = new Map<string, number>();
  const tagWeights = new Map<string, number>();
  const scoreValues: number[] = [];

  for (const entry of watchlist) {
    const a = entry.anime;
    if (!a || a.id === targetAnime.id) continue;

    const w = STATUS_WEIGHT[entry.status] ?? 0.38;

    for (const g of animeGenres(a)) {
      genreWeights.set(g, (genreWeights.get(g) || 0) + w);
    }
    for (const t of animeTags(a)) {
      tagWeights.set(t, (tagWeights.get(t) || 0) + w * 0.55);
    }

    const s = Number(a.score);
    if (Number.isFinite(s) && s > 0) scoreValues.push(s);
    const us = entry.score;
    if (us != null && Number.isFinite(Number(us)) && Number(us) > 0) {
      scoreValues.push(Number(us));
    }
  }

  if (genreWeights.size === 0 && tagWeights.size === 0 && scoreValues.length === 0) {
    return base;
  }

  const targetG = animeGenres(targetAnime);
  const targetT = animeTags(targetAnime);

  let genrePoints = 0;
  if (targetG.length > 0 && genreWeights.size > 0) {
    const userTop = [...genreWeights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([g]) => g);
    const userSet = new Set(userTop);
    const tSet = new Set(targetG);
    let inter = 0;
    for (const g of tSet) {
      if (userSet.has(g)) inter += 1;
    }
    const union = new Set([...userSet, ...tSet]).size;
    const jaccard = union > 0 ? inter / union : 0;
    genrePoints = jaccard * 52;
  }

  let tagPoints = 0;
  if (targetT.length > 0 && tagWeights.size > 0) {
    let hit = 0;
    for (const t of targetT) {
      if (tagWeights.has(t)) hit += 1;
    }
    tagPoints = Math.min(18, (hit / targetT.length) * 20);
  }

  const meanTaste = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : Number(targetAnime.score) || 7;
  const targetScore = Number(targetAnime.score) || meanTaste;
  const diff = Math.abs(targetScore - meanTaste);
  const scorePoints = Math.max(0, 22 - diff * 3.2);

  const vc = targetAnime.view_count || 0;
  const popularityPoints = Math.min(8, Math.log10(vc + 12) * 2.2);

  const personalized = genrePoints + tagPoints + scorePoints + popularityPoints;
  const clampedPersonal = Math.min(96, Math.max(22, personalized));

  const tasteRows = watchlist.filter((e) => e.anime && e.anime.id !== targetAnime.id).length;
  const mix = tasteRows >= 3 ? 0.62 : tasteRows >= 1 ? 0.48 : 0.35;
  const blended = Math.round(mix * clampedPersonal + (1 - mix) * base);

  return Math.min(99, Math.max(8, blended));
}

export function formatMatchLabel(percent: number): string {
  return `${Math.round(percent)}% Uyum`;
}
