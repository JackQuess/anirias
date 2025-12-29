-- ============================================================================
-- ANIRIAS - FEEDBACK SYSTEM
-- Feedback tablosu ve RLS politikaları
-- ============================================================================

-- FEEDBACK TABLOSU
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Guest feedback için nullable
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 yıldız
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id) WHERE user_id IS NOT NULL;

-- RLS ENABLE
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
-- 1. INSERT: Herkes feedback gönderebilir (guest dahil)
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 2. SELECT: Sadece adminler görebilir
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

-- 3. UPDATE/DELETE: Sadece adminler (opsiyonel, şimdilik sadece görüntüleme)
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

