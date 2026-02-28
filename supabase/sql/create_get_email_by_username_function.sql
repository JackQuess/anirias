-- ============================================================================
-- ANIRIAS - GET EMAIL BY USERNAME RPC FUNCTION
-- Username ile email bulmak için RPC function
-- ============================================================================

-- RPC Function: Username ile email adresini döndürür
-- Returns: Email adresi (TEXT) veya NULL
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- profiles tablosundan username'e göre user_id'yi bul
  -- Sonra auth.users tablosundan email'i al
  SELECT 
    au.email::TEXT
  INTO 
    user_email
  FROM 
    public.profiles p
  INNER JOIN 
    auth.users au ON p.id = au.id
  WHERE 
    p.username = username_input
  LIMIT 1;
  
  RETURN user_email;
END;
$$;

-- Anon ve authenticated rollerinin RPC çağırabilmesi için yetki
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;

-- RLS: Herkes bu function'ı çağırabilir (public)
-- Güvenlik: Function SECURITY DEFINER olduğu için auth.users'a erişebilir
-- Ama sadece email döndürür, başka bir şey yapmaz

