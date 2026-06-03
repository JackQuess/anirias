-- Episode source and Turkish descriptions.
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS description_tr TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
