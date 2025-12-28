-- ============================================================================
-- FIX WATCHLIST FOREIGN KEY CONSTRAINT
-- ============================================================================
-- This script ensures the watchlist table has the correct foreign key
-- constraint for anime_id -> animes.id, which is required for PostgREST
-- to resolve the join relationship in queries like:
-- SELECT *, anime:animes(*) FROM watchlist
-- ============================================================================

DO $$
BEGIN
  -- Check if foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'watchlist_anime_id_fkey'
      AND conrelid = 'public.watchlist'::regclass
  ) THEN
    -- Add foreign key constraint if it doesn't exist
    ALTER TABLE public.watchlist
      ADD CONSTRAINT watchlist_anime_id_fkey
      FOREIGN KEY (anime_id) 
      REFERENCES public.animes(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✓ Added foreign key constraint watchlist_anime_id_fkey';
  ELSE
    RAISE NOTICE '✓ Foreign key constraint watchlist_anime_id_fkey already exists';
  END IF;
END $$;

-- Verify the constraint exists
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'watchlist_anime_id_fkey'
  AND conrelid = 'public.watchlist'::regclass;

