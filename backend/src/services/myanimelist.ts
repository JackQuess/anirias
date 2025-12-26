/**
 * MyAnimeList API Service
 * 
 * PURPOSE:
 * - Fetch total episode_count for validation ONLY
 * - DO NOT use MAL for season detection
 * - DO NOT use MAL for episode objects
 * - MAL is ONLY for validation/comparison
 */

export interface MyAnimeListAnime {
  id: number;
  title: string;
  episodes: number | null;
  status: string | null;
  score: number | null;
}

/**
 * Fetch anime from MyAnimeList by ID
 * 
 * NOTE: MAL API requires authentication and has rate limits.
 * This is a simplified implementation that expects MAL API access.
 * 
 * In production, you may need to:
 * - Use MAL API v2 with OAuth
 * - Use a proxy/scraper
 * - Cache results to respect rate limits
 */
export async function getMALAnime(malId: number): Promise<MyAnimeListAnime | null> {
  try {
    // MAL API v2 endpoint (requires authentication)
    // For now, using a placeholder structure
    // In production, implement actual MAL API v2 authentication
    
    const response = await fetch(`https://api.myanimelist.net/v2/anime/${malId}?fields=id,title,episodes,status,mean`, {
      method: 'GET',
      headers: {
        'X-MAL-CLIENT-ID': process.env.MAL_CLIENT_ID || '', // Requires MAL API credentials
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`MAL API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      title: data.title || '',
      episodes: data.num_episodes || data.episodes || null,
      status: data.status || null,
      score: data.mean || null,
    };
  } catch (error: any) {
    // MAL API is optional - log but don't fail
    console.warn('[MyAnimeList] Fetch error (non-critical):', error.message);
    return null;
  }
}

/**
 * Validate episode count against Supabase total
 * 
 * This is a SOFT validation - logs warnings but doesn't modify data
 */
export async function validateEpisodeCount(
  malId: number | null | undefined,
  supabaseEpisodeCount: number
): Promise<{ isValid: boolean; malCount: number | null; warning?: string }> {
  if (!malId) {
    return {
      isValid: true, // No MAL ID = skip validation
      malCount: null,
    };
  }

  const malAnime = await getMALAnime(malId);
  
  if (!malAnime || malAnime.episodes === null) {
    return {
      isValid: true, // MAL data unavailable = skip validation
      malCount: null,
    };
  }

  const malCount = malAnime.episodes;
  const isValid = malCount === supabaseEpisodeCount;
  
  if (!isValid) {
    const warning = `Episode count mismatch: Supabase has ${supabaseEpisodeCount} episodes, MAL reports ${malCount} episodes`;
    console.warn('[MyAnimeList] Validation warning:', warning);
    
    return {
      isValid: false,
      malCount,
      warning,
    };
  }

  return {
    isValid: true,
    malCount,
  };
}

/**
 * Search MyAnimeList (optional helper)
 * 
 * NOTE: Not used in the hybrid import flow, but available for manual lookup
 */
export async function searchMAL(query: string): Promise<MyAnimeListAnime[]> {
  try {
    const response = await fetch(`https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(query)}&limit=10&fields=id,title,episodes`, {
      method: 'GET',
      headers: {
        'X-MAL-CLIENT-ID': process.env.MAL_CLIENT_ID || '',
      }
    });

    if (!response.ok) {
      throw new Error(`MAL API error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.data || [];
    
    return items.map((item: any) => ({
      id: item.node.id,
      title: item.node.title || '',
      episodes: item.node.num_episodes || null,
      status: null,
      score: null,
    }));
  } catch (error: any) {
    console.warn('[MyAnimeList] Search error (non-critical):', error.message);
    return [];
  }
}

