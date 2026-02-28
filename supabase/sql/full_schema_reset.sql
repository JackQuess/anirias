-- ============================================================================
-- ANIRIAS - SIFIRDAN TERTEMIZ VERITABANI (TEK SQL)
-- ============================================================================
-- Bu dosyayi Supabase SQL Editor'da calistirin.
-- UYARI: Tum public tablolar ve iliskili veriler SILINIR. Yedek alin!
-- ============================================================================

-- ============================================================================
-- BOLUM 1: MEVCUT NESNELERI SIFIRLA (DROP)
-- ============================================================================

-- Trigger'lari kaldir (tablolar drop edilmeden once)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_episode_season_number_trigger ON public.episodes;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_animes ON public.animes;
DROP TRIGGER IF EXISTS set_updated_at_seasons ON public.seasons;
DROP TRIGGER IF EXISTS set_updated_at_episodes ON public.episodes;
DROP TRIGGER IF EXISTS set_updated_at_airing_schedule ON public.airing_schedule;
DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;

-- Tablolari bagimlilik sirasina gore sil (en dis bagimlilardan basla)
DROP TABLE IF EXISTS public.weekly_calendar_cache CASCADE;
DROP TABLE IF EXISTS public.airing_schedule CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.anime_follows CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.error_logs CASCADE;
DROP TABLE IF EXISTS public.site_settings CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.watch_history CASCADE;
DROP TABLE IF EXISTS public.watch_progress CASCADE;
DROP TABLE IF EXISTS public.watchlist CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.episodes CASCADE;
DROP TABLE IF EXISTS public.seasons CASCADE;
DROP TABLE IF EXISTS public.animes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Fonksiyonlari sil
DROP FUNCTION IF EXISTS public.create_episode_notifications(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.update_announcements_updated_at();
DROP FUNCTION IF EXISTS public.sync_episode_season_number();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_email_by_username(TEXT);

-- ============================================================================
-- BOLUM 2: TABLOLAR VE FONKSIYONLAR (SIFIRDAN OLUSTUR)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  avatar_id TEXT,
  banner_id TEXT,
  is_adult_confirmed BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_adult_confirmed ON public.profiles(is_adult_confirmed) WHERE is_adult_confirmed = true;

-- Kullanici adi ile giris (get_email_by_username) ve RLS admin kontrolleri icin hiz
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower_trim ON public.profiles (lower(trim(username)))
  WHERE username IS NOT NULL AND trim(username) <> '';

-- Yeni kullanici kaydinda otomatik profil
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2.2 ANIMES
-- ----------------------------------------------------------------------------
CREATE TABLE public.animes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anilist_id INTEGER,
  slug TEXT,
  title JSONB NOT NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS animes_slug_unique ON public.animes(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animes_slug ON public.animes(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animes_anilist_id ON public.animes(anilist_id) WHERE anilist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animes_featured ON public.animes(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_animes_created_at ON public.animes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animes_updated_at ON public.animes(updated_at DESC);

-- ----------------------------------------------------------------------------
-- 2.3 SEASONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.seasons (
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

CREATE INDEX IF NOT EXISTS idx_seasons_anime_id ON public.seasons(anime_id);
CREATE INDEX IF NOT EXISTS idx_seasons_anime_season ON public.seasons(anime_id, season_number);

-- ----------------------------------------------------------------------------
-- 2.4 EPISODES
-- ----------------------------------------------------------------------------
CREATE TABLE public.episodes (
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

CREATE OR REPLACE FUNCTION public.sync_episode_season_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.season_id IS NOT NULL THEN
    SELECT season_number INTO NEW.season_number FROM public.seasons WHERE id = NEW.season_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_episode_season_number_trigger
  BEFORE INSERT OR UPDATE OF season_id ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.sync_episode_season_number();

CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON public.episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON public.episodes(season_id) WHERE season_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON public.episodes(air_date) WHERE air_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON public.episodes(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.5 WATCHLIST
-- ----------------------------------------------------------------------------
CREATE TABLE public.watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('watching', 'planning', 'completed', 'dropped', 'paused')),
  score INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_anime_id ON public.watchlist(anime_id);

-- ----------------------------------------------------------------------------
-- 2.6 WATCH_PROGRESS
-- ----------------------------------------------------------------------------
CREATE TABLE public.watch_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, episode_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_progress_user_id ON public.watch_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_anime_id ON public.watch_progress(anime_id);

-- ----------------------------------------------------------------------------
-- 2.7 WATCH_HISTORY
-- ----------------------------------------------------------------------------
CREATE TABLE public.watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_completed_at ON public.watch_history(completed_at DESC);

-- ----------------------------------------------------------------------------
-- 2.8 COMMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_anime_id ON public.comments(anime_id);
CREATE INDEX IF NOT EXISTS idx_comments_episode_id ON public.comments(episode_id) WHERE episode_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.9 NOTIFICATIONS & ANIME_FOLLOWS
-- ----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_episode', 'admin', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE TABLE public.anime_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anime_id UUID REFERENCES public.animes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_follows_user_id ON public.anime_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_anime_follows_anime_id ON public.anime_follows(anime_id);

-- ----------------------------------------------------------------------------
-- 2.10 FEEDBACK, ERROR_LOGS, SITE_SETTINGS, ANNOUNCEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback(created_at DESC);

CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  stack TEXT,
  page_url TEXT NOT NULL,
  user_agent TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);

CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings(key);

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 2.11 AIRING_SCHEDULE & WEEKLY_CALENDAR_CACHE
-- ----------------------------------------------------------------------------
CREATE TABLE public.airing_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  anilist_id INTEGER,
  episode_number INTEGER NOT NULL,
  airing_at TIMESTAMP WITH TIME ZONE NOT NULL,
  airing_source TEXT NOT NULL DEFAULT 'anilist',
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  is_released BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMP WITH TIME ZONE,
  imported_episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(anime_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_airing_schedule_airing_at ON public.airing_schedule(airing_at);
CREATE INDEX IF NOT EXISTS idx_airing_schedule_anime_episode ON public.airing_schedule(anime_id, episode_number);

CREATE TABLE public.weekly_calendar_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- BOLUM 3: UPDATED_AT TRIGGER FONKSIYONU VE TRIGGER'LAR
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_animes BEFORE UPDATE ON public.animes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_seasons BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_episodes BEFORE UPDATE ON public.episodes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_airing_schedule BEFORE UPDATE ON public.airing_schedule FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_announcements_updated_at();

-- ============================================================================
-- BOLUM 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_calendar_cache ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Animes, Seasons, Episodes (herkes okur, sadece admin yazar)
CREATE POLICY "Content is viewable by everyone." ON public.animes FOR SELECT USING (true);
CREATE POLICY "Admins can insert content" ON public.animes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update content" ON public.animes FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete content" ON public.animes FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Seasons viewable by everyone." ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admins can insert seasons" ON public.seasons FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update seasons" ON public.seasons FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete seasons" ON public.seasons FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Episodes viewable by everyone." ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Admins can insert episodes" ON public.episodes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update episodes" ON public.episodes FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete episodes" ON public.episodes FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Watchlist, progress, history
CREATE POLICY "Users manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own progress" ON public.watch_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own history" ON public.watch_history FOR ALL USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Anime follows
CREATE POLICY "Users can read own follows" ON public.anime_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows" ON public.anime_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows" ON public.anime_follows FOR DELETE USING (auth.uid() = user_id);

-- Feedback
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Only admins can view feedback" ON public.feedback FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can update feedback" ON public.feedback FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can delete feedback" ON public.feedback FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Error logs
CREATE POLICY "Anyone can insert error logs" ON public.error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can read error logs" ON public.error_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can update error logs" ON public.error_logs FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can delete error logs" ON public.error_logs FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Site settings
CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can insert site settings" ON public.site_settings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can update site settings" ON public.site_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can delete site settings" ON public.site_settings FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Announcements
CREATE POLICY "Anyone can read active announcements" ON public.announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Only admins can insert announcements" ON public.announcements FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can update announcements" ON public.announcements FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can delete announcements" ON public.announcements FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Airing schedule & cache
CREATE POLICY "Airing schedule is public read" ON public.airing_schedule FOR SELECT USING (true);
CREATE POLICY "Weekly cache is public read" ON public.weekly_calendar_cache FOR SELECT USING (true);

-- ============================================================================
-- BOLUM 5: EK FONKSIYONLAR
-- ============================================================================

-- Username ile email (giris icin)
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE user_email TEXT;
BEGIN
  IF username_input IS NULL OR trim(username_input) = '' THEN RETURN NULL; END IF;
  SELECT au.email::TEXT INTO user_email
  FROM public.profiles p
  INNER JOIN auth.users au ON p.id = au.id
  WHERE trim(lower(p.username)) = trim(lower(username_input))
  LIMIT 1;
  RETURN user_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;

-- Yeni bolum bildirimi (takipcilere)
CREATE OR REPLACE FUNCTION public.create_episode_notifications(
  p_anime_id UUID, p_episode_id UUID, p_episode_number INTEGER, p_season_number INTEGER
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_anime_title TEXT; v_follower_count INTEGER;
BEGIN
  SELECT COALESCE(title->>'romaji', title->>'english', 'Anime') INTO v_anime_title FROM public.animes WHERE id = p_anime_id;
  IF v_anime_title IS NULL OR v_anime_title = '' THEN v_anime_title := 'Anime'; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, anime_id, episode_id, is_read, created_at)
  SELECT af.user_id, 'new_episode', 'Yeni Bolum Eklendi', v_anime_title || ' - Bolum ' || p_episode_number ||
    CASE WHEN p_season_number > 1 THEN ' (Sezon ' || p_season_number || ')' ELSE '' END,
    p_anime_id, p_episode_id, false, timezone('utc'::text, now())
  FROM public.anime_follows af WHERE af.anime_id = p_anime_id;
  GET DIAGNOSTICS v_follower_count = ROW_COUNT;
  RETURN v_follower_count;
END;
$$;

-- ============================================================================
-- BOLUM 6: VARSAYILAN VERILER VE MEVCUT KULLANICILARIN PROFILERI
-- ============================================================================
INSERT INTO public.site_settings (key, value)
VALUES ('mascots', '{"enabled":true,"rias":true,"lightning":true,"light":true,"angel":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Auth'da kayitli ama profiles'da olmayan kullanicilar icin profil olustur
INSERT INTO public.profiles (id, username, role, avatar_url, created_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)),
  COALESCE(au.raw_user_meta_data->>'role', 'user'),
  'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.id,
  timezone('utc'::text, now())
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);

-- ============================================================================
-- TAMAMLANDI
-- ============================================================================
DO $$ BEGIN RAISE NOTICE 'ANIRIAS schema sifirdan olusturuldu. Mevcut auth kullanicilari icin profil kaydi eklendi.'; END $$;
