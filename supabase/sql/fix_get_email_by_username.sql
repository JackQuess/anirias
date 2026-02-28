-- ============================================================================
-- ANIRIAS - FIX USERNAME LOGIN (get_email_by_username)
-- Username ile giriş yapılamıyorsa bu dosyayı Supabase SQL Editor'da çalıştırın.
-- Not: automation_jobs migration'ı bu fonksiyonu etkilemez; yine de fonksiyon
-- veya yetkileri kaybolmuş olabilir. Bu script güvenle tekrar çalıştırılabilir.
-- ============================================================================

-- 1. Fonksiyonu yeniden oluştur (SECURITY DEFINER ile auth.users'a erişebilir)
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email TEXT;
BEGIN
  IF username_input IS NULL OR trim(username_input) = '' THEN
    RETURN NULL;
  END IF;

  SELECT au.email::TEXT
  INTO user_email
  FROM public.profiles p
  INNER JOIN auth.users au ON p.id = au.id
  WHERE trim(lower(p.username)) = trim(lower(username_input))
  LIMIT 1;

  RETURN user_email;
END;
$$;

-- 2. Anon ve authenticated rollerinin çağırabilmesi için yetki ver
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;

-- 3. (Opsiyonel) Fonksiyonun var olduğunu doğrula
DO $$
BEGIN
  RAISE NOTICE 'get_email_by_username fonksiyonu guncellendi. Username ile giris icin hazir.';
END $$;
