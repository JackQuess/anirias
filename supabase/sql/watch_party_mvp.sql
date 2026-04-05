-- Watch Party MVP: private rooms, host-controlled playback, max 5 members.
-- Run after animes/episodes exist. Enables Realtime for room row updates.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.watch_party_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  anime_id uuid REFERENCES public.animes (id) ON DELETE SET NULL,
  episode_id uuid NOT NULL REFERENCES public.episodes (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility = 'private'),
  is_playing boolean NOT NULL DEFAULT false,
  playback_time double precision NOT NULL DEFAULT 0,
  last_action text CHECK (last_action IS NULL OR last_action IN ('play', 'pause', 'seek', 'sync')),
  last_action_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  playback_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_party_rooms_code ON public.watch_party_rooms (code);
CREATE INDEX IF NOT EXISTS idx_watch_party_rooms_status ON public.watch_party_rooms (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_watch_party_rooms_host ON public.watch_party_rooms (host_user_id);

CREATE TABLE IF NOT EXISTS public.watch_party_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.watch_party_rooms (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('host', 'viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT true,
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_party_members_room ON public.watch_party_members (room_id);
CREATE INDEX IF NOT EXISTS idx_watch_party_members_user ON public.watch_party_members (user_id);

CREATE TABLE IF NOT EXISTS public.watch_party_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.watch_party_rooms (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_party_events_room_created ON public.watch_party_events (room_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_watch_party_rooms_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_watch_party_rooms_updated ON public.watch_party_rooms;
CREATE TRIGGER trg_watch_party_rooms_updated
  BEFORE UPDATE ON public.watch_party_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_watch_party_rooms_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: reads for room members; writes via service role (backend) only
-- ---------------------------------------------------------------------------

ALTER TABLE public.watch_party_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_events ENABLE ROW LEVEL SECURITY;

-- Rooms: members can read
DROP POLICY IF EXISTS "watch_party_rooms_select_members" ON public.watch_party_rooms;
CREATE POLICY "watch_party_rooms_select_members"
  ON public.watch_party_rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.watch_party_members m
      WHERE m.room_id = watch_party_rooms.id AND m.user_id = auth.uid()
    )
  );

-- Playback updates: service role (backend) only — keeps host-only rules in application code

-- Members: co-members visible
DROP POLICY IF EXISTS "watch_party_members_select_same_room" ON public.watch_party_members;
CREATE POLICY "watch_party_members_select_same_room"
  ON public.watch_party_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.watch_party_members m
      WHERE m.room_id = watch_party_members.room_id AND m.user_id = auth.uid()
    )
  );

-- Events: optional audit read for members
DROP POLICY IF EXISTS "watch_party_events_select_members" ON public.watch_party_events;
CREATE POLICY "watch_party_events_select_members"
  ON public.watch_party_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.watch_party_members m
      WHERE m.room_id = watch_party_events.room_id AND m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime (Supabase): replicate inserts/updates for subscriptions
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_rooms;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$;
