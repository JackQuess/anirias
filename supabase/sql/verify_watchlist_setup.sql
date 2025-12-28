-- ============================================================================
-- VERIFY WATCHLIST SETUP FOR POSTGREST JOIN
-- ============================================================================
-- This script verifies that watchlist is properly configured for PostgREST
-- to resolve the join: SELECT *, anime:animes(*) FROM watchlist
-- ============================================================================

-- 1. Verify foreign key constraint exists
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'watchlist_anime_id_fkey'
  AND conrelid = 'public.watchlist'::regclass;

-- 2. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'watchlist';

-- 3. Check RLS policies for watchlist
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'watchlist';

-- 4. Verify animes table RLS policy allows SELECT
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'animes'
  AND cmd = 'SELECT';

-- 5. Test query that should work (requires authentication)
-- Note: This will only work if you're authenticated
-- SELECT 
--   w.*,
--   a.*
-- FROM watchlist w
-- LEFT JOIN animes a ON w.anime_id = a.id
-- WHERE w.user_id = auth.uid()
-- LIMIT 1;

