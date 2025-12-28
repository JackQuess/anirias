/**
 * Season Slug Utilities
 * 
 * Generates and parses season-specific slugs for routing.
 * Strategy:
 * - Season 1 → anime-slug (base slug)
 * - Season 2 → anime-slug-season-2
 * - Season 3 → anime-slug-season-3
 */

/**
 * Generate a season-specific slug from anime slug and season number
 */
export function generateSeasonSlug(animeSlug: string, seasonNumber: number): string {
  if (!animeSlug || seasonNumber < 1) {
    throw new Error('Invalid anime slug or season number');
  }
  
  // Season 1 uses the base slug
  if (seasonNumber === 1) {
    return animeSlug;
  }
  
  // Season 2+ use: anime-slug-season-X
  return `${animeSlug}-season-${seasonNumber}`;
}

/**
 * Parse a season-specific slug to extract anime slug and season number
 * Returns { animeSlug, seasonNumber } or null if invalid
 */
export function parseSeasonSlug(slug: string): { animeSlug: string; seasonNumber: number } | null {
  if (!slug || slug.trim() === '') {
    return null;
  }
  
  // Check if it's a season slug (ends with -season-X)
  const seasonMatch = slug.match(/^(.+)-season-(\d+)$/);
  if (seasonMatch) {
    const [, animeSlug, seasonNumStr] = seasonMatch;
    const seasonNumber = parseInt(seasonNumStr, 10);
    if (isNaN(seasonNumber) || seasonNumber < 2) {
      return null;
    }
    return {
      animeSlug: animeSlug.trim(),
      seasonNumber,
    };
  }
  
  // Otherwise, it's season 1 (base slug)
  return {
    animeSlug: slug.trim(),
    seasonNumber: 1,
  };
}

/**
 * Extract anime slug from a season-specific slug
 * This is a helper for backward compatibility
 */
export function getAnimeSlugFromSeasonSlug(seasonSlug: string): string {
  const parsed = parseSeasonSlug(seasonSlug);
  return parsed?.animeSlug || seasonSlug;
}

