export function buildSourceUrl(slug: string, seasonNumber: number, episodeNumber: number, template?: string) {
  if (template && template.includes('{anime_slug}') && template.includes('{episode_number}')) {
    return template
      .replace('{anime_slug}', slug)
      .replace('{season_number}', String(seasonNumber))
      .replace('{episode_number}', String(episodeNumber));
  }

  if (seasonNumber <= 1) {
    return `https://animely.net/anime/${slug}/izle/${episodeNumber}`;
  }
  return `https://animely.net/anime/${slug}-${seasonNumber}-sezon/izle/${episodeNumber}`;
}
