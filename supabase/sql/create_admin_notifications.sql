-- ============================================================================
-- ADMIN NOTIFICATION SYSTEM
-- ============================================================================
-- Purpose: Allow admins to see system events (new anime/episodes, errors)
-- Non-intrusive: Does not affect existing downloader or import systems
-- ============================================================================

-- ============================================================================
-- 1. ADMIN NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('animely', 'system', 'downloader', 'import')),
  is_read BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_source ON public.admin_notifications(source);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can update admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Service role can insert admin notifications" ON public.admin_notifications;

-- Policy 1: Only admins can read notifications
CREATE POLICY "Admins can read admin notifications"
  ON public.admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy 2: Admins can update notifications (mark as read)
CREATE POLICY "Admins can update admin notifications"
  ON public.admin_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy 3: Service role (backend) can insert notifications
-- This allows backend to create notifications without user authentication
CREATE POLICY "Service role can insert admin notifications"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 3. HELPER FUNCTION: Create admin notification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_source TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Validate type
  IF p_type NOT IN ('info', 'warning', 'error') THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;

  -- Validate source
  IF p_source NOT IN ('animely', 'system', 'downloader', 'import') THEN
    RAISE EXCEPTION 'Invalid notification source: %', p_source;
  END IF;

  -- Insert notification
  INSERT INTO public.admin_notifications (type, title, message, source, metadata)
  VALUES (p_type, p_title, p_message, p_source, p_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- 4. HELPER FUNCTION: Clean old notifications (keep last 100)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_admin_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Keep only the most recent 100 notifications
  DELETE FROM public.admin_notifications
  WHERE id IN (
    SELECT id FROM public.admin_notifications
    ORDER BY created_at DESC
    OFFSET 100
  );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- TEST: Create sample notifications (optional)
-- ============================================================================

-- Uncomment to test:
-- SELECT public.create_admin_notification('info', 'Test bildirim', 'Bu bir test mesajıdır', 'system');
-- SELECT public.create_admin_notification('warning', 'Uyarı', 'Test uyarısı', 'downloader');
-- SELECT public.create_admin_notification('error', 'Hata', 'Test hatası', 'import');

-- ============================================================================
-- CLEANUP: Optionally schedule cleanup (run this manually or via cron)
-- ============================================================================

-- To manually clean old notifications:
-- SELECT public.cleanup_old_admin_notifications();


