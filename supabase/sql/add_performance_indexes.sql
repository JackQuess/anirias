-- ============================================================================
-- ANIRIAS - PERFORMANS INDEX'LERI (Yuklenme / Auth / Admin hizlandirma)
-- ============================================================================
-- Bu dosyayi Supabase SQL Editor'da calistirin. Veritabanini silmeden sadece
-- eksik index'leri ekler. Sayfa, auth ve admin yuklenme sorunlarini azaltir.
-- ============================================================================

-- 1. Kullanici adi -> e-posta sorgusu (get_email_by_username) - login zaman asimini onler
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower_trim
  ON public.profiles (lower(trim(username)))
  WHERE username IS NOT NULL AND trim(username) <> '';

-- 2. RLS admin kontrolu her yerde "profiles.id + role" kullaniyor; id zaten PK.
--    Ek olarak role uzerinden admin listesi gerekiyorsa:
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role = 'admin';

-- 3. view_count siralama (Browse/Home) - animes
CREATE INDEX IF NOT EXISTS idx_animes_view_count ON public.animes(view_count DESC NULLS LAST) WHERE view_count > 0;

DO $$
BEGIN
  RAISE NOTICE 'ANIRIAS performans indexleri eklendi. Yuklenme ve auth hizlanmali.';
END $$;
