-- ============================================================================
-- ANIRIAS - COMPLETE DATABASE SCHEMA
-- App ve Site Uyumlu, Sorunsuz Çalışan Tam Şema
-- ============================================================================
-- Bu dosyayı Supabase SQL Editor'de çalıştırarak tüm şemayı oluşturabilirsiniz.
-- NOT: Mevcut veritabanı varsa, önce DROP TABLE komutlarını kaldırmayın!
-- Bu şema yeni bir veritabanı için tasarlanmıştır.
-- ============================================================================

-- ============================================================================
-- 1. PROFİLLER (Kullanıcı Profilleri)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  avatar_id TEXT,
  banner_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Yeni kullanıcı kaydolduğunda otomatik profil oluşturan tetikleyici
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, avatar_url)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. ANİMELER
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.animes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anilist_id INTEGER,
  slug TEXT,
  title JSONB NOT NULL, -- Örn: {"romaji": "Naruto", "english": "Naruto"}
  description TEXT,
  cover_image TEXT,
  banner_image TEXT,
  score NUMERIC DEFAULT 0,
  year INTEGER,
  genres TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Slug unique index
CREATE UNIQUE INDEX IF NOT EXISTS animes_slug_unique ON public.animes(slug) WHERE slug IS NOT NULL;

-- ============================================================================
-- 3. SEZONLAR
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  season_number INTEGER NOT NULL,
  anilist_id INTEGER,
  title TEXT,
  title_override TEXT,
  year INTEGER,
  episode_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(anime_id, season_number)
);

-- ============================================================================
-- 4. BÖLÜMLER (EPISODES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  season_number INTEGER,
  episode_number INTEGER NOT NULL,
  title TEXT,
  duration_seconds INTEGER DEFAULT 1440,
  duration INTEGER,
  video_url TEXT,
  hls_url TEXT,
  stream_id TEXT,
  status TEXT,
  error_message TEXT,
  short_note TEXT,
  air_date TIMESTAMP WITH TIME ZONE,
  intro_start INTEGER,
  intro_end INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(season_id, episode_number)
);

-- Episode season_number'ı season'dan otomatik güncelleyen trigger
CREATE OR REPLACE FUNCTION public.sync_episode_season_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.season_id IS NOT NULL THEN
    SELECT season_number INTO NEW.season_number
    FROM public.seasons
    WHERE id = NEW.season_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_episode_season_number_trigger ON public.episodes;
CREATE TRIGGER sync_episode_season_number_trigger
  BEFORE INSERT OR UPDATE OF season_id ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_episode_season_number();

-- ============================================================================
-- 5. İZLEME LİSTESİ (WATCHLIST)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('watching', 'planning', 'completed', 'dropped', 'paused')),
  score INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, anime_id)
);

-- ============================================================================
-- 6. İZLEME İLERLEMESİ (WATCH PROGRESS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.watch_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, episode_id)
);

-- ============================================================================
-- 7. İZLEME GEÇMİŞİ (WATCH HISTORY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 8. YORUMLAR (COMMENTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 9. PERFORMANS İNDEXLERİ
-- ============================================================================

-- Animes indexes
CREATE INDEX IF NOT EXISTS idx_animes_slug ON public.animes(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animes_anilist_id ON public.animes(anilist_id) WHERE anilist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animes_featured ON public.animes(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_animes_created_at ON public.animes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animes_updated_at ON public.animes(updated_at DESC);

-- Seasons indexes
CREATE INDEX IF NOT EXISTS idx_seasons_anime_id ON public.seasons(anime_id);
CREATE INDEX IF NOT EXISTS idx_seasons_anime_season ON public.seasons(anime_id, season_number);

-- Episodes indexes
CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON public.episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON public.episodes(season_id) WHERE season_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodes_season_number ON public.episodes(season_number) WHERE season_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON public.episodes(air_date) WHERE air_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodes_status ON public.episodes(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON public.episodes(created_at DESC);

-- Watchlist indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_anime_id ON public.watchlist(anime_id);

-- Watch progress indexes
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_id ON public.watch_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_anime_id ON public.watch_progress(anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_episode_id ON public.watch_progress(episode_id);

-- Watch history indexes
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_anime_id ON public.watch_history(anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_completed_at ON public.watch_history(completed_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_anime_id ON public.comments(anime_id);
CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON public.comments(episode_id) WHERE episode_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- RLS Aktifleştirme
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri temizle (yeniden oluşturmak için)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Content is viewable by everyone." ON public.animes;
DROP POLICY IF EXISTS "Seasons viewable by everyone." ON public.seasons;
DROP POLICY IF EXISTS "Episodes viewable by everyone." ON public.episodes;
DROP POLICY IF EXISTS "Admins can insert content" ON public.animes;
DROP POLICY IF EXISTS "Admins can update content" ON public.animes;
DROP POLICY IF EXISTS "Admins can delete content" ON public.animes;
DROP POLICY IF EXISTS "Admins manage seasons" ON public.seasons;
DROP POLICY IF EXISTS "Admins manage episodes" ON public.episodes;
DROP POLICY IF EXISTS "Users manage own watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users manage own progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users manage own history" ON public.watch_history;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- PROFİLLER
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile." 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- İÇERİK (Anime, Sezon, Bölüm)
-- Herkes görebilir
CREATE POLICY "Content is viewable by everyone." 
  ON public.animes FOR SELECT 
  USING (true);

CREATE POLICY "Seasons viewable by everyone." 
  ON public.seasons FOR SELECT 
  USING (true);

CREATE POLICY "Episodes viewable by everyone." 
  ON public.episodes FOR SELECT 
  USING (true);

-- Sadece Adminler ekleyebilir/düzenleyebilir/silebilir
CREATE POLICY "Admins can insert content" 
  ON public.animes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update content" 
  ON public.animes FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete content" 
  ON public.animes FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage seasons" 
  ON public.seasons FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins manage episodes" 
  ON public.episodes FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- KULLANICI VERİLERİ (Sadece sahibi görebilir ve yönetebilir)
CREATE POLICY "Users manage own watchlist" 
  ON public.watchlist FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own progress" 
  ON public.watch_progress FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own history" 
  ON public.watch_history FOR ALL 
  USING (auth.uid() = user_id);

-- YORUMLAR
CREATE POLICY "Comments are viewable by everyone" 
  ON public.comments FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert comments" 
  ON public.comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
  ON public.comments FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 11. UPDATED_AT OTOMATIK GÜNCELLEME TRIGGER'LARI
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger'ları
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_animes ON public.animes;
CREATE TRIGGER set_updated_at_animes
  BEFORE UPDATE ON public.animes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_seasons ON public.seasons;
CREATE TRIGGER set_updated_at_seasons
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_episodes ON public.episodes;
CREATE TRIGGER set_updated_at_episodes
  BEFORE UPDATE ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ŞEMA OLUŞTURMA TAMAMLANDI
-- ============================================================================
-- Önemli Notlar:
-- 1. Bu şema app ve site'in tüm ihtiyaçlarını karşılar
-- 2. Tüm foreign key constraint'ler CASCADE DELETE ile ayarlanmıştır
-- 3. RLS policies hem okuma hem de yazma işlemlerini korur
-- 4. Index'ler performans için optimize edilmiştir
-- 5. Trigger'lar otomatik güncellemeleri yönetir (updated_at, season_number sync)
-- 6. Mevcut veritabanında bu şemayı çalıştırmadan önce yedek alın!
-- ============================================================================

