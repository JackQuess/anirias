-- ============================================================================
-- ADD anilist_id COLUMN TO seasons TABLE
-- ============================================================================
-- This migration safely adds the anilist_id column if it doesn't exist
-- Required for AniList season binding functionality
-- ============================================================================

DO $$
BEGIN
  -- Check if column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seasons'
      AND column_name = 'anilist_id'
  ) THEN
    ALTER TABLE public.seasons
      ADD COLUMN anilist_id INTEGER;
    
    RAISE NOTICE '✓ Added anilist_id column to seasons table';
  ELSE
    RAISE NOTICE '✓ anilist_id column already exists in seasons table';
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_seasons_anilist_id 
ON public.seasons(anilist_id) 
WHERE anilist_id IS NOT NULL;

-- Verify the column was added
DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seasons'
      AND column_name = 'anilist_id'
  ) INTO col_exists;
  
  IF col_exists THEN
    RAISE NOTICE '✓ Verification: anilist_id column exists';
  ELSE
    RAISE WARNING '✗ Verification: anilist_id column NOT found';
  END IF;
END $$;

