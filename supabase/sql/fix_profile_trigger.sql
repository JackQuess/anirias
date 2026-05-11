-- ============================================================================
-- ANIRIAS - FIX PROFILE TRIGGER
-- Profiles tablosuna kayıt sorununu düzelt
-- ============================================================================

-- Mevcut trigger'ı sil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Mevcut function'ı sil ve yeniden oluştur
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Yeni kullanıcı kaydolduğunda otomatik profil oluşturan tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, avatar_url, created_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)), 
    'user',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Eğer zaten varsa hata verme
  RETURN NEW;
END;
$$;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Kullanıcılar kendi role alanını public API üzerinden yükseltemesin.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'user' THEN
    RAISE EXCEPTION 'profile role cannot be set by clients';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profile role cannot be changed by clients';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;
CREATE TRIGGER protect_profile_role_trigger
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- Test: Mevcut auth.users'da profile olmayan kullanıcılar için manuel ekleme
-- (Opsiyonel - sadece mevcut kullanıcılar için gerekirse çalıştır)
/*
INSERT INTO public.profiles (id, username, role, avatar_url, created_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)),
  'user',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.id,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
*/
