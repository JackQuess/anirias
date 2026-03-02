-- ============================================================================
-- PAIRING + DEVICE SESSIONS + ENTITLEMENTS
-- ============================================================================
-- Run in Supabase SQL Editor (or psql).
-- Prerequisites: auth.users, public.profiles exist.
-- ============================================================================

-- ============================================================================
-- 1. PAIRING CODES
-- ============================================================================
-- Desktop creates a 6-digit code (valid 30s). Mobile claims it.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pairing_codes (
  code               TEXT        NOT NULL,
  desktop_device_id  TEXT        NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL,
  used_at            TIMESTAMPTZ,
  user_id            UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT pairing_codes_pkey PRIMARY KEY (code)
);

-- Quickly find unexpired + unused codes (used by the API to check collisions)
CREATE INDEX IF NOT EXISTS idx_pairing_codes_active
  ON public.pairing_codes (code)
  WHERE used_at IS NULL;

-- TTL cleanup: find all expired rows
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at
  ON public.pairing_codes (expires_at);

-- ============================================================================
-- 2. DEVICE SESSIONS
-- ============================================================================
-- One row per (user, device) pair. revoked_at IS NULL = active session.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.device_sessions (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id   TEXT        NOT NULL,
  platform    TEXT        NOT NULL CHECK (platform IN ('desktop', 'mobile')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,

  -- A device can have only one non-revoked session per user
  CONSTRAINT device_sessions_user_device_unique UNIQUE (user_id, device_id, platform)
);

-- Count active sessions quickly (used for device-limit enforcement)
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_active
  ON public.device_sessions (user_id)
  WHERE revoked_at IS NULL;

-- Lookup by user + device
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_device
  ON public.device_sessions (user_id, device_id);

-- ============================================================================
-- 3. STREAMING SESSIONS  (optional, best-effort audit log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.streaming_sessions (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id   TEXT        NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_streaming_sessions_user
  ON public.streaming_sessions (user_id, started_at DESC);

-- ============================================================================
-- 4. USER ENTITLEMENTS  (RevenueCat cache, updated by webhooks or REST fallback)
-- ============================================================================
-- entitlements JSONB structure: { "pro": true|false, "pro_max": true|false }
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  entitlements JSONB      NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.pairing_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements  ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow re-runs
DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access on pairing_codes"      ON public.pairing_codes;
  DROP POLICY IF EXISTS "Authenticated users read own pairing_codes"     ON public.pairing_codes;

  DROP POLICY IF EXISTS "Service role full access on device_sessions"    ON public.device_sessions;
  DROP POLICY IF EXISTS "Authenticated users read own device_sessions"   ON public.device_sessions;
  DROP POLICY IF EXISTS "Authenticated users revoke own device_sessions" ON public.device_sessions;

  DROP POLICY IF EXISTS "Service role full access on streaming_sessions" ON public.streaming_sessions;
  DROP POLICY IF EXISTS "Authenticated users read own streaming_sessions" ON public.streaming_sessions;

  DROP POLICY IF EXISTS "Service role full access on user_entitlements"  ON public.user_entitlements;
  DROP POLICY IF EXISTS "Authenticated users read own user_entitlements" ON public.user_entitlements;
END $$;

-- ---------------------------
-- 5a. pairing_codes policies
-- ---------------------------
-- Backend (service role) handles all writes; users can read their own claimed codes.

CREATE POLICY "Service role full access on pairing_codes"
  ON public.pairing_codes
  FOR ALL
  USING    (true)
  WITH CHECK (true);
-- Note: service role bypasses RLS automatically, so this is a safety net for
-- any direct queries made with the service key.

CREATE POLICY "Authenticated users read own pairing_codes"
  ON public.pairing_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------
-- 5b. device_sessions policies
-- ---------------------------
-- Backend writes sessions; users can read their own and update (mark revoked).

CREATE POLICY "Service role full access on device_sessions"
  ON public.device_sessions
  FOR ALL
  USING    (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users read own device_sessions"
  ON public.device_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users revoke own device_sessions"
  ON public.device_sessions
  FOR UPDATE
  TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------
-- 5c. streaming_sessions policies
-- ---------------------------

CREATE POLICY "Service role full access on streaming_sessions"
  ON public.streaming_sessions
  FOR ALL
  USING    (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users read own streaming_sessions"
  ON public.streaming_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------
-- 5d. user_entitlements policies
-- ---------------------------
-- Backend (webhook / REST fallback) does all writes.
-- Users can read their own entitlements.

CREATE POLICY "Service role full access on user_entitlements"
  ON public.user_entitlements
  FOR ALL
  USING    (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users read own user_entitlements"
  ON public.user_entitlements
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- 6a. Count active device sessions for a user
--     Called by the API before allowing a new session.
CREATE OR REPLACE FUNCTION public.count_active_device_sessions(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM   public.device_sessions
  WHERE  user_id    = p_user_id
    AND  revoked_at IS NULL;
$$;

-- 6b. Upsert entitlement from RevenueCat webhook
--     Call from backend webhook handler: SELECT upsert_entitlement(user_id, jsonb)
--     Example payload: '{"pro": true, "pro_max": false}'
CREATE OR REPLACE FUNCTION public.upsert_entitlement(
  p_user_id     UUID,
  p_entitlements JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_entitlements (user_id, entitlements, updated_at)
  VALUES (p_user_id, p_entitlements, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    entitlements = EXCLUDED.entitlements,
    updated_at   = now();
END;
$$;

-- 6c. Cleanup: remove pairing codes older than 10 minutes
--     Schedule via pg_cron or call manually.
CREATE OR REPLACE FUNCTION public.cleanup_expired_pairing_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.pairing_codes
  WHERE expires_at < now() - INTERVAL '10 minutes';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- 7. REALTIME  (enable only if you want desktop to poll via Supabase Realtime
--                instead of the GET /pairing/status polling endpoint)
-- ============================================================================
-- Uncomment the lines below to enable Realtime on pairing_codes.
-- Supabase Dashboard → Database → Replication → supabase_realtime publication.
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.pairing_codes;

-- ============================================================================
-- 8. OPTIONAL: pg_cron cleanup job (requires pg_cron extension)
-- ============================================================================
-- SELECT cron.schedule(
--   'cleanup-pairing-codes',
--   '*/5 * * * *',
--   $$ SELECT public.cleanup_expired_pairing_codes(); $$
-- );

-- ============================================================================
-- DONE
-- ============================================================================
