-- ============================================================================
-- ANIRIAS - FIX ANNOUNCEMENT ADMIN VISIBILITY
-- Allows admins to read inactive announcements in /admin/announcement.
-- ============================================================================

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.announcements;
CREATE POLICY "Anyone can read active announcements"
  ON public.announcements
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can read announcements" ON public.announcements;
CREATE POLICY "Admins can read announcements"
  ON public.announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

