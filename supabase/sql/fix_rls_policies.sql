-- ============================================================================
-- FIX RLS POLICIES - ACİL DÜZELTME
-- Bu dosyayı Supabase SQL Editor'de çalıştırın
-- ============================================================================
-- Sorun: 403 Forbidden hataları, permission denied for table episodes/seasons
-- Çözüm: Public SELECT policy'lerini güçlendirme ve admin policy'lerini düzeltme
-- ============================================================================

-- Mevcut problematik policy'leri kaldır
DROP POLICY IF EXISTS "Admins manage seasons" ON public.seasons;
DROP POLICY IF EXISTS "Admins manage episodes" ON public.episodes;

-- Seasons için SELECT policy'sini tekrar oluştur (herkese açık)
DROP POLICY IF EXISTS "Seasons viewable by everyone." ON public.seasons;
CREATE POLICY "Seasons viewable by everyone." 
  ON public.seasons FOR SELECT 
  USING (true);

-- Episodes için SELECT policy'sini tekrar oluştur (herkese açık)
DROP POLICY IF EXISTS "Episodes viewable by everyone." ON public.episodes;
CREATE POLICY "Episodes viewable by everyone." 
  ON public.episodes FOR SELECT 
  USING (true);

-- Seasons için admin INSERT/UPDATE/DELETE policy'leri (SELECT hariç)
CREATE POLICY "Admins can insert seasons" 
  ON public.seasons FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update seasons" 
  ON public.seasons FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete seasons" 
  ON public.seasons FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Episodes için admin INSERT/UPDATE/DELETE policy'leri (SELECT hariç)
CREATE POLICY "Admins can insert episodes" 
  ON public.episodes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update episodes" 
  ON public.episodes FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete episodes" 
  ON public.episodes FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Watchlist için public SELECT (anon user'ların okuması için)
-- Not: Watchlist normalde private olmalı, ama frontend'de anon user'lar da görebilmeli
-- Eğer watchlist private kalacaksa, frontend'de null check yapılmalı
-- Şimdilik herkese açık yapıyoruz (güvenlik riski düşük - sadece okuma)
DROP POLICY IF EXISTS "Users manage own watchlist" ON public.watchlist;
CREATE POLICY "Users manage own watchlist" 
  ON public.watchlist FOR ALL 
  USING (auth.uid() = user_id);

-- Watch_progress için de aynı şekilde
DROP POLICY IF EXISTS "Users manage own progress" ON public.watch_progress;
CREATE POLICY "Users manage own progress" 
  ON public.watch_progress FOR ALL 
  USING (auth.uid() = user_id);

-- Watch_history için de aynı şekilde
DROP POLICY IF EXISTS "Users manage own history" ON public.watch_history;
CREATE POLICY "Users manage own history" 
  ON public.watch_history FOR ALL 
  USING (auth.uid() = user_id);

-- Animes, profiles, comments policy'leri zaten doğru, onları kontrol et
-- Eğer sorun devam ederse, bunları da tekrar oluştur:

-- Animes SELECT policy'sini güçlendir
DROP POLICY IF EXISTS "Content is viewable by everyone." ON public.animes;
CREATE POLICY "Content is viewable by everyone." 
  ON public.animes FOR SELECT 
  USING (true);

-- Profiles SELECT policy'sini güçlendir
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT 
  USING (true);

-- Comments SELECT policy'sini güçlendir
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" 
  ON public.comments FOR SELECT 
  USING (true);

-- ============================================================================
-- ÖNEMLİ NOTLAR:
-- 1. Bu script'i çalıştırdıktan sonra sayfayı yenileyin
-- 2. Hala 403 hatası alıyorsanız, Supabase Dashboard > Authentication > Policies
--    bölümünden policy'leri kontrol edin
-- 3. Eğer sorun devam ederse, Supabase schema cache'i yenilemeyi deneyin
-- ============================================================================

