-- Fix existing episodes: Set season_number from seasons table
-- This is a one-time migration to fix episodes that were created without season_number
-- Run this once to fix existing broken episodes

UPDATE episodes e
SET season_number = s.season_number
FROM seasons s
WHERE e.season_id = s.id
  AND e.season_number IS NULL;

-- Verify the update
-- SELECT COUNT(*) FROM episodes WHERE season_number IS NULL;
-- Should return 0 after running the migration

