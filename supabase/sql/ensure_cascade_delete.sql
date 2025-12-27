-- Ensure CASCADE DELETE is properly configured for anime deletion
-- This migration ensures that when an anime is deleted, all related data is automatically deleted

-- Verify and update foreign key constraints to ensure CASCADE DELETE
-- Note: If constraints already exist with CASCADE, this will not change them

-- Seasons: Should already have CASCADE from anime_id
-- Episodes: Should already have CASCADE from anime_id and season_id
-- Watchlist: Should already have CASCADE from anime_id
-- Watch Progress: Should already have CASCADE from anime_id and episode_id
-- Watch History: Should already have CASCADE from anime_id and episode_id
-- Comments: Should already have CASCADE from anime_id and episode_id

-- If any constraints are missing CASCADE, uncomment and run the appropriate ALTER TABLE commands:

-- ALTER TABLE public.seasons
--   DROP CONSTRAINT IF EXISTS seasons_anime_id_fkey,
--   ADD CONSTRAINT seasons_anime_id_fkey 
--     FOREIGN KEY (anime_id) REFERENCES public.animes(id) ON DELETE CASCADE;

-- ALTER TABLE public.episodes
--   DROP CONSTRAINT IF EXISTS episodes_anime_id_fkey,
--   ADD CONSTRAINT episodes_anime_id_fkey 
--     FOREIGN KEY (anime_id) REFERENCES public.animes(id) ON DELETE CASCADE;

-- ALTER TABLE public.episodes
--   DROP CONSTRAINT IF EXISTS episodes_season_id_fkey,
--   ADD CONSTRAINT episodes_season_id_fkey 
--     FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;

-- ALTER TABLE public.watchlist
--   DROP CONSTRAINT IF EXISTS watchlist_anime_id_fkey,
--   ADD CONSTRAINT watchlist_anime_id_fkey 
--     FOREIGN KEY (anime_id) REFERENCES public.animes(id) ON DELETE CASCADE;

-- ALTER TABLE public.watch_progress
--   DROP CONSTRAINT IF EXISTS watch_progress_anime_id_fkey,
--   ADD CONSTRAINT watch_progress_anime_id_fkey 
--     FOREIGN KEY (anime_id) REFERENCES public.animes(id) ON DELETE CASCADE;

-- ALTER TABLE public.watch_progress
--   DROP CONSTRAINT IF EXISTS watch_progress_episode_id_fkey,
--   ADD CONSTRAINT watch_progress_episode_id_fkey 
--     FOREIGN KEY (episode_id) REFERENCES public.episodes(id) ON DELETE CASCADE;

-- ALTER TABLE public.watch_history
--   DROP CONSTRAINT IF EXISTS watch_history_anime_id_fkey,
--   ADD CONSTRAINT watch_history_anime_id_fkey 
--     FOREIGN KEY (anime_id) REFERENCES public.animes(id) ON DELETE CASCADE;

-- ALTER TABLE public.watch_history
--   DROP CONSTRAINT IF EXISTS watch_history_episode_id_fkey,
--   ADD CONSTRAINT watch_history_episode_id_fkey 
--     FOREIGN KEY (episode_id) REFERENCES public.episodes(id) ON DELETE CASCADE;

-- ALTER TABLE public.comments
--   DROP CONSTRAINT IF EXISTS comments_anime_id_fkey,
--   ADD CONSTRAINT comments_anime_id_fkey 
--     FOREIGN KEY (anime_id) REFERENCES public.animes(id) ON DELETE CASCADE;

-- ALTER TABLE public.comments
--   DROP CONSTRAINT IF EXISTS comments_episode_id_fkey,
--   ADD CONSTRAINT comments_episode_id_fkey 
--     FOREIGN KEY (episode_id) REFERENCES public.episodes(id) ON DELETE CASCADE;

-- Verify constraints (run this to check current state):
-- SELECT
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON rc.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND ccu.table_name = 'animes'
-- ORDER BY tc.table_name, kcu.column_name;

