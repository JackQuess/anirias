-- ============================================================================
-- EMERGENCY RLS FIX - ÇOK HIZLI ÇÖZÜM
-- Bu script'i Supabase SQL Editor'de çalıştırın
-- ============================================================================
-- Sorun: Episodes/seasons tabloları için public SELECT policy'leri çalışmıyor
-- Çözüm: Tüm public SELECT policy'lerini zorla yeniden oluştur
-- ============================================================================

-- 1. Episodes tablosu için tüm policy'leri kaldır ve yeniden oluştur
DROP POLICY IF EXISTS "Episodes viewable by everyone." ON public.episodes;
DROP POLICY IF EXISTS "Admins manage episodes" ON public.episodes;
DROP POLICY IF EXISTS "Admins can insert episodes" ON public.episodes;
DROP POLICY IF EXISTS "Admins can update episodes" ON public.episodes;
DROP POLICY IF EXISTS "Admins can delete episodes" ON public.episodes;

-- Episodes - Public SELECT (HERKESE AÇIK - ÖNCE BU)
CREATE POLICY "Episodes viewable by everyone." 
  ON public.episodes FOR SELECT 
  USING (true);

-- Episodes - Admin INSERT/UPDATE/DELETE
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

-- 2. Seasons tablosu için tüm policy'leri kaldır ve yeniden oluştur
DROP POLICY IF EXISTS "Seasons viewable by everyone." ON public.seasons;
DROP POLICY IF EXISTS "Admins manage seasons" ON public.seasons;
DROP POLICY IF EXISTS "Admins can insert seasons" ON public.seasons;
DROP POLICY IF EXISTS "Admins can update seasons" ON public.seasons;
DROP POLICY IF EXISTS "Admins can delete seasons" ON public.seasons;

-- Seasons - Public SELECT (HERKESE AÇIK - ÖNCE BU)
CREATE POLICY "Seasons viewable by everyone." 
  ON public.seasons FOR SELECT 
  USING (true);

-- Seasons - Admin INSERT/UPDATE/DELETE
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

-- 3. Animes tablosu için SELECT policy'sini güçlendir
DROP POLICY IF EXISTS "Content is viewable by everyone." ON public.animes;
CREATE POLICY "Content is viewable by everyone." 
  ON public.animes FOR SELECT 
  USING (true);

-- 4. Comments tablosu için SELECT policy'sini güçlendir
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" 
  ON public.comments FOR SELECT 
  USING (true);

-- 5. Profiles tablosu için SELECT policy'sini güçlendir
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT 
  USING (true);

-- ============================================================================
-- TEST QUERIES (İsteğe bağlı - çalıştırarak test edebilirsiniz)
-- ============================================================================
-- SELECT COUNT(*) FROM episodes; -- Çalışmalı (anon user olarak)
-- SELECT COUNT(*) FROM seasons; -- Çalışmalı (anon user olarak)
-- SELECT COUNT(*) FROM animes; -- Çalışmalı (anon user olarak)
-- ============================================================================

