-- ============================================================================
-- COMPLETE FIX FOR NOTIFICATIONS 400 BAD REQUEST ERROR
-- ============================================================================
-- PostgREST 400 errors are usually caused by:
-- 1. Missing columns
-- 2. Broken foreign key constraints
-- 3. Column type mismatches
-- 4. RLS policy issues (but that would be 403, not 400)
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY TABLE EXISTS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications'
  ) THEN
    RAISE EXCEPTION 'notifications table does not exist. Run create_notification_system.sql first.';
  END IF;
  RAISE NOTICE '✓ notifications table exists';
END $$;

-- ============================================================================
-- STEP 2: ENSURE ALL REQUIRED COLUMNS EXIST WITH CORRECT TYPES
-- ============================================================================
-- Required columns for the query:
-- id, user_id, type, title, body, anime_id, episode_id, is_read, created_at

-- Fix id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    RAISE NOTICE '✓ Added id column';
  ELSE
    -- Ensure it's UUID type
    ALTER TABLE public.notifications ALTER COLUMN id TYPE UUID USING id::uuid;
    RAISE NOTICE '✓ Verified id column type';
  END IF;
END $$;

-- Fix user_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL;
    RAISE NOTICE '✓ Added user_id column';
  ELSE
    -- Ensure it's UUID type and has FK
    ALTER TABLE public.notifications ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    -- Add FK if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'notifications_user_id_fkey'
    ) THEN
      ALTER TABLE public.notifications 
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    RAISE NOTICE '✓ Verified user_id column';
  END IF;
END $$;

-- Fix type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN type TEXT NOT NULL;
    RAISE NOTICE '✓ Added type column';
  ELSE
    ALTER TABLE public.notifications ALTER COLUMN type TYPE TEXT;
    RAISE NOTICE '✓ Verified type column';
  END IF;
END $$;

-- Fix title column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'title'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN title TEXT NOT NULL;
    RAISE NOTICE '✓ Added title column';
  ELSE
    ALTER TABLE public.notifications ALTER COLUMN title TYPE TEXT;
    RAISE NOTICE '✓ Verified title column';
  END IF;
END $$;

-- Fix body column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'body'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN body TEXT NOT NULL;
    RAISE NOTICE '✓ Added body column';
  ELSE
    ALTER TABLE public.notifications ALTER COLUMN body TYPE TEXT;
    RAISE NOTICE '✓ Verified body column';
  END IF;
END $$;

-- Fix anime_id column (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'anime_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN anime_id UUID;
    RAISE NOTICE '✓ Added anime_id column';
  ELSE
    ALTER TABLE public.notifications ALTER COLUMN anime_id TYPE UUID USING anime_id::uuid;
    RAISE NOTICE '✓ Verified anime_id column';
  END IF;
END $$;

-- Fix episode_id column (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'episode_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN episode_id UUID;
    RAISE NOTICE '✓ Added episode_id column';
  ELSE
    ALTER TABLE public.notifications ALTER COLUMN episode_id TYPE UUID USING episode_id::uuid;
    RAISE NOTICE '✓ Verified episode_id column';
  END IF;
END $$;

-- Fix is_read column (CRITICAL - common mismatch)
-- The column is named 'read' but query expects 'is_read'
DO $$
BEGIN
  -- Check if 'read' column exists (the actual column name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'read'
  ) THEN
    -- Rename 'read' to 'is_read' to match the query
    ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
    RAISE NOTICE '✓ Renamed read column to is_read';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'is_read'
  ) THEN
    -- Column already named is_read, just verify type
    ALTER TABLE public.notifications ALTER COLUMN is_read TYPE BOOLEAN USING is_read::boolean;
    ALTER TABLE public.notifications ALTER COLUMN is_read SET DEFAULT false;
    ALTER TABLE public.notifications ALTER COLUMN is_read SET NOT NULL;
    RAISE NOTICE '✓ Verified is_read column';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'read_status'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN read_status TO is_read;
    RAISE NOTICE '✓ Renamed read_status column to is_read';
  ELSE
    -- Column doesn't exist at all, add it
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;
    RAISE NOTICE '✓ Added is_read column';
  END IF;
END $$;

-- Fix created_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    RAISE NOTICE '✓ Added created_at column';
  ELSE
    ALTER TABLE public.notifications ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at::timestamptz;
    RAISE NOTICE '✓ Verified created_at column';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: FIX FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- PostgREST fails with 400 if FK references non-existent tables
-- Remove FKs if referenced tables don't exist

-- Fix anime_id foreign key
DO $$
BEGIN
  -- Check if animes table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'animes'
  ) THEN
    -- Remove FK constraint if it exists
    ALTER TABLE public.notifications 
      DROP CONSTRAINT IF EXISTS notifications_anime_id_fkey;
    RAISE NOTICE '⚠ Removed anime_id FK (animes table does not exist)';
  ELSE
    -- Ensure FK exists and is correct
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'notifications_anime_id_fkey'
    ) THEN
      ALTER TABLE public.notifications 
        ADD CONSTRAINT notifications_anime_id_fkey 
        FOREIGN KEY (anime_id) REFERENCES public.animes(id) ON DELETE CASCADE;
      RAISE NOTICE '✓ Added anime_id FK';
    ELSE
      RAISE NOTICE '✓ anime_id FK exists';
    END IF;
  END IF;
END $$;

-- Fix episode_id foreign key
DO $$
BEGIN
  -- Check if episodes table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'episodes'
  ) THEN
    -- Remove FK constraint if it exists
    ALTER TABLE public.notifications 
      DROP CONSTRAINT IF EXISTS notifications_episode_id_fkey;
    RAISE NOTICE '⚠ Removed episode_id FK (episodes table does not exist)';
  ELSE
    -- Ensure FK exists and is correct
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'notifications_episode_id_fkey'
    ) THEN
      ALTER TABLE public.notifications 
        ADD CONSTRAINT notifications_episode_id_fkey 
        FOREIGN KEY (episode_id) REFERENCES public.episodes(id) ON DELETE CASCADE;
      RAISE NOTICE '✓ Added episode_id FK';
    ELSE
      RAISE NOTICE '✓ episode_id FK exists';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: ENSURE RLS IS PROPERLY CONFIGURED
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate SELECT policy (exact as required)
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;

CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

DO $$
BEGIN
  RAISE NOTICE '✓ RLS policy created';
END $$;

-- ============================================================================
-- STEP 5: VERIFY COLUMN STRUCTURE
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
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
-- STEP 6: TEST QUERY (should work after fixes)
-- ============================================================================
-- This query should work without 400 errors:
-- 
-- SELECT id, user_id, type, title, body, anime_id, episode_id, is_read, created_at
-- FROM notifications
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;
--
-- ============================================================================
-- ROOT CAUSE ANALYSIS:
-- ============================================================================
-- PostgREST 400 errors occur when:
-- 1. Column doesn't exist → Fixed by ensuring all columns exist
-- 2. Column type mismatch → Fixed by casting to correct types
-- 3. Broken FK constraint → Fixed by removing FKs to non-existent tables
-- 4. Invalid query syntax → Not applicable (query is valid)
--
-- Most likely cause: Missing 'is_read' column or wrong column name
-- Second most likely: Broken FK constraint to animes/episodes tables
-- ============================================================================

