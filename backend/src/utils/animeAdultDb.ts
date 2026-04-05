import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * AniList yaş etiketini yazar: önce anilist_content_rating, sonra legacy rating (metin),
 * ikisi de yoksa veya tip uyuşmazsa sadece is_adult + updated_at.
 */
export async function updateAnimeAdultMetadata(
  sb: SupabaseClient,
  animeId: string,
  input: {
    is_adult: boolean;
    /** R18+, Ecchi vb.; null/undefined = etiket alanlarını dokunma */
    contentLabel?: string | null;
    anilistIdBackfill?: number | null;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base: Record<string, unknown> = {
    is_adult: input.is_adult,
    updated_at: new Date().toISOString(),
  };
  if (input.anilistIdBackfill != null && Number.isFinite(input.anilistIdBackfill)) {
    base.anilist_id = input.anilistIdBackfill;
  }

  const label =
    input.contentLabel !== undefined && input.contentLabel !== null && String(input.contentLabel).trim()
      ? String(input.contentLabel).trim()
      : null;

  const attempts: Record<string, unknown>[] = [];
  if (label) {
    attempts.push({ ...base, anilist_content_rating: label });
    attempts.push({ ...base, rating: label });
  }
  attempts.push(base);

  let lastMsg = '';
  for (const patch of attempts) {
    const { error } = await sb.from('animes').update(patch).eq('id', animeId);
    if (!error) return { ok: true };
    lastMsg = error.message || String(error);
    const retry =
      /column .* does not exist|42703|Could not find the 'anilist_content_rating'|anilist_content_rating/i.test(lastMsg) ||
      /invalid input syntax for type integer|rating/i.test(lastMsg);
    if (!retry) return { ok: false, message: lastMsg };
  }

  return { ok: false, message: lastMsg || 'Anime adult metadata update failed' };
}
