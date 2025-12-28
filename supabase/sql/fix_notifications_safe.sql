-- ============================================================================
-- SAFE FIX FOR NOTIFICATIONS 400 ERROR
-- ============================================================================
-- This script handles RLS policy dependencies correctly
-- ============================================================================

-- STEP 1: Rename 'read' to 'is_read' (most common issue)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'read'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
    RAISE NOTICE '✓ Renamed read column to is_read';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'is_read'
  ) THEN
    RAISE NOTICE '✓ Column is_read already exists';
  ELSE
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;
    RAISE NOTICE '✓ Added is_read column';
  END IF;
END $$;

-- STEP 2: Ensure RLS policy exists (drop and recreate to be safe)
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- STEP 3: Verify column structure
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
-- After running this, test the query:
-- ============================================================================
-- SELECT id, user_id, type, title, body, anime_id, episode_id, is_read, created_at
-- FROM notifications
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;
-- ============================================================================

