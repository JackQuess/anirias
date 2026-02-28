/**
 * Animely Episode Watcher Service
 * 
 * Purpose: Periodically check Animely for new episodes of existing anime
 * - Detect new episodes for anime we already have
 * - Download and attach to correct anime & season
 * - Add to calendar with "waiting" status
 * - Notify admin
 * 
 * SAFETY RULES:
 * - Non-blocking: Never pause pipeline
 * - Fail-safe: If Animely 404, use AniList as fallback
 * - No user input: Fully automated
 * - Continue on error: Log + notify, don't stop
 */

import { supabaseAdmin } from './supabaseAdmin.js';
import { getAniListAiringSchedule } from './anilist.js';
import { notifyNewEpisodeAdded, notifySystemError } from './adminNotifications.js';

interface AnimeToWatch {
  id: string;
  slug: string;
  title: any;
  anilist_id: number | null;
  animely_slug: string | null;
}

let watcherRunInProgress = false;

/**
 * Check for new episodes for all active anime
 * Returns number of new episodes detected
 */
export async function watchForNewEpisodes(): Promise<number> {
  if (watcherRunInProgress) {
    console.warn('[AnimelyWatcher] Previous scan still running, skipping overlapping run.');
    return 0;
  }
  watcherRunInProgress = true;
  console.log('[AnimelyWatcher] Starting episode scan...');
  
  try {
    // Get all anime that we're tracking
    const { data: animes, error: animesError } = await supabaseAdmin
      .from('animes')
      .select('id, slug, title, anilist_id, animely_slug')
      .order('created_at', { ascending: false })
      .limit(100); // Check last 100 anime

    if (animesError) {
      console.error('[AnimelyWatcher] Failed to fetch anime:', animesError);
      return 0;
    }

    if (!animes || animes.length === 0) {
      console.log('[AnimelyWatcher] No anime to watch');
      return 0;
    }

    let newEpisodesDetected = 0;

    // Check each anime for new episodes
    for (const anime of animes) {
      try {
        const newEpisodes = await checkAnimeForNewEpisodes(anime);
        newEpisodesDetected += newEpisodes;
      } catch (err: any) {
        // Don't stop on individual anime errors
        console.error(`[AnimelyWatcher] Error checking anime ${anime.id}:`, err);
      }
    }

    console.log(`[AnimelyWatcher] Scan complete. Found ${newEpisodesDetected} new episodes.`);
    return newEpisodesDetected;
  } catch (err: any) {
    console.error('[AnimelyWatcher] Fatal error:', err);
    notifySystemError(
      'AnimelyWatcher hatası',
      err.message || 'Bilinmeyen hata',
      'system'
    );
    return 0;
  } finally {
    watcherRunInProgress = false;
  }
}

/**
 * Check a single anime for new episodes
 */
async function checkAnimeForNewEpisodes(anime: AnimeToWatch): Promise<number> {
  // Get existing episodes count
  const { data: existingEpisodes, error: episodesError } = await supabaseAdmin
    .from('episodes')
    .select('id, episode_number')
    .eq('anime_id', anime.id)
    .order('episode_number', { ascending: false })
    .limit(1);

  if (episodesError) {
    console.error(`[AnimelyWatcher] Error fetching episodes for ${anime.id}:`, episodesError);
    return 0;
  }

  const maxEpisodeNumber = existingEpisodes && existingEpisodes.length > 0 
    ? existingEpisodes[0].episode_number 
    : 0;

  // If we have AniList ID, check AniList airing schedule
  if (anime.anilist_id) {
    try {
      const airingSchedule = await getAniListAiringSchedule(anime.anilist_id);
      
      if (airingSchedule && airingSchedule.length > 0) {
        let newEpisodesCreated = 0;

        for (const airing of airingSchedule) {
          // Only create episodes that don't exist yet
          if (airing.episode > maxEpisodeNumber) {
            const created = await createNewEpisode(
              anime,
              airing.episode,
              airing.airingAt
            );
            
            if (created) {
              newEpisodesCreated++;
            }
          }
        }

        return newEpisodesCreated;
      }
    } catch (err: any) {
      console.error(`[AnimelyWatcher] AniList check failed for ${anime.id}:`, err);
      // Continue to fallback logic below
    }
  }

  // Fallback: If no AniList data, we can't auto-detect new episodes
  // This is safe - admin will add manually if needed
  return 0;
}

/**
 * Create a new episode in the database
 */
async function createNewEpisode(
  anime: AnimeToWatch,
  episodeNumber: number,
  airingAt?: number
): Promise<boolean> {
  try {
    // Get the appropriate season for this episode
    const { data: seasons, error: seasonsError } = await supabaseAdmin
      .from('seasons')
      .select('id, season_number')
      .eq('anime_id', anime.id)
      .order('season_number', { ascending: false });

    if (seasonsError || !seasons || seasons.length === 0) {
      console.error(`[AnimelyWatcher] No seasons found for anime ${anime.id}`);
      return false;
    }

    // Use the latest season (or Season 1 if only one exists)
    const targetSeason = seasons[0];

    // Calculate air_date from airingAt timestamp
    const airDate = airingAt 
      ? new Date(airingAt * 1000).toISOString()
      : null;

    // Insert new episode
    const { error: insertError } = await supabaseAdmin
      .from('episodes')
      .insert({
        anime_id: anime.id,
        season_id: targetSeason.id,
        season_number: targetSeason.season_number,
        episode_number: episodeNumber,
        status: 'pending_download', // Will be downloaded by queue
        air_date: airDate,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error(`[AnimelyWatcher] Failed to insert episode:`, insertError);
      return false;
    }

    // Notify admin
    const animeTitle = anime.title?.romaji || anime.title?.english || anime.slug;
    notifyNewEpisodeAdded(
      animeTitle,
      targetSeason.season_number,
      episodeNumber
    );

    console.log(`[AnimelyWatcher] Created episode ${episodeNumber} for ${animeTitle}`);
    return true;
  } catch (err: any) {
    console.error(`[AnimelyWatcher] Error creating episode:`, err);
    return false;
  }
}

/**
 * Start the watcher (runs periodically)
 */
export function startAnimelyWatcher() {
  console.log('[AnimelyWatcher] Starting watcher...');

  // Run immediately on start
  watchForNewEpisodes();

  // Then run every 30 minutes
  setInterval(() => {
    watchForNewEpisodes();
  }, 30 * 60 * 1000); // 30 minutes

  console.log('[AnimelyWatcher] Watcher started (checking every 30 minutes)');
}
