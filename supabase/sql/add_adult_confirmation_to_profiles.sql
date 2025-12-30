-- Add is_adult_confirmed column to profiles table
-- This tracks whether user has confirmed they are 18+ for adult content

-- Add column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_adult_confirmed BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_adult_confirmed IS 
'Indicates if user has confirmed they are 18+ for adult content access. Persists across devices.';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_adult_confirmed 
ON public.profiles(is_adult_confirmed) 
WHERE is_adult_confirmed = TRUE;

-- Grant necessary permissions
-- Users can read and update their own is_adult_confirmed field
-- This is already covered by existing RLS policies, but we ensure it here

-- Verify RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can update their own profile (including is_adult_confirmed)
-- This should already exist, but we ensure it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added is_adult_confirmed column to profiles table';
END $$;

