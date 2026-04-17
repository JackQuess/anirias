-- Turkish translated synopsis (optional fallback field)
ALTER TABLE public.animes
  ADD COLUMN IF NOT EXISTS description_tr TEXT;
