-- ============================================================================
-- SIMPLE FIX: Rename 'read' column to 'is_read'
-- ============================================================================
-- Run this FIRST before running any other fix scripts
-- ============================================================================

-- Step 1: Check if 'read' column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'read'
  ) THEN
    -- Rename it to is_read
    ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
    RAISE NOTICE '✓ Successfully renamed read column to is_read';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'is_read'
  ) THEN
    RAISE NOTICE '✓ Column is_read already exists';
  ELSE
    -- Column doesn't exist, add it
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;
    RAISE NOTICE '✓ Added is_read column';
  END IF;
END $$;

-- Step 2: Verify the column exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications' 
  AND column_name IN ('read', 'is_read')
ORDER BY column_name;

-- ============================================================================
-- After running this, the query should work:
-- ============================================================================
-- SELECT id, user_id, type, title, body, anime_id, episode_id, is_read, created_at
-- FROM notifications
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;
-- ============================================================================

