-- ============================================================================
-- ANIRIAS - FIX MISSING PROFILES
-- Eksik profiles kayıtlarını düzelt ve trigger'ı etkinleştir
-- ============================================================================

-- ADIM 1: Profile trigger'ını düzelt ve etkinleştir
-- ============================================================================

-- Mevcut trigger'ı sil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Mevcut function'ı sil ve yeniden oluştur
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Yeni kullanıcı kaydolduğunda otomatik profil oluşturan fonksiyon
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Kullanıcı auth.signUp ile kayıt olduğunda
  -- raw_user_meta_data->>'username' içinden username'i al
  -- Eğer yoksa, 'user_' + id'nin ilk 8 karakteri
  INSERT INTO public.profiles (id, username, role, avatar_url, created_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NULL, -- avatar_url default NULL, kullanıcı sonra seçer
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Eğer zaten varsa tekrar ekleme
  
  RETURN NEW;
END;
$$;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ADIM 2: Mevcut kullanıcılar için eksik profiles kayıtlarını ekle
-- ============================================================================

-- auth.users'da olup profiles'da olmayan kullanıcıları bul ve ekle
INSERT INTO public.profiles (id, username, role, avatar_url, created_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)),
  COALESCE(au.raw_user_meta_data->>'role', 'user'),
  NULL, -- avatar_url
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL; -- Sadece profiles'da olmayan kullanıcıları ekle

-- ADIM 3: Sonuçları göster
-- ============================================================================

-- Kaç kullanıcının profili eksikti?
DO $$
DECLARE
  missing_count INTEGER;
  total_users INTEGER;
  total_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  missing_count := total_users - total_profiles;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'PROFILE FIX COMPLETED';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total auth.users: %', total_users;
  RAISE NOTICE 'Total profiles: %', total_profiles;
  RAISE NOTICE 'Fixed missing profiles: %', GREATEST(missing_count, 0);
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Trigger: on_auth_user_created - ACTIVE';
  RAISE NOTICE 'Function: handle_new_user() - ACTIVE';
  RAISE NOTICE '====================================';
END $$;

-- ADIM 4: Doğrulama
-- ============================================================================

-- Her auth.users kaydının profiles'da karşılığı olduğunu kontrol et
SELECT 
  'CHECK: All users have profiles' AS status,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASSED - All users have profiles'
    ELSE '❌ FAILED - ' || COUNT(*) || ' users missing profiles'
  END AS result
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Son 5 kullanıcının username'lerini göster (doğrulama için)
SELECT 
  'Recent Users' AS info,
  p.username,
  p.role,
  p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 5;

