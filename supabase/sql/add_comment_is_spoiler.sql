-- Yorumlarda spoiler işareti (is_spoiler). Supabase SQL Editor'de çalıştırın.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.comments.is_spoiler IS 'true ise metin spoiler olarak gizlenir; kullanıcı tıklayınca açılır.';
