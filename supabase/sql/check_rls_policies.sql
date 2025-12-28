-- ============================================================================
-- CHECK CURRENT RLS POLICIES
-- Mevcut RLS policy'lerini kontrol et
-- ============================================================================

-- Tüm tablolar için mevcut policy'leri göster
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
  AND tablename IN ('animes', 'seasons', 'episodes', 'watchlist', 'watch_progress', 'watch_history', 'profiles', 'comments')
ORDER BY tablename, policyname;

-- Episodes tablosu için özellikle SELECT policy'lerini kontrol et
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'episodes'
  AND cmd = 'SELECT';

-- Seasons tablosu için SELECT policy'lerini kontrol et
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'seasons'
  AND cmd = 'SELECT';

-- Animes tablosu için SELECT policy'lerini kontrol et
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'animes'
  AND cmd = 'SELECT';

