-- ============================================================================
-- CHECK WATCHLIST STATUS CONSTRAINT FULL DEFINITION
-- ============================================================================
-- This script shows the complete constraint definition to verify all values
-- ============================================================================

-- Show full constraint definition
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS full_constraint_definition
FROM pg_constraint
WHERE conname = 'watchlist_status_check'
  AND conrelid = 'public.watchlist'::regclass;

-- Also check what values are currently allowed
SELECT 
  conname,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.watchlist'::regclass
  AND contype = 'c'  -- Check constraints only
ORDER BY conname;

-- Test what status values would be accepted
-- This will show if there's a mismatch
SELECT 
  'watching'::text AS test_value,
  'watching'::text = ANY(ARRAY['watching'::text, 'planning'::text, 'completed'::text, 'dropped'::text, 'paused'::text]) AS is_valid
UNION ALL
SELECT 'planning'::text, 'planning'::text = ANY(ARRAY['watching'::text, 'planning'::text, 'completed'::text, 'dropped'::text, 'paused'::text])
UNION ALL
SELECT 'completed'::text, 'completed'::text = ANY(ARRAY['watching'::text, 'planning'::text, 'completed'::text, 'dropped'::text, 'paused'::text])
UNION ALL
SELECT 'dropped'::text, 'dropped'::text = ANY(ARRAY['watching'::text, 'planning'::text, 'completed'::text, 'dropped'::text, 'paused'::text])
UNION ALL
SELECT 'paused'::text, 'paused'::text = ANY(ARRAY['watching'::text, 'planning'::text, 'completed'::text, 'dropped'::text, 'paused'::text]);

