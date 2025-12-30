-- ============================================================================
-- UPDATE NOTIFICATIONS TABLE FOR EPISODE AIRING NOTIFICATIONS
-- ============================================================================
-- Adds support for 'upcoming' and 'released' notification types
-- Adds scheduled_at field for future notifications
-- ============================================================================

-- Update notification type constraint to include new types
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('new_episode', 'admin', 'system', 'upcoming', 'released'));

-- Add scheduled_at column if it doesn't exist
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Create index for scheduled notifications
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at 
  ON public.notifications(scheduled_at) 
  WHERE scheduled_at IS NOT NULL;

-- Create unique constraint to prevent duplicate notifications per user/episode
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_episode_unique 
  ON public.notifications(user_id, episode_id, type) 
  WHERE episode_id IS NOT NULL;

-- ============================================================================
-- FUNCTION: Create episode airing notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_episode_airing_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_count INTEGER := 0;
  v_row_count INTEGER := 0;
  v_episode RECORD;
  v_anime_title TEXT;
  v_user_id UUID;
  v_now TIMESTAMP WITH TIME ZONE;
  v_thirty_minutes_later TIMESTAMP WITH TIME ZONE;
BEGIN
  v_now := timezone('utc'::text, now());
  v_thirty_minutes_later := v_now + INTERVAL '30 minutes';

  -- Process upcoming episodes (airing_at between now and 30 minutes later)
  FOR v_episode IN
    SELECT 
      e.id as episode_id,
      e.anime_id,
      e.season_number,
      e.episode_number,
      e.air_date,
      a.title as anime_title
    FROM public.episodes e
    INNER JOIN public.seasons s ON s.id = e.season_id
    INNER JOIN public.animes a ON a.id = s.anime_id
    WHERE e.air_date IS NOT NULL
      AND e.air_date > v_now
      AND e.air_date <= v_thirty_minutes_later
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.episode_id = e.id
          AND n.type = 'upcoming'
      )
  LOOP
    -- Get anime title
    v_anime_title := COALESCE(
      (v_episode.anime_title->>'romaji'),
      (v_episode.anime_title->>'english'),
      'Anime'
    );

    -- Create notifications for all users following this anime OR all users if global notifications enabled
    -- For now, we'll notify all users who follow the anime
    -- In the future, we can add a global_notifications_enabled flag
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      anime_id,
      episode_id,
      is_read,
      created_at,
      scheduled_at
    )
    SELECT 
      af.user_id,
      'upcoming'::TEXT,
      'Yaklaşan bölüm 🎬',
      v_anime_title || ' – Sezon ' || COALESCE(v_episode.season_number::TEXT, '1') || ', Bölüm ' || v_episode.episode_number || E'\n30 dakika sonra yayında!',
      v_episode.anime_id,
      v_episode.episode_id,
      false,
      v_now,
      v_episode.air_date
    FROM public.anime_follows af
    WHERE af.anime_id = v_episode.anime_id
    ON CONFLICT (user_id, episode_id, type) DO NOTHING;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_notification_count := v_notification_count + v_row_count;
  END LOOP;

  -- Process released episodes (airing_at <= now and status is 'released' or 'published')
  FOR v_episode IN
    SELECT 
      e.id as episode_id,
      e.anime_id,
      e.season_number,
      e.episode_number,
      e.air_date,
      e.status,
      a.title as anime_title
    FROM public.episodes e
    INNER JOIN public.seasons s ON s.id = e.season_id
    INNER JOIN public.animes a ON a.id = s.anime_id
    WHERE e.air_date IS NOT NULL
      AND e.air_date <= v_now
      AND (e.status = 'released' OR e.status = 'published' OR e.status = 'airing')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.episode_id = e.id
          AND n.type = 'released'
      )
  LOOP
    -- Get anime title
    v_anime_title := COALESCE(
      (v_episode.anime_title->>'romaji'),
      (v_episode.anime_title->>'english'),
      'Anime'
    );

    -- Create notifications for all users following this anime
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      anime_id,
      episode_id,
      is_read,
      created_at,
      scheduled_at
    )
    SELECT 
      af.user_id,
      'released'::TEXT,
      'Yeni bölüm yayında 🔥',
      v_anime_title || ' – Sezon ' || COALESCE(v_episode.season_number::TEXT, '1') || ', Bölüm ' || v_episode.episode_number || E'\nHemen izle!',
      v_episode.anime_id,
      v_episode.episode_id,
      false,
      v_now,
      v_episode.air_date
    FROM public.anime_follows af
    WHERE af.anime_id = v_episode.anime_id
    ON CONFLICT (user_id, episode_id, type) DO NOTHING;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_notification_count := v_notification_count + v_row_count;
  END LOOP;

  RETURN v_notification_count;
END;
$$;

