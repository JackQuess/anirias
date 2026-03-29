-- RevenueCat / plan önbelleği. Eksikse oluşturur; 400 "column/table" hatalarını önlemek için.
-- Supabase SQL Editor'de bir kez çalıştırın.

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on user_entitlements" ON public.user_entitlements;
CREATE POLICY "Service role full access on user_entitlements"
  ON public.user_entitlements FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users read own user_entitlements" ON public.user_entitlements;
CREATE POLICY "Authenticated users read own user_entitlements"
  ON public.user_entitlements FOR SELECT TO authenticated
  USING (user_id = auth.uid());
