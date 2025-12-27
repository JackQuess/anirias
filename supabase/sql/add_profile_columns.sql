-- Add missing columns to profiles table for avatar/banner selection
-- This migration adds avatar_id and banner_id columns to support the profile update feature

-- Add avatar_id column (text, nullable)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_id text;

-- Add banner_id column (text, nullable)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_id text;

-- Ensure bio column exists (should already exist, but safe to add if missing)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

-- Ensure updated_at column exists (required for update tracking)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

-- Verify columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'profiles'
--   AND column_name IN ('bio', 'avatar_id', 'banner_id', 'updated_at');

-- Note: After running this migration, Supabase schema cache should refresh automatically.
-- If columns still don't appear, you may need to:
-- 1. Wait a few seconds for cache refresh
-- 2. Or manually refresh the schema in Supabase Dashboard > Database > Tables > profiles

