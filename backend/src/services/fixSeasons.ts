/**
 * Fix Seasons Service
 * 
 * PURPOSE:
 * Fix broken/wrong season structures caused by AniList or manual imports.
 * 
 * RULES:
 * - DO NOT delete episodes
 * - DO NOT touch video_url
 * - DO NOT check CDN
 * - Only fix relational structure
 */

import { supabaseAdmin } from './supabaseAdmin.js';

export interface FixSeasonsResult {
  success: boolean;
  seasonsFixed: number;
  seasonsRemoved: number;
  episodesReassigned: number;
  errors: string[];
}

/**
 * Fix seasons for a given anime
 * 
 * Logic:
 * 1. Fetch all episodes for anime
 * 2. Group episodes by season_number
 * 3. Auto-assign NULL season_numbers based on episode ranges
 * 4. Remove seasons with 0 episodes
 * 5. Fix season metadata (season_number, title, episode_count)
 * 6. Update episode season_id and season_number
 */
export async function fixSeasonsForAnime(animeId: string): Promise<FixSeasonsResult> {
  const errors: string[] = [];
  let seasonsFixed = 0;
  let seasonsRemoved = 0;
  let episodesReassigned = 0;

  try {
    // STEP 1: Fetch all episodes for this anime
    const { data: allEpisodes, error: episodesError } = await supabaseAdmin
      .from('episodes')
      .select('id, episode_number, season_id, season_number, created_at')
      .eq('anime_id', animeId)
      .order('episode_number', { ascending: true });

    if (episodesError) {
      throw new Error(`Failed to fetch episodes: ${episodesError.message}`);
    }

    if (!allEpisodes || allEpisodes.length === 0) {
      return {
        success: true,
        seasonsFixed: 0,
        seasonsRemoved: 0,
        episodesReassigned: 0,
        errors: ['No episodes found for this anime'],
      };
    }

    // STEP 2: Fetch all existing seasons
    const { data: existingSeasons, error: seasonsError } = await supabaseAdmin
      .from('seasons')
      .select('id, season_number')
      .eq('anime_id', animeId)
      .order('season_number', { ascending: true });

    if (seasonsError) {
      throw new Error(`Failed to fetch seasons: ${seasonsError.message}`);
    }

    // STEP 3: Group episodes by season_number (or determine season from episode ranges)
    const episodesBySeason: Record<number, typeof allEpisodes> = {};
    const episodesNeedingAssignment: typeof allEpisodes = [];

    for (const episode of allEpisodes) {
      if (episode.season_number !== null && episode.season_number > 0) {
        if (!episodesBySeason[episode.season_number]) {
          episodesBySeason[episode.season_number] = [];
        }
        episodesBySeason[episode.season_number].push(episode);
      } else {
        // Episode needs season assignment
        episodesNeedingAssignment.push(episode);
      }
    }

    // STEP 4: Auto-assign NULL season_numbers based on episode ranges
    // Strategy: Assign episodes to seasons based on ranges (1-12, 13-24, etc.)
    if (episodesNeedingAssignment.length > 0) {
      // Sort by episode_number
      episodesNeedingAssignment.sort((a, b) => a.episode_number - b.episode_number);

      // Find the highest existing season number
      const existingSeasonNumbers = Object.keys(episodesBySeason).map(Number).sort((a, b) => b - a);
      const maxSeasonNumber = existingSeasonNumbers.length > 0 ? existingSeasonNumbers[0] : 0;

      // Group episodes into ranges of ~12 episodes per season (or use existing pattern)
      const EPISODES_PER_SEASON = 12; // Default assumption
      let currentSeasonNumber = maxSeasonNumber + 1;
      let currentSeasonEpisodes: typeof episodesNeedingAssignment = [];

      for (const episode of episodesNeedingAssignment) {
        // If current season is full and we have a new episode, start new season
        if (currentSeasonEpisodes.length >= EPISODES_PER_SEASON && 
            currentSeasonEpisodes.length > 0 &&
            episode.episode_number > currentSeasonEpisodes[currentSeasonEpisodes.length - 1].episode_number + 1) {
          // Start new season
          if (!episodesBySeason[currentSeasonNumber]) {
            episodesBySeason[currentSeasonNumber] = [];
          }
          episodesBySeason[currentSeasonNumber].push(...currentSeasonEpisodes);
          currentSeasonNumber++;
          currentSeasonEpisodes = [];
        }
        currentSeasonEpisodes.push(episode);
      }

      // Add remaining episodes to current season
      if (currentSeasonEpisodes.length > 0) {
        if (!episodesBySeason[currentSeasonNumber]) {
          episodesBySeason[currentSeasonNumber] = [];
        }
        episodesBySeason[currentSeasonNumber].push(...currentSeasonEpisodes);
      }
    }

    // STEP 5: Remove empty seasons and fix season structure
    // Get season numbers that have episodes
    const seasonNumbersWithEpisodes = Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);

    // Delete seasons that have no episodes
    if (existingSeasons) {
      for (const season of existingSeasons) {
        if (!seasonNumbersWithEpisodes.includes(season.season_number)) {
          // This season has no episodes - delete it
          const { error: deleteError } = await supabaseAdmin
            .from('seasons')
            .delete()
            .eq('id', season.id);

          if (deleteError) {
            errors.push(`Failed to delete empty season ${season.season_number}: ${deleteError.message}`);
          } else {
            seasonsRemoved++;
          }
        }
      }
    }

    // STEP 6: Ensure seasons exist and fix metadata
    // Renumber seasons to be sequential (1, 2, 3, ...)
    const sortedSeasonNumbers = seasonNumbersWithEpisodes;
    const seasonIdMap: Record<number, string> = {}; // Map: old season_number -> season_id

    for (let i = 0; i < sortedSeasonNumbers.length; i++) {
      const oldSeasonNumber = sortedSeasonNumbers[i];
      const newSeasonNumber = i + 1;
      const episodes = episodesBySeason[oldSeasonNumber];

      // Find or create season with new season_number
      let seasonId: string;

      // Check if season with new season_number already exists
      const { data: existingSeason } = await supabaseAdmin
        .from('seasons')
        .select('id')
        .eq('anime_id', animeId)
        .eq('season_number', newSeasonNumber)
        .maybeSingle();

      if (existingSeason?.id) {
        seasonId = existingSeason.id;
      } else {
        // Check if old season exists and we can reuse it
        const oldSeasonExists = existingSeasons?.find(s => s.season_number === oldSeasonNumber);
        let oldSeason: { id: string } | null = null;
        
        if (oldSeasonExists) {
          const { data } = await supabaseAdmin
            .from('seasons')
            .select('id')
            .eq('anime_id', animeId)
            .eq('season_number', oldSeasonNumber)
            .maybeSingle();
          oldSeason = data;
        }

        if (oldSeason?.id) {
          // Update existing season to new season_number
          const { error: updateError } = await supabaseAdmin
            .from('seasons')
            .update({
              season_number: newSeasonNumber,
              title: `Sezon ${newSeasonNumber}`,
              episode_count: episodes.length,
              updated_at: new Date().toISOString(),
            })
            .eq('id', oldSeason.id);

          if (updateError) {
            throw new Error(`Failed to update season ${oldSeasonNumber} to ${newSeasonNumber}: ${updateError.message}`);
          }
          seasonId = oldSeason.id;
        } else {
          // Create new season
          const { data: newSeason, error: createError } = await supabaseAdmin
            .from('seasons')
            .insert({
              anime_id: animeId,
              season_number: newSeasonNumber,
              title: `Sezon ${newSeasonNumber}`,
              episode_count: episodes.length,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (createError || !newSeason) {
            throw new Error(`Failed to create season ${newSeasonNumber}: ${createError?.message || 'Unknown error'}`);
          }
          seasonId = newSeason.id;
        }
      }

      seasonIdMap[oldSeasonNumber] = seasonId;
      seasonsFixed++;
    }

    // STEP 7: Update episodes with correct season_id and season_number
    for (const [oldSeasonNumber, episodes] of Object.entries(episodesBySeason)) {
      const seasonNum = Number(oldSeasonNumber);
      const newSeasonNumber = sortedSeasonNumbers.indexOf(seasonNum) + 1;
      const seasonId = seasonIdMap[seasonNum];

      if (!seasonId) {
        errors.push(`No season ID found for season ${seasonNum}`);
        continue;
      }

      // Update all episodes in this season
      const episodeIds = episodes.map(ep => ep.id);
      
      const { error: updateError } = await supabaseAdmin
        .from('episodes')
        .update({
          season_id: seasonId,
          season_number: newSeasonNumber,
          updated_at: new Date().toISOString(),
        })
        .in('id', episodeIds);

      if (updateError) {
        errors.push(`Failed to update episodes for season ${newSeasonNumber}: ${updateError.message}`);
      } else {
        episodesReassigned += episodeIds.length;
      }
    }

    // STEP 8: Final cleanup - update all season episode_count to match reality
    for (let i = 0; i < sortedSeasonNumbers.length; i++) {
      const newSeasonNumber = i + 1;
      const seasonId = seasonIdMap[sortedSeasonNumbers[i]];
      const episodeCount = episodesBySeason[sortedSeasonNumbers[i]].length;

      if (seasonId) {
        await supabaseAdmin
          .from('seasons')
          .update({
            episode_count: episodeCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', seasonId);
      }
    }

    return {
      success: errors.length === 0,
      seasonsFixed,
      seasonsRemoved,
      episodesReassigned,
      errors,
    };
  } catch (error: any) {
    console.error('[FixSeasons] Error:', error);
    return {
      success: false,
      seasonsFixed,
      seasonsRemoved,
      episodesReassigned,
      errors: [...errors, error.message || 'Unknown error'],
    };
  }
}

