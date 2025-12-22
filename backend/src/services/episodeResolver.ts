export function buildAnimelyUrl(slug: string, seasonNumber: number, episodeNumber: number) {
  if (seasonNumber <= 1) {
    return `https://animely.net/anime/${slug}/izle/${episodeNumber}`;
  }
  return `https://animely.net/anime/${slug}-${seasonNumber}-sezon/izle/${episodeNumber}`;
}
