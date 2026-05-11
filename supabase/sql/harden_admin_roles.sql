-- ============================================================================
-- ANIRIAS - HARDEN ADMIN ROLES
-- Run this in Supabase SQL Editor.
--
-- What this does:
-- 1. New users are always created with role = 'user'.
-- 2. Authenticated clients cannot insert themselves as admin.
-- 3. Authenticated clients cannot update their own role.
-- 4. Provides a guarded cleanup block for existing suspicious admins.
-- ============================================================================

-- New signup profiles must never trust auth.raw_user_meta_data.role.
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
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Block role escalation through the public profiles table.
-- Backend service-role operations keep working because auth.uid() is NULL there.
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

-- Inspect current admins before cleanup.
SELECT id, username, role, created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Cleanup existing unauthorized admins.
-- IMPORTANT:
-- 1. Replace the UUIDs below with only the real admin account IDs.
-- 2. Uncomment the block.
-- 3. Run it once.
/*
DO $$
DECLARE
  allowed_admin_ids UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000000'::UUID
  ];
BEGIN
  IF allowed_admin_ids = ARRAY['00000000-0000-0000-0000-000000000000'::UUID] THEN
    RAISE EXCEPTION 'Replace allowed_admin_ids before running admin cleanup';
  END IF;

  UPDATE public.profiles
  SET role = 'user',
      updated_at = NOW()
  WHERE role = 'admin'
    AND NOT (id = ANY(allowed_admin_ids));
END $$;
*/

