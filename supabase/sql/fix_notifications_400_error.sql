-- ============================================================================
-- FIX NOTIFICATIONS 400 BAD REQUEST ERROR
-- ============================================================================
-- This script fixes the most common causes of PostgREST 400 errors
-- ============================================================================

-- STEP 1: Ensure table exists with correct structure
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

-- STEP 2: Fix column names if they don't match (common issue)
-- Check if 'is_read' column exists, if not, create it or rename existing
DO $$
BEGIN
  -- If column doesn't exist, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'is_read'
  ) THEN
    -- Check if there's a similar column (read, read_status, etc.)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'read'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'read_status'
    ) THEN
      ALTER TABLE public.notifications RENAME COLUMN read_status TO is_read;
    ELSE
      -- Add the column if it doesn't exist at all
      ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;
    END IF;
  END IF;
END $$;

-- STEP 3: Fix foreign key constraints if referenced tables don't exist
-- Remove FK constraints if tables don't exist (PostgREST fails on broken FKs)
DO $$
BEGIN
  -- Check if animes table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'animes'
  ) THEN
    -- Remove anime_id foreign key
    ALTER TABLE public.notifications 
      DROP CONSTRAINT IF EXISTS notifications_anime_id_fkey;
    RAISE NOTICE 'Removed anime_id foreign key (animes table does not exist)';
  END IF;

  -- Check if episodes table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'episodes'
  ) THEN
    -- Remove episode_id foreign key
    ALTER TABLE public.notifications 
      DROP CONSTRAINT IF EXISTS notifications_episode_id_fkey;
    RAISE NOTICE 'Removed episode_id foreign key (episodes table does not exist)';
  END IF;
END $$;

-- STEP 4: Ensure all required columns exist with correct types
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'anime_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN anime_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'episode_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN episode_id UUID;
  END IF;
END $$;

-- STEP 5: Ensure RLS is properly configured
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate SELECT policy
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;

CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- STEP 6: Verify column structure matches query
-- This query should work after the fixes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND column_name IN ('id', 'user_id', 'type', 'title', 'body', 'anime_id', 'episode_id', 'is_read', 'created_at')
ORDER BY 
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'user_id' THEN 2
    WHEN 'type' THEN 3
    WHEN 'title' THEN 4
    WHEN 'body' THEN 5
    WHEN 'anime_id' THEN 6
    WHEN 'episode_id' THEN 7
    WHEN 'is_read' THEN 8
    WHEN 'created_at' THEN 9
  END;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this script, test the query:
--
-- SELECT id, user_id, type, title, body, anime_id, episode_id, is_read, created_at
-- FROM notifications
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;
--
-- This should work without 400 errors.
-- ============================================================================

