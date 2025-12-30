import { Anime } from '../types';

/**
 * Adult Content Detection Utility
 * 
 * Determines if anime is adult (+18) content
 * Includes Ecchi, Hentai, and other adult genres
 */

const ADULT_GENRES = ['Hentai', 'Erotica', 'Adult', 'Ecchi'];
const ADULT_RATINGS = ['R18', 'Rx', 'R18+'];

/**
 * Check if anime is adult (+18) content
 * 
 * Returns true if:
 * - anime.is_adult === true
 * - OR anime.rating is R18/Rx
 * - OR anime.genres includes Hentai/Erotica/Adult/Ecchi
 */
export function isAdultContent(anime: Anime | null | undefined): boolean {
  if (!anime) return false;

  // 1. Explicit is_adult flag
  if (anime.is_adult === true) {
    return true;
  }

  // 2. Rating check (R18, Rx)
  if (anime.rating && ADULT_RATINGS.some(r => 
    anime.rating?.toUpperCase().includes(r.toUpperCase())
  )) {
    return true;
  }

  // 3. Genre check (Hentai, Erotica, Adult, Ecchi)
  if (anime.genres && anime.genres.length > 0) {
    const hasAdultGenre = anime.genres.some(genre =>
      ADULT_GENRES.some(adult => 
        genre.toLowerCase().includes(adult.toLowerCase())
      )
    );
    
    if (hasAdultGenre) {
      return true;
    }
  }

  return false;
}

