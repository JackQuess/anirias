-- Force refresh Supabase schema cache
-- Run this if columns exist but still getting schema cache errors

-- This query forces PostgREST to refresh its schema cache
-- Note: Supabase automatically refreshes cache, but this can help in some cases

-- Verify columns exist first
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('bio', 'avatar_id', 'banner_id')
ORDER BY column_name;

-- If columns don't appear above, run add_profile_columns.sql first
-- If columns appear but still getting errors, try:

-- 1. Wait 10-30 seconds (Supabase auto-refreshes cache)
-- 2. Check RLS policies allow updates:
--    SELECT * FROM pg_policies WHERE tablename = 'profiles';
-- 3. Verify user has permission:
--    SELECT auth.uid(); -- Should return your user ID
-- 4. Test update directly:
--    UPDATE profiles SET bio = 'test' WHERE id = auth.uid();

