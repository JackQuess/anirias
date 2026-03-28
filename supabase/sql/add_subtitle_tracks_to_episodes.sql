-- Optional JSON array of external WebVTT subtitles per episode.
-- Example: [{"url":"https://cdn.example.com/s1e1-tr.vtt","label":"Türkçe","lang":"tr"}]
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS subtitle_tracks JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.episodes.subtitle_tracks IS 'Array of {url, label, lang?} for WebVTT tracks shown in the player';
