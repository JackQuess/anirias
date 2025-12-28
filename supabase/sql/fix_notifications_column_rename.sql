-- ============================================================================
-- QUICK FIX: Rename 'read' column to 'is_read'
-- ============================================================================
-- ERROR: column "is_read" does not exist
-- HINT: Perhaps you meant to reference the column "notifications.read"
-- ============================================================================
-- This is the EXACT fix for the 400 error
-- ============================================================================

-- Rename the column from 'read' to 'is_read'
ALTER TABLE public.notifications 
  RENAME COLUMN read TO is_read;

-- Verify the column exists with correct name
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications' 
  AND column_name = 'is_read';

-- ============================================================================
-- After running this, the query should work:
-- ============================================================================
-- SELECT id, user_id, type, title, body, anime_id, episode_id, is_read, created_at
-- FROM notifications
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;
-- ============================================================================

