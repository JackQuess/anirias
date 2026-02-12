import { supabaseAdmin } from './supabaseAdmin.js';

export interface MoveEpisodesParams {
  animeId: string;
  targetSeasonId: string;
  episodeIds: string[];
  renumberMode?: 'append' | 'preserve';
}

export interface MoveEpisodesResult {
  moved: number;
  skippedConflicts: number;
  skippedAlreadyInTarget: number;
}

export async function moveEpisodesToSeason(params: MoveEpisodesParams): Promise<MoveEpisodesResult> {
  const renumberMode = params.renumberMode || 'append';
  const uniqueEpisodeIds = Array.from(new Set(params.episodeIds.filter(Boolean)));

  if (!params.animeId) throw new Error('animeId is required');
  if (!params.targetSeasonId) throw new Error('targetSeasonId is required');
  if (uniqueEpisodeIds.length === 0) throw new Error('episodeIds is required');

  const { data: targetSeason, error: targetSeasonError } = await supabaseAdmin
    .from('seasons')
    .select('id, anime_id, season_number')
    .eq('id', params.targetSeasonId)
    .maybeSingle();

  if (targetSeasonError) {
    throw new Error(`Failed to fetch target season: ${targetSeasonError.message}`);
  }
  if (!targetSeason || targetSeason.anime_id !== params.animeId) {
    throw new Error('Target season not found for this anime');
  }

  const { data: sourceEpisodes, error: sourceEpisodesError } = await supabaseAdmin
    .from('episodes')
    .select('id, anime_id, season_id, episode_number')
    .eq('anime_id', params.animeId)
    .in('id', uniqueEpisodeIds)
    .order('episode_number', { ascending: true });

  if (sourceEpisodesError) {
    throw new Error(`Failed to fetch source episodes: ${sourceEpisodesError.message}`);
  }

  const episodes = sourceEpisodes || [];
  if (episodes.length === 0) {
    return { moved: 0, skippedConflicts: 0, skippedAlreadyInTarget: 0 };
  }

  let nextEpisodeNumber = 1;
  if (renumberMode === 'append') {
    const { data: maxRow } = await supabaseAdmin
      .from('episodes')
      .select('episode_number')
      .eq('anime_id', params.animeId)
      .eq('season_id', params.targetSeasonId)
      .order('episode_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    nextEpisodeNumber = (maxRow?.episode_number || 0) + 1;
  }

  let moved = 0;
  let skippedConflicts = 0;
  let skippedAlreadyInTarget = 0;

  for (const episode of episodes) {
    if (episode.season_id === params.targetSeasonId) {
      skippedAlreadyInTarget += 1;
      continue;
    }

    const targetEpisodeNumber = renumberMode === 'append' ? nextEpisodeNumber : episode.episode_number;

    if (renumberMode === 'preserve') {
      const { data: conflictRow, error: conflictError } = await supabaseAdmin
        .from('episodes')
        .select('id')
        .eq('anime_id', params.animeId)
        .eq('season_id', params.targetSeasonId)
        .eq('episode_number', targetEpisodeNumber)
        .neq('id', episode.id)
        .maybeSingle();

      if (conflictError) {
        throw new Error(`Conflict check failed for episode ${episode.id}: ${conflictError.message}`);
      }

      if (conflictRow?.id) {
        skippedConflicts += 1;
        continue;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('episodes')
      .update({
        season_id: params.targetSeasonId,
        season_number: targetSeason.season_number,
        episode_number: targetEpisodeNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', episode.id);

    if (updateError) {
      const msg = String(updateError.message || '').toLowerCase();
      if (msg.includes('duplicate key value') || msg.includes('unique constraint')) {
        skippedConflicts += 1;
        continue;
      }
      throw new Error(`Failed to move episode ${episode.id}: ${updateError.message}`);
    }

    moved += 1;
    if (renumberMode === 'append') nextEpisodeNumber += 1;
  }

  return { moved, skippedConflicts, skippedAlreadyInTarget };
}
