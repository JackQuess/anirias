-- ============================================================================
-- ANIRIAS - USER MODERATION
-- Admin panel ban and personal warning support.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_moderation (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE,
  banned_until TIMESTAMP WITH TIME ZONE,
  account_warning_message TEXT,
  account_warning_updated_at TIMESTAMP WITH TIME ZONE,
  account_warning_seen_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_moderation_is_banned
  ON public.user_moderation(is_banned)
  WHERE is_banned = true;

ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own moderation" ON public.user_moderation;
CREATE POLICY "Users can read own moderation"
  ON public.user_moderation FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read user moderation" ON public.user_moderation;
CREATE POLICY "Admins can read user moderation"
  ON public.user_moderation FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.acknowledge_account_warning()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_moderation
  SET account_warning_seen_at = NOW(),
      updated_at = NOW()
  WHERE user_id = auth.uid()
    AND account_warning_message IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_account_warning() TO authenticated;
