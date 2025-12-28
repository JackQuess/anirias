-- ============================================================================
-- COMPLETE FIX FOR NOTIFICATIONS RLS - PRODUCTION READY
-- ============================================================================
-- This script completely fixes RLS policies for notifications table
-- Run this in Supabase SQL Editor if you're getting 403 Forbidden errors
-- ============================================================================

-- STEP 1: Verify table exists and RLS is enabled
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on notifications table';
  ELSE
    RAISE EXCEPTION 'notifications table does not exist';
  END IF;
END $$;

-- STEP 2: Drop ALL existing policies on notifications (clean slate)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- STEP 3: Create correct SELECT policy (users can read their own notifications)
CREATE POLICY "Users can read own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- STEP 4: Create UPDATE policy (users can mark their own notifications as read)
CREATE POLICY "Users can update own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- STEP 5: Create INSERT policy (service role can insert - though it bypasses RLS anyway)
CREATE POLICY "Service role can insert notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true);

-- STEP 6: Create DELETE policy (users can delete their own notifications)
CREATE POLICY "Users can delete own notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- STEP 7: Verify policies were created
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY cmd, policyname;

-- STEP 8: Test query (should work if you're authenticated)
-- Uncomment and run this while logged in to test:
-- SELECT COUNT(*) FROM notifications WHERE user_id = auth.uid();

-- ============================================================================
-- ANIME_FOLLOWS TABLE - Also fix this while we're at it
-- ============================================================================

-- Enable RLS on anime_follows
ALTER TABLE public.anime_follows ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'anime_follows'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.anime_follows', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Create policies for anime_follows
CREATE POLICY "Users can read own follows" 
  ON public.anime_follows 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own follows" 
  ON public.anime_follows 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows" 
  ON public.anime_follows 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this script:
-- 1. Refresh your browser/app
-- 2. Try accessing notifications again
-- 3. If still getting 403, check:
--    - Are you authenticated? (auth.uid() must return a value)
--    - Is the user_id in notifications matching auth.uid()?
--    - Check Supabase Dashboard > Authentication > Policies to see if policies are there
-- ============================================================================

