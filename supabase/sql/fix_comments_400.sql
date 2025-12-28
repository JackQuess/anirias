-- ============================================================================
-- FIX COMMENTS 400 ERROR - PostgREST Embedded Relation
-- ============================================================================
-- Problem: GET /rest/v1/comments?select=*,profiles:profiles(...) returns 400
-- Cause: Missing FK from comments.user_id -> profiles.id
-- Solution: Add FK constraint and ensure RLS allows SELECT
-- ============================================================================

-- Step 1: Add FK constraint from comments.user_id to profiles.id
-- Note: profiles.id = auth.users.id, so this is valid
DO $$
BEGIN
  -- Check if FK already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'comments'
      AND constraint_name = 'comments_user_id_profiles_fkey'
  ) THEN
    -- Add FK constraint
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✓ Added FK constraint: comments.user_id -> profiles.id';
  ELSE
    RAISE NOTICE '✓ FK constraint already exists';
  END IF;
END $$;

-- Step 2: Add index on comments.user_id for better join performance
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Step 3: Ensure RLS policies allow SELECT on comments
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- Create RLS policies
-- Policy 1: Everyone can read comments (public read access)
CREATE POLICY "Comments are viewable by everyone"
ON public.comments
FOR SELECT
USING (true);

-- Policy 2: Authenticated users can insert their own comments
CREATE POLICY "Users can insert own comments"
ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.comments
FOR DELETE
USING (auth.uid() = user_id);

-- Step 4: Verify the FK constraint exists
DO $$
DECLARE
  fk_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'comments'
      AND constraint_name = 'comments_user_id_profiles_fkey'
  ) INTO fk_exists;
  
  IF fk_exists THEN
    RAISE NOTICE '✓ Verification: FK constraint exists';
  ELSE
    RAISE WARNING '✗ Verification: FK constraint NOT found';
  END IF;
END $$;

-- Step 5: Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'comments'
      AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS is enabled on comments table';
  ELSE
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✓ Enabled RLS on comments table';
  END IF;
END $$;

-- ============================================================================
-- TEST QUERY (for manual verification)
-- ============================================================================
-- This query should work after running this migration:
-- GET /rest/v1/comments?select=*,profiles:profiles(username,avatar_id)&anime_id=eq.{uuid}&episode_id=eq.{uuid}&order=created_at.desc
-- ============================================================================

