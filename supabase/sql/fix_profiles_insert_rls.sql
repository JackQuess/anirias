-- Fix Profiles RLS Policy for INSERT
-- This allows users to create their own profile if it doesn't exist
-- Required for upsert operations when profile is missing

-- Enable RLS (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create INSERT policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Ensure UPDATE policy exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure SELECT policy exists (public read)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles
  FOR SELECT
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully fixed profiles RLS policies for INSERT/UPDATE/SELECT';
END $$;

