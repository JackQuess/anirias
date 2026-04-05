-- ============================================================================
-- Bölüm hazır olduğunda bildirim: anime_follows + watchlist
-- ============================================================================
-- "Yakında eklenecek" iken video eklenince backend create_episode_notifications
-- çağırır; önceden sadece takipçiler (anime_follows) alıyordu. Listede (watchlist)
-- anime olan kullanıcılar da aynı new_episode bildirimini alır.
-- Aynı bölüm için tekrarlanan INSERT'leri yutmak için kısmi unique indeks.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_episode_unique
  ON public.notifications (user_id, episode_id, type)
  WHERE episode_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_episode_notifications(
  p_anime_id UUID,
  p_episode_id UUID,
  p_episode_number INTEGER,
  p_season_number INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anime_title TEXT;
  v_inserted INTEGER;
BEGIN
  SELECT
    CASE
      WHEN title::text IS NOT NULL THEN title->>'romaji'
      WHEN title->>'english' IS NOT NULL THEN title->>'english'
      ELSE 'Anime'
    END
  INTO v_anime_title
  FROM public.animes
  WHERE id = p_anime_id;

  IF v_anime_title IS NULL OR v_anime_title = '' THEN
    v_anime_title := 'Anime';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    anime_id,
    episode_id,
    is_read,
    created_at
  )
  SELECT
    s.user_id,
    'new_episode'::TEXT,
    'Yeni Bölüm Eklendi 🎉',
    v_anime_title || ' - Bölüm ' || p_episode_number ||
    CASE WHEN p_season_number > 1 THEN ' (Sezon ' || p_season_number || ')' ELSE '' END,
    p_anime_id,
    p_episode_id,
    false,
    timezone('utc'::text, now())
  FROM (
    SELECT af.user_id
    FROM public.anime_follows af
    WHERE af.anime_id = p_anime_id
    UNION
    SELECT w.user_id
    FROM public.watchlist w
    WHERE w.anime_id = p_anime_id
  ) AS s(user_id)
  ON CONFLICT (user_id, episode_id, type)
    WHERE episode_id IS NOT NULL
    DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.create_episode_notifications(UUID, UUID, INTEGER, INTEGER) IS
  'Yeni hazır bölüm için anime_follows ve watchlist kullanıcılarına new_episode bildirimi.';
