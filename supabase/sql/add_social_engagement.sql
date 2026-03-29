-- Episode likes, comment likes, threaded comment replies + RLS.
-- Run in Supabase SQL Editor if these tables/columns are missing.

-- ---------------------------------------------------------------------------
-- Bölüm beğenileri (watch sayfası)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.episode_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, episode_id)
);

CREATE INDEX IF NOT EXISTS idx_episode_likes_episode_id ON public.episode_likes(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_likes_user_id ON public.episode_likes(user_id);

ALTER TABLE public.episode_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Episode likes are readable" ON public.episode_likes;
CREATE POLICY "Episode likes are readable"
  ON public.episode_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users insert own episode likes" ON public.episode_likes;
CREATE POLICY "Users insert own episode likes"
  ON public.episode_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own episode likes" ON public.episode_likes;
CREATE POLICY "Users delete own episode likes"
  ON public.episode_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Yorum beğenileri
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment likes are readable" ON public.comment_likes;
CREATE POLICY "Comment likes are readable"
  ON public.comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users insert own comment likes" ON public.comment_likes;
CREATE POLICY "Users insert own comment likes"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own comment likes" ON public.comment_likes;
CREATE POLICY "Users delete own comment likes"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Yorum zinciri (yanıtlar)
-- ---------------------------------------------------------------------------
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id) WHERE parent_id IS NOT NULL;
