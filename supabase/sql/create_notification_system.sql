-- ============================================================================
-- NOTIFICATION SYSTEM - Complete Implementation
-- ============================================================================
-- This script creates the notification system for new episode alerts
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_episode', 'admin', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_anime_id ON public.notifications(anime_id) WHERE anime_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_episode_id ON public.notifications(episode_id) WHERE episode_id IS NOT NULL;

-- ============================================================================
-- 2. ANIME FOLLOWS TABLE (Follow System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anime_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, anime_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_anime_follows_user_id ON public.anime_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_anime_follows_anime_id ON public.anime_follows(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_follows_user_anime ON public.anime_follows(user_id, anime_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage own follows" ON public.anime_follows;

-- Notifications: Users can only read their own notifications
CREATE POLICY "Users can read own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

-- Notifications: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- Notifications: Service role (backend) can insert notifications
-- This allows backend to create notifications without user authentication
CREATE POLICY "Service role can insert notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true); -- Backend uses service role, so this will work

-- Anime Follows: Users can manage their own follows
CREATE POLICY "Users can manage own follows" 
  ON public.anime_follows FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. FUNCTION: Create notifications for new episode
-- ============================================================================
-- This function will be called by the backend when an episode becomes ready

CREATE OR REPLACE FUNCTION public.create_episode_notifications(
  p_anime_id UUID,
  p_episode_id UUID,
  p_episode_number INTEGER,
  p_season_number INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to insert notifications
AS $$
DECLARE
  v_anime_title TEXT;
  v_follower_count INTEGER;
BEGIN
  -- Get anime title
  SELECT 
    CASE 
      WHEN title::text IS NOT NULL THEN title->>'romaji'
      WHEN title->>'english' IS NOT NULL THEN title->>'english'
      ELSE 'Anime'
    END
  INTO v_anime_title
  FROM public.animes
  WHERE id = p_anime_id;

  -- If anime title not found, use default
  IF v_anime_title IS NULL OR v_anime_title = '' THEN
    v_anime_title := 'Anime';
  END IF;

  -- Insert notifications for all users following this anime
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
    af.user_id,
    'new_episode'::TEXT,
    'Yeni Bölüm Eklendi 🎉',
    v_anime_title || ' - Bölüm ' || p_episode_number || 
    CASE WHEN p_season_number > 1 THEN ' (Sezon ' || p_season_number || ')' ELSE '' END,
    p_anime_id,
    p_episode_id,
    false,
    timezone('utc'::text, now())
  FROM public.anime_follows af
  WHERE af.anime_id = p_anime_id;

  -- Get count of inserted notifications
  GET DIAGNOSTICS v_follower_count = ROW_COUNT;

  RETURN v_follower_count;
END;
$$;

-- ============================================================================
-- 5. ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================================================
-- Supabase Realtime will automatically detect INSERT events on this table
-- No additional configuration needed if Realtime is enabled in Supabase dashboard

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Ensure Supabase Realtime is enabled for 'notifications' table in dashboard
-- 3. Backend will call create_episode_notifications() when episode status = 'ready'
-- 4. Frontend will subscribe to Realtime changes on notifications table
-- ============================================================================

