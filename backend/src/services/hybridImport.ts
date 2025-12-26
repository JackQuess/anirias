/**
 * Hybrid Anime Import Service
 * 
 * GOAL: Build a hybrid import system using AniList + MyAnimeList
 * - AniList: metadata and season ranges
 * - MyAnimeList: episode count validation only
 * - Supabase: SINGLE SOURCE OF TRUTH
 * 
 * CRITICAL RULES:
 * - Do NOT trust external APIs for season count or episode lists
 * - External APIs are helpers, NOT authorities
 * - All season and episode grouping must come from Supabase
 */

import { searchAniList, getAniListMedia, detectSeasonRanges, cleanDescription, type AniListMedia, type AniListSeasonRange } from './anilist.js';
import { validateEpisodeCount } from './myanimelist.js';
import {
  ensureAnimeSlug,
  ensureSeason,
  supabaseAdmin,
  type AnimeRow,
  type SeasonRow,
} from './supabaseAdmin.js';

export interface HybridImportParams {
  anilistId: number;
  malId?: number | null;
  animelySlug?: string | null;
}

export interface HybridImportResult {
  success: boolean;
  animeId: string | null;
  seasonsCreated: number;
  episodesCreated: number;
  warnings: string[];
  errors: string[];
  malValidation?: {
    isValid: boolean;
    malCount: number | null;
    supabaseCount: number;
    warning?: string;
  };
}

/**
 * STEP 1: Create or update anime in Supabase
 */
async function createOrUpdateAnime(
  media: AniListMedia,
  malId?: number | null,
  animelySlug?: string | null
): Promise<string> {
  // Check if anime exists by anilist_id
  const { data: existing } = await supabaseAdmin
    .from('animes')
    .select('id, slug')
    .eq('anilist_id', media.id)
    .maybeSingle();

  if (existing?.id) {
    // Update existing anime
    const titleRomaji = media.title?.romaji || '';
    const titleEnglish = media.title?.english || '';
    const title = titleRomaji || titleEnglish || 'Unknown';
    
    const slug = animelySlug || existing.slug || generateSlug(title);
    
    const { error } = await supabaseAdmin
      .from('animes')
      .update({
        title: { romaji: titleRomaji, english: titleEnglish },
        description: cleanDescription(media.description),
        cover_image: media.coverImage?.large || media.coverImage?.extraLarge || null,
        banner_image: media.bannerImage || null,
        score: media.averageScore ? Math.round(media.averageScore / 10) : null,
        year: media.seasonYear || null,
        genres: media.genres || [],
        format: media.format || null,
        // Note: mal_id column may not exist - check schema first
        // For now, we'll store it in a metadata field or skip if column doesn't exist
        slug: slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw new Error(`Anime update failed: ${error.message}`);
    
    // Ensure slug is set
    if (!existing.slug && slug) {
      await supabaseAdmin
        .from('animes')
        .update({ slug })
        .eq('id', existing.id);
    }

    return existing.id;
  }

  // Create new anime
  const titleRomaji = media.title?.romaji || '';
  const titleEnglish = media.title?.english || '';
  const title = titleRomaji || titleEnglish || 'Unknown';
  const slug = animelySlug || generateSlug(title);

  const { data: newAnime, error } = await supabaseAdmin
    .from('animes')
    .insert({
      title: { romaji: titleRomaji, english: titleEnglish },
      description: cleanDescription(media.description),
      cover_image: media.coverImage?.large || media.coverImage?.extraLarge || null,
      banner_image: media.bannerImage || null,
      score: media.averageScore ? Math.round(media.averageScore / 10) : null,
      year: media.seasonYear || null,
      genres: media.genres || [],
      format: media.format || null,
      anilist_id: media.id,
      // Note: mal_id may not exist in schema - stored separately if needed
      slug: slug,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !newAnime) {
    throw new Error(`Anime creation failed: ${error?.message || 'Unknown error'}`);
  }

  return newAnime.id;
}

/**
 * STEP 2: Resolve seasons using priority:
 * 1. Existing seasons in Supabase
 * 2. AniList episode ranges (if no existing seasons)
 */
async function resolveSeasons(
  animeId: string,
  anilistRanges: AniListSeasonRange[]
): Promise<SeasonRow[]> {
  // Priority 1: Check existing seasons in Supabase
  const { data: existingSeasons, error: fetchError } = await supabaseAdmin
    .from('seasons')
    .select('id, season_number, anilist_id')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch existing seasons: ${fetchError.message}`);
  }

  // If seasons exist, return them (Supabase is source of truth)
  if (existingSeasons && existingSeasons.length > 0) {
    return existingSeasons.map(s => ({
      id: s.id,
      season_number: s.season_number,
    }));
  }

  // Priority 2: Create seasons from AniList ranges
  // Normalize: ignore specials, ONA, OVA unless explicitly selected
  // Merge AniList sub-media into correct season_number
  const validRanges = anilistRanges.filter(range => {
    // Filter out non-TV formats if needed
    // For now, accept all ranges from AniList
    return range.episodeStart > 0 && range.episodeEnd >= range.episodeStart;
  });

  const createdSeasons: SeasonRow[] = [];

  for (const range of validRanges) {
    // Ensure season exists in Supabase
    const seasonId = await ensureSeason(animeId, range.seasonNumber);
    
    // Update season with AniList metadata (optional)
    await supabaseAdmin
      .from('seasons')
      .update({
        anilist_id: range.anilistId,
        title: range.title || `Sezon ${range.seasonNumber}`,
        year: range.year || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seasonId);

    createdSeasons.push({
      id: seasonId,
      season_number: range.seasonNumber,
    });
  }

  return createdSeasons;
}

/**
 * STEP 3: Generate episodes for each season
 */
async function generateEpisodes(
  animeId: string,
  seasons: SeasonRow[],
  anilistRanges: AniListSeasonRange[]
): Promise<number> {
  let totalEpisodesCreated = 0;

  for (const season of seasons) {
    // Find corresponding AniList range for this season
    const range = anilistRanges.find(r => r.seasonNumber === season.season_number);
    
    if (!range) {
      // No range info - skip episode generation
      // Episodes can be created manually or via other import methods
      continue;
    }

    const episodeStart = range.episodeStart;
    const episodeEnd = range.episodeEnd;
    const episodeCount = episodeEnd - episodeStart + 1;

    // Check existing episodes for this season
    const { data: existingEpisodes } = await supabaseAdmin
      .from('episodes')
      .select('episode_number')
      .eq('anime_id', animeId)
      .eq('season_id', season.id)
      .order('episode_number', { ascending: true });

    const existingNumbers = new Set(existingEpisodes?.map(ep => ep.episode_number) || []);

    // Generate missing episodes
    const episodesToCreate = [];
    for (let epNum = episodeStart; epNum <= episodeEnd; epNum++) {
      if (!existingNumbers.has(epNum)) {
        episodesToCreate.push({
          anime_id: animeId,
          season_id: season.id,
          season_number: season.season_number,
          episode_number: epNum,
          title: `Bölüm ${epNum}`,
          status: 'pending',
          video_url: null,
          duration_seconds: 1440, // Default 24 minutes
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (episodesToCreate.length > 0) {
      const { error } = await supabaseAdmin
        .from('episodes')
        .insert(episodesToCreate);

      if (error) {
        throw new Error(`Episode creation failed for season ${season.season_number}: ${error.message}`);
      }

      totalEpisodesCreated += episodesToCreate.length;
    }
  }

  return totalEpisodesCreated;
}

/**
 * Main hybrid import function
 */
export async function hybridImportAnime(params: HybridImportParams): Promise<HybridImportResult> {
  const { anilistId, malId, animelySlug } = params;
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // STEP 1: Fetch AniList media
    const media = await getAniListMedia(anilistId);
    if (!media) {
      return {
        success: false,
        animeId: null,
        seasonsCreated: 0,
        episodesCreated: 0,
        warnings,
        errors: ['AniList media not found'],
      };
    }

    // STEP 2: Detect season ranges from AniList
    // Note: This is a HELPER, not authoritative
    // For now, we'll use the main media as Season 1
    // In the future, we can fetch related media to detect sequels/prequels
    const anilistRanges = detectSeasonRanges(media, []); // Related media can be fetched later if needed
    
    if (anilistRanges.length === 0) {
      warnings.push('No season ranges detected from AniList - will use default Season 1');
      // Default: create Season 1 if no ranges detected
      if (media.episodes && media.episodes > 0) {
        anilistRanges.push({
          seasonNumber: 1,
          episodeStart: 1,
          episodeEnd: media.episodes,
          anilistId: media.id,
          title: media.title?.romaji || media.title?.english || undefined,
          year: media.seasonYear || undefined,
          format: media.format || undefined,
        });
      }
    }

    // STEP 3: Create or update anime in Supabase
    const animeId = await createOrUpdateAnime(media, malId, animelySlug);
    await ensureAnimeSlug(animeId); // Ensure slug exists

    // STEP 4: Resolve seasons (priority: Supabase > AniList)
    const seasons = await resolveSeasons(animeId, anilistRanges);
    
    if (seasons.length === 0) {
      warnings.push('No seasons created - episodes cannot be generated without seasons');
    }

    // STEP 5: Generate episodes for each season
    const episodesCreated = await generateEpisodes(animeId, seasons, anilistRanges);

    // STEP 6: MAL validation (soft check)
    let malValidation;
    if (malId) {
      const { count: episodeCount } = await supabaseAdmin
        .from('episodes')
        .select('id', { count: 'exact', head: true })
        .eq('anime_id', animeId);

      const supabaseCount = episodeCount || 0;
      const validation = await validateEpisodeCount(malId, supabaseCount);
      
      if (!validation.isValid && validation.warning) {
        warnings.push(validation.warning);
      }

      malValidation = {
        ...validation,
        supabaseCount,
      };
    }

    return {
      success: true,
      animeId,
      seasonsCreated: seasons.length,
      episodesCreated,
      warnings,
      errors,
      malValidation,
    };
  } catch (error: any) {
    console.error('[HybridImport] Error:', error);
    errors.push(error.message || 'Unknown error');
    
    return {
      success: false,
      animeId: null,
      seasonsCreated: 0,
      episodesCreated: 0,
      warnings,
      errors,
    };
  }
}

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'anime';
}

