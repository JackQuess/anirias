-- +18 bayrağı ve AniList metin etiketi (user score ile karışmaması için ayrı sütun önerilir)
-- sync-anilist-adult-flags ve import akışları için

ALTER TABLE public.animes ADD COLUMN IF NOT EXISTS is_adult BOOLEAN NOT NULL DEFAULT FALSE;

-- Metin etiketi: R18+, Ecchi, Hentai (animes.rating INTEGER ise bu sütunu kullanın)
ALTER TABLE public.animes ADD COLUMN IF NOT EXISTS anilist_content_rating TEXT;

COMMENT ON COLUMN public.animes.anilist_content_rating IS 'AniList türetilmiş yaş etiketi; kullanıcı puanı değildir';

CREATE INDEX IF NOT EXISTS idx_animes_is_adult ON public.animes (is_adult) WHERE is_adult = TRUE;
