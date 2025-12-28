import { generateSeasonSlug } from './seasonSlug';

/**
 * Generate watch page URL using anime slug with season-specific slugs
 * Format: /watch/{season-slug}/{seasonNumber}/{episodeNumber}
 * Strategy:
 * - Season 1 → anime-slug
 * - Season 2 → anime-slug-season-2
 * - Season 3 → anime-slug-season-3
 */
export function getWatchUrl(anime: { slug?: string | null; id?: string }, seasonNumber: number, episodeNumber: number): string {
  // Use slug if available, fallback to id (for backward compat during migration)
  const baseSlug = anime.slug || anime.id;
  if (!baseSlug) {
    console.warn('[getWatchUrl] No slug or id provided, using fallback');
    return `/watch/unknown/${seasonNumber}/${episodeNumber}`;
  }
  
  // Generate season-specific slug
  const seasonSlug = generateSeasonSlug(baseSlug, seasonNumber);
  return `/watch/${seasonSlug}/${seasonNumber}/${episodeNumber}`;
}

/**
 * Check if a string is a UUID
 */
export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

