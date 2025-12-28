-- ============================================================================
-- FIX NOTIFICATIONS RLS POLICIES - ACİL DÜZELTME
-- Bu dosyayı Supabase SQL Editor'de çalıştırın
-- ============================================================================
-- Sorun: 403 Forbidden hatası notifications tablosuna erişirken
-- Çözüm: RLS policy'lerini düzelt ve güçlendir
-- ============================================================================

-- 1. Notifications tablosu için mevcut policy'leri kaldır
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;

-- 2. Notifications: Users can only read their own notifications
CREATE POLICY "Users can read own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

-- 3. Notifications: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Notifications: Service role (backend) can insert notifications
-- This allows backend to create notifications without user authentication
-- Note: Service role bypasses RLS, so this policy is for clarity
CREATE POLICY "Service role can insert notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true);

-- 5. Anime Follows: Users can manage their own follows
DROP POLICY IF EXISTS "Users can manage own follows" ON public.anime_follows;

CREATE POLICY "Users can read own follows" 
  ON public.anime_follows FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own follows" 
  ON public.anime_follows FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows" 
  ON public.anime_follows FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- TEST QUERIES (İsteğe bağlı - çalıştırarak test edebilirsiniz)
-- ============================================================================
-- SELECT COUNT(*) FROM notifications WHERE user_id = auth.uid(); -- Çalışmalı
-- SELECT * FROM anime_follows WHERE user_id = auth.uid(); -- Çalışmalı
-- ============================================================================

-- ============================================================================
-- ÖNEMLİ NOTLAR:
-- ============================================================================
-- 1. Bu script'i çalıştırdıktan sonra sayfayı yenileyin
-- 2. Hala 403 hatası alıyorsanız, Supabase Dashboard > Authentication > Policies
--    bölümünden policy'leri kontrol edin
-- 3. Eğer sorun devam ederse, Supabase schema cache'i yenilemeyi deneyin
-- 4. Notifications tablosunun RLS'nin aktif olduğundan emin olun:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'notifications';
--    Eğer rowsecurity = false ise: ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ============================================================================

