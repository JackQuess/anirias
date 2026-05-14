-- ============================================================================
-- ANIRIAS - TEAM APPLICATIONS
-- Separate application workflow for /ekibe-katil submissions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  site_username TEXT,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  discord_or_social TEXT,
  role_interests TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  weekly_availability TEXT NOT NULL,
  skills_text TEXT NOT NULL,
  previous_experience TEXT,
  contribution_plan TEXT NOT NULL,
  operations_scenario TEXT NOT NULL,
  review_process_answer TEXT NOT NULL,
  trial_task_preference TEXT NOT NULL,
  trial_task_answer TEXT NOT NULL,
  conflict_scenario TEXT NOT NULL,
  motivation_text TEXT NOT NULL,
  ack_volunteer_basis BOOLEAN DEFAULT false NOT NULL,
  ack_admin_review BOOLEAN DEFAULT false NOT NULL,
  ack_limited_access BOOLEAN DEFAULT false NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (
    status IN ('pending', 'contacted', 'trial_assigned', 'accepted', 'rejected', 'archived')
  ),
  admin_notes TEXT,
  trial_task_assigned TEXT,
  trial_score INTEGER CHECK (trial_score IS NULL OR (trial_score >= 0 AND trial_score <= 100)),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_applications_created_at
  ON public.team_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_applications_status
  ON public.team_applications(status);

CREATE INDEX IF NOT EXISTS idx_team_applications_user_id
  ON public.team_applications(user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit team applications" ON public.team_applications;
CREATE POLICY "Anyone can submit team applications"
  ON public.team_applications
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read team applications" ON public.team_applications;
CREATE POLICY "Admins can read team applications"
  ON public.team_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update team applications" ON public.team_applications;
CREATE POLICY "Admins can update team applications"
  ON public.team_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete team applications" ON public.team_applications;
CREATE POLICY "Admins can delete team applications"
  ON public.team_applications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.update_team_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_team_applications_updated_at ON public.team_applications;
CREATE TRIGGER update_team_applications_updated_at
  BEFORE UPDATE ON public.team_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_applications_updated_at();
