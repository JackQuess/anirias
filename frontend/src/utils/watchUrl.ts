/**
 * İzleme URL’si: /watch/{anime-slug}/{seasonNumber}/{episodeNumber}
 * Sezon her zaman path’teki ikinci segment; ilk segment daima taban slug.
 */
export function getWatchUrl(anime: { slug?: string | null; id?: string }, seasonNumber: number, episodeNumber: number): string {
  const baseSlug = anime.slug || anime.id;
  if (!baseSlug) {
    console.warn('[getWatchUrl] No slug or id provided, using fallback');
    return `/watch/unknown/${seasonNumber}/${episodeNumber}`;
  }
  return `/watch/${encodeURIComponent(baseSlug)}/${seasonNumber}/${episodeNumber}`;
}

/**
 * Check if a string is a UUID
 */
export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

