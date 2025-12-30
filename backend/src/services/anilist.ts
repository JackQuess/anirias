/**
 * AniList API Service
 * 
 * PURPOSE:
 * - Fetch anime metadata (title, description, cover, banner, genres, year, format)
 * - Fetch episode ranges (episode_start / episode_end) for season detection
 * - DO NOT use AniList as source of truth for season/episode counts
 */

const ANILIST_API = 'https://graphql.anilist.co';

export interface AniListMedia {
  id: number;
  title: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
  description?: string | null;
  coverImage?: {
    extraLarge?: string | null;
    large?: string | null;
  } | null;
  bannerImage?: string | null;
  averageScore?: number | null;
  seasonYear?: number | null;
  genres?: string[] | null;
  format?: string | null;
  episodes?: number | null;
  status?: string | null;
  // Relations for season detection
  relations?: {
    edges?: Array<{
      relationType?: string | null;
      node?: {
        id?: number | null;
        title?: {
          romaji?: string | null;
          english?: string | null;
        } | null;
        format?: string | null;
        episodes?: number | null;
        startDate?: {
          year?: number | null;
          month?: number | null;
          day?: number | null;
        } | null;
      } | null;
    }>;
  } | null;
}

export interface AniListSeasonRange {
  seasonNumber: number;
  episodeStart: number;
  episodeEnd: number;
  anilistId: number;
  title?: string;
  year?: number;
  format?: string;
}

export interface AniListAiringSchedule {
  episode: number;
  airingAt: number; // UNIX timestamp
}

const SEARCH_QUERY = `
query ($search: String) {
  Page(perPage: 10) {
    media(search: $search, type: ANIME, format_in: [TV, TV_SHORT]) {
      id
      title { romaji english native }
      description
      coverImage { extraLarge large }
      bannerImage
      averageScore
      seasonYear
      genres
      episodes
      status
      format
    }
  }
}
`;

const DETAIL_QUERY = `
query ($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    description
    coverImage { extraLarge large }
    bannerImage
    averageScore
    seasonYear
    genres
    episodes
    status
    format
    relations {
      edges {
        relationType
        node {
          id
          title { romaji english }
          format
          episodes
          startDate { year month day }
        }
      }
    }
  }
}
`;

const AIRING_SCHEDULE_QUERY = `
query ($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    airingSchedule(notYetAired: true, perPage: 100) {
      nodes {
        episode
        airingAt
      }
    }
  }
}
`;

/**
 * Search anime on AniList
 */
export async function searchAniList(query: string): Promise<AniListMedia[]> {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { search: query }
      })
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`AniList GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    return json.data?.Page?.media || [];
  } catch (error: any) {
    console.error('[AniList] Search error:', error);
    throw new Error(`AniList search failed: ${error.message}`);
  }
}

/**
 * Get anime details by AniList ID
 */
export async function getAniListMedia(anilistId: number): Promise<AniListMedia | null> {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: DETAIL_QUERY,
        variables: { id: anilistId }
      })
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`AniList GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    return json.data?.Media || null;
  } catch (error: any) {
    console.error('[AniList] Get media error:', error);
    throw new Error(`AniList fetch failed: ${error.message}`);
  }
}

/**
 * Detect season ranges from AniList relations
 * 
 * Returns potential season splits based on:
 * - SEQUEL relations (Season 2, 3, etc.)
 * - PREQUEL relations (Season 0, prequels)
 * - START_DATE ordering
 * 
 * NOTE: This is a HELPER, not authoritative.
 * Supabase seasons are the source of truth.
 */
export function detectSeasonRanges(media: AniListMedia, allRelated: AniListMedia[] = []): AniListSeasonRange[] {
  const ranges: AniListSeasonRange[] = [];
  
  // Include main media as Season 1
  if (media.episodes && media.episodes > 0) {
    ranges.push({
      seasonNumber: 1,
      episodeStart: 1,
      episodeEnd: media.episodes,
      anilistId: media.id,
      title: media.title?.romaji || media.title?.english || undefined,
      year: media.seasonYear || undefined,
      format: media.format || undefined
    });
  }

  // Process relations to detect sequels/prequels
  const relations = media.relations?.edges || [];
  const sequelNodes: Array<{ node: AniListMedia; relationType: string; startDate?: { year?: number | null; month?: number | null; day?: number | null } | null }> = [];
  
  for (const edge of relations) {
    if (!edge?.node) continue;
    
    const relationType = edge.relationType || '';
    const node = edge.node;
    
    // Only consider TV/TV_SHORT formats
    if (node.format && !['TV', 'TV_SHORT'].includes(node.format)) {
      continue;
    }

    // Ignore specials, ONA, OVA unless they're explicitly sequels
    if (relationType === 'SEQUEL' || relationType === 'PREQUEL') {
      const relatedMedia = allRelated.find(m => m.id === node.id) || {
        id: node.id || 0,
        title: node.title,
        episodes: node.episodes || 0,
        format: node.format || undefined,
        seasonYear: node.startDate?.year || undefined
      };
      
      if (relatedMedia.episodes && relatedMedia.episodes > 0) {
        sequelNodes.push({
          node: relatedMedia as AniListMedia,
          relationType,
          startDate: node.startDate || undefined
        });
      }
    }
  }

  // Sort by start date (year, month, day) to determine season order
  sequelNodes.sort((a, b) => {
    const aYear = a.startDate?.year || a.node.seasonYear || 9999;
    const bYear = b.startDate?.year || b.node.seasonYear || 9999;
    if (aYear !== bYear) return aYear - bYear;
    
    const aMonth = a.startDate?.month || 0;
    const bMonth = b.startDate?.month || 0;
    if (aMonth !== bMonth) return aMonth - bMonth;
    
    const aDay = a.startDate?.day || 0;
    const bDay = b.startDate?.day || 0;
    return aDay - bDay;
  });

  // Assign season numbers based on chronological order
  let currentSeasonNumber = 2;
  let cumulativeEpisodes = ranges[0]?.episodeEnd || 0;
  
  for (const { node, relationType } of sequelNodes) {
    if (relationType === 'PREQUEL') {
      // Prequels go before Season 1
      ranges.unshift({
        seasonNumber: 0, // Or we could use negative numbers, but 0 is cleaner
        episodeStart: 1,
        episodeEnd: node.episodes || 0,
        anilistId: node.id,
        title: node.title?.romaji || node.title?.english || undefined,
        year: node.seasonYear || undefined,
        format: node.format || undefined
      });
    } else if (relationType === 'SEQUEL') {
      // Sequels continue from where previous season ended
      ranges.push({
        seasonNumber: currentSeasonNumber++,
        episodeStart: cumulativeEpisodes + 1,
        episodeEnd: cumulativeEpisodes + (node.episodes || 0),
        anilistId: node.id,
        title: node.title?.romaji || node.title?.english || undefined,
        year: node.seasonYear || undefined,
        format: node.format || undefined
      });
      cumulativeEpisodes += node.episodes || 0;
    }
  }

  // Normalize season numbers (start from 1, not 0)
  // If we have a prequel (season 0), we'll keep it as a special case
  // Otherwise, renumber everything to start from 1
  if (ranges.length > 0 && ranges[0].seasonNumber === 0) {
    // Keep prequel as 0, but renumber sequels to continue from 1
    let nextSeasonNum = 1;
    for (let i = 1; i < ranges.length; i++) {
      ranges[i].seasonNumber = nextSeasonNum++;
    }
  } else {
    // No prequel, just renumber all to start from 1
    ranges.forEach((range, index) => {
      range.seasonNumber = index + 1;
    });
  }

  return ranges;
}

/**
 * Get airing schedule for an anime from AniList
 */
export async function getAniListAiringSchedule(anilistId: number): Promise<AniListAiringSchedule[]> {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: AIRING_SCHEDULE_QUERY,
        variables: { id: anilistId }
      })
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`AniList GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    const nodes = json.data?.Media?.airingSchedule?.nodes || [];
    return nodes.map((node: any) => ({
      episode: node.episode || 0,
      airingAt: node.airingAt || 0
    }));
  } catch (error: any) {
    console.error('[AniList] Airing schedule error:', error);
    return []; // Return empty array on error, don't break import
  }
}

/**
 * Clean HTML description from AniList
 */
export function cleanDescription(html: string | null | undefined): string {
  if (!html) return '';
  // Remove HTML tags, decode entities
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

