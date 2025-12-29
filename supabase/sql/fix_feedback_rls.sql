-- ============================================================================
-- ANIRIAS - FIX FEEDBACK RLS
-- RLS politikalarını düzelt ve test et
-- ============================================================================

-- Mevcut politikaları sil
DROP POLICY IF EXISTS "Only admins can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Only admins can update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Only admins can delete feedback" ON public.feedback;

-- SELECT: Sadece adminler görebilir (düzeltilmiş)
CREATE POLICY "Only admins can view feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- UPDATE: Sadece adminler
CREATE POLICY "Only admins can update feedback"
  ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- DELETE: Sadece adminler
CREATE POLICY "Only admins can delete feedback"
  ON public.feedback
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

