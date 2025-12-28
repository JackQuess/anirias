-- ============================================================================
-- DIAGNOSE NOTIFICATIONS 400 BAD REQUEST ERROR
-- ============================================================================
-- This script diagnoses the root cause of PostgREST 400 errors
-- ============================================================================

-- STEP 1: Verify table exists
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- STEP 2: Check all columns and their types
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- STEP 3: Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'notifications';

-- STEP 4: Verify referenced tables exist
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('animes', 'episodes')
ORDER BY tablename;

-- STEP 5: Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'notifications';

-- STEP 6: List all RLS policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY cmd, policyname;

-- STEP 7: Test if columns can be selected (this will show the exact error)
-- Run this as the authenticated user to see the actual error
SELECT 
  id,
  user_id,
  type,
  title,
  body,
  anime_id,
  episode_id,
  is_read,
  created_at
FROM public.notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- COMMON ISSUES AND FIXES:
-- ============================================================================
-- 
-- ISSUE 1: Column name mismatch
-- If query uses 'is_read' but column is 'read' or 'read_status'
-- FIX: ALTER TABLE notifications RENAME COLUMN <old_name> TO is_read;
--
-- ISSUE 2: Foreign key references non-existent table
-- If animes or episodes table doesn't exist
-- FIX: Either create the tables or remove the FK constraint:
--   ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_anime_id_fkey;
--   ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_episode_id_fkey;
--
-- ISSUE 3: RLS enabled but no SELECT policy
-- FIX: Run fix_notifications_rls_complete.sql
--
-- ISSUE 4: Column type mismatch
-- If user_id is not UUID type
-- FIX: ALTER TABLE notifications ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
--
-- ============================================================================

