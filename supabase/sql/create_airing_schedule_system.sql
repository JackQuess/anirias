-- ============================================================================
-- Airing Schedule System
-- Single source of truth for public calendar.
-- ============================================================================

-- Ensure AniList binding exists on animes
ALTER TABLE public.animes
  ADD COLUMN IF NOT EXISTS anilist_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_animes_anilist_id
  ON public.animes(anilist_id)
  WHERE anilist_id IS NOT NULL;

-- Planned + corrected airing schedule
CREATE TABLE IF NOT EXISTS public.airing_schedule (
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

-- Backfill/upgrade path for environments where table already existed
ALTER TABLE public.airing_schedule
  ADD COLUMN IF NOT EXISTS anilist_id INTEGER,
  ADD COLUMN IF NOT EXISTS episode_number INTEGER,
  ADD COLUMN IF NOT EXISTS airing_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS airing_source TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_released BOOLEAN,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS imported_episode_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Normalize defaults and nullability on upgraded tables
ALTER TABLE public.airing_schedule
  ALTER COLUMN airing_source SET DEFAULT 'anilist',
  ALTER COLUMN last_synced_at SET DEFAULT timezone('utc'::text, now()),
  ALTER COLUMN is_released SET DEFAULT false,
  ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

UPDATE public.airing_schedule
SET is_released = false
WHERE is_released IS NULL;

UPDATE public.airing_schedule
SET airing_source = 'anilist'
WHERE airing_source IS NULL;

UPDATE public.airing_schedule
SET last_synced_at = timezone('utc'::text, now())
WHERE last_synced_at IS NULL;

UPDATE public.airing_schedule
SET updated_at = timezone('utc'::text, now())
WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.airing_schedule WHERE episode_number IS NULL) THEN
    ALTER TABLE public.airing_schedule ALTER COLUMN episode_number SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.airing_schedule WHERE airing_at IS NULL) THEN
    ALTER TABLE public.airing_schedule ALTER COLUMN airing_at SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.airing_schedule WHERE airing_source IS NULL) THEN
    ALTER TABLE public.airing_schedule ALTER COLUMN airing_source SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.airing_schedule WHERE last_synced_at IS NULL) THEN
    ALTER TABLE public.airing_schedule ALTER COLUMN last_synced_at SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.airing_schedule WHERE is_released IS NULL) THEN
    ALTER TABLE public.airing_schedule ALTER COLUMN is_released SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.airing_schedule WHERE updated_at IS NULL) THEN
    ALTER TABLE public.airing_schedule ALTER COLUMN updated_at SET NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'airing_schedule_anime_episode_unique'
      AND conrelid = 'public.airing_schedule'::regclass
  ) THEN
    ALTER TABLE public.airing_schedule
      ADD CONSTRAINT airing_schedule_anime_episode_unique UNIQUE (anime_id, episode_number);
  END IF;
END
$$;

-- Ensure FKs exist even if table was created in an older shape
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'airing_schedule_anime_id_fkey'
      AND conrelid = 'public.airing_schedule'::regclass
  ) THEN
    ALTER TABLE public.airing_schedule
      ADD CONSTRAINT airing_schedule_anime_id_fkey
      FOREIGN KEY (anime_id) REFERENCES public.animes(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'airing_schedule_imported_episode_id_fkey'
      AND conrelid = 'public.airing_schedule'::regclass
  ) THEN
    ALTER TABLE public.airing_schedule
      ADD CONSTRAINT airing_schedule_imported_episode_id_fkey
      FOREIGN KEY (imported_episode_id) REFERENCES public.episodes(id) ON DELETE SET NULL NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_airing_schedule_airing_at
  ON public.airing_schedule(airing_at);

CREATE INDEX IF NOT EXISTS idx_airing_schedule_anime_episode
  ON public.airing_schedule(anime_id, episode_number);

CREATE INDEX IF NOT EXISTS idx_airing_schedule_release_airing
  ON public.airing_schedule(is_released, airing_at);

-- Optional cache for 7-day public payloads
CREATE TABLE IF NOT EXISTS public.weekly_calendar_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.airing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_calendar_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Airing schedule is public read" ON public.airing_schedule;
CREATE POLICY "Airing schedule is public read"
  ON public.airing_schedule
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Weekly cache is public read" ON public.weekly_calendar_cache;
CREATE POLICY "Weekly cache is public read"
  ON public.weekly_calendar_cache
  FOR SELECT
  USING (true);

-- Keep updated_at fresh if helper exists in schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'handle_updated_at'
      AND pg_function_is_visible(oid)
  ) THEN
    DROP TRIGGER IF EXISTS set_updated_at_airing_schedule ON public.airing_schedule;
    CREATE TRIGGER set_updated_at_airing_schedule
      BEFORE UPDATE ON public.airing_schedule
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END
$$;
