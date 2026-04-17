-- Yorum şikayeti + yumuşak silme (silinen yorumlar admin/service role ile görülebilir)
-- Supabase SQL Editor'da bir kez çalıştırın.

-- 1) comments: soft delete alanları
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_kind TEXT CHECK (deleted_kind IS NULL OR deleted_kind IN ('user', 'admin', 'report'));

CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments(deleted_at DESC) WHERE deleted_at IS NOT NULL;

-- 2) Şikayetler (kullanıcı başına yorum başına tek kayıt)
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'other',
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON public.comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON public.comment_reports(created_at DESC);

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment reports insert own" ON public.comment_reports;
CREATE POLICY "Comment reports insert own"
  ON public.comment_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

-- Şikayetleri sadece backend (service role) okur; anon/authenticated SELECT yok

-- 3) SELECT: sadece silinmemiş yorumlar herkese açık
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Public read non-deleted comments" ON public.comments;
CREATE POLICY "Public read non-deleted comments"
  ON public.comments FOR SELECT
  USING (deleted_at IS NULL);

-- Eski hard delete politikasını kaldır (yerine RPC)
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- 4) Kendi yorumunu yumuşak silme (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.soft_delete_own_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.comments
  SET
    deleted_at = timezone('utc'::text, now()),
    deleted_by = auth.uid(),
    deleted_kind = 'user',
    deleted_reason = NULL
  WHERE id = p_comment_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_own_comment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_own_comment(uuid) TO authenticated;
