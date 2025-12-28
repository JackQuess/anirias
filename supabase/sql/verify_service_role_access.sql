-- ============================================================================
-- VERIFY SERVICE ROLE ACCESS
-- ============================================================================
-- This script checks if service role can access tables and verifies RLS setup
-- ============================================================================

-- Check RLS status on critical tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('animes', 'episodes', 'seasons', 'notifications', 'anime_follows')
ORDER BY tablename;

-- Check if there are any policies that might block service role
-- Service role should bypass RLS, but let's verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('animes', 'episodes', 'seasons')
ORDER BY tablename, policyname;

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. Service role (using SUPABASE_SERVICE_ROLE_KEY) should BYPASS RLS automatically
-- 2. If service role is getting "permission denied", check:
--    a) Is SUPABASE_SERVICE_ROLE_KEY set correctly in Railway/production?
--    b) Is the key the correct service_role key from Supabase Dashboard?
--    c) Are there any database-level permissions blocking the service role?
--
-- 3. To verify service role key:
--    - Go to Supabase Dashboard > Settings > API
--    - Copy the "service_role" key (NOT the anon key)
--    - Set it as SUPABASE_SERVICE_ROLE_KEY in Railway environment variables
--
-- 4. Service role should NEVER be blocked by RLS policies
--    If it is, there's a configuration issue with the key or Supabase setup
-- ============================================================================

-- Test query that service role should be able to run
-- (This will fail if run as anon user, but should work for service role)
SELECT COUNT(*) as anime_count FROM public.animes;
SELECT COUNT(*) as episode_count FROM public.episodes;
SELECT COUNT(*) as season_count FROM public.seasons;

