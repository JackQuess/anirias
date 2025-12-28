-- ============================================================================
-- FIX WATCHLIST RLS AND STATUS CONSTRAINT
-- ============================================================================
-- This script fixes two issues:
-- 1. Enables RLS on watchlist table (required for PostgREST joins)
-- 2. Verifies/fixes status CHECK constraint
-- ============================================================================

-- STEP 1: Enable RLS on watchlist table
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- STEP 2: Verify status CHECK constraint exists and is correct
DO $$
BEGIN
  -- Check if constraint exists
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'watchlist_status_check'
      AND conrelid = 'public.watchlist'::regclass
  ) THEN
    -- Drop existing constraint to recreate with correct values
    ALTER TABLE public.watchlist
      DROP CONSTRAINT IF EXISTS watchlist_status_check;
    
    RAISE NOTICE '✓ Dropped existing watchlist_status_check constraint';
  END IF;
  
  -- Recreate constraint with correct status values
  ALTER TABLE public.watchlist
    ADD CONSTRAINT watchlist_status_check
    CHECK (status IN ('watching', 'planning', 'completed', 'dropped', 'paused'));
  
  RAISE NOTICE '✓ Created watchlist_status_check constraint with correct values';
END $$;

-- STEP 3: Ensure RLS policy exists
DROP POLICY IF EXISTS "Users manage own watchlist" ON public.watchlist;
CREATE POLICY "Users manage own watchlist" 
  ON public.watchlist FOR ALL 
  USING (auth.uid() = user_id);

-- STEP 4: Verify setup
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'watchlist';

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'watchlist_status_check'
  AND conrelid = 'public.watchlist'::regclass;

