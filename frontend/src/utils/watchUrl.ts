/**
 * Generate watch page URL using anime slug
 * Format: /watch/{slug}/{seasonNumber}/{episodeNumber}
 */
export function getWatchUrl(anime: { slug?: string | null; id?: string }, seasonNumber: number, episodeNumber: number): string {
  // Use slug if available, fallback to id (for backward compat during migration)
  const identifier = anime.slug || anime.id;
  if (!identifier) {
    console.warn('[getWatchUrl] No slug or id provided, using fallback');
    return `/watch/unknown/${seasonNumber}/${episodeNumber}`;
  }
  return `/watch/${identifier}/${seasonNumber}/${episodeNumber}`;
}

/**
 * Check if a string is a UUID
 */
export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

