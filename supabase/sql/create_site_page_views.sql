-- Site trafiği: sayfa görüntülemeleri (admin panelinde özetlenir)
-- Supabase SQL Editor veya CLI ile bir kez çalıştırın.

CREATE TABLE IF NOT EXISTS public.site_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL CHECK (char_length(path) <= 2048),
  referrer TEXT,
  session_key TEXT NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_page_views_created_at ON public.site_page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_page_views_session_created ON public.site_page_views (session_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_page_views_path_created ON public.site_page_views (path, created_at DESC);

ALTER TABLE public.site_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page views"
  ON public.site_page_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can read page views"
  ON public.site_page_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete page views"
  ON public.site_page_views
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Özet: sadece giriş yapmış admin çağırabilir; diğerleri NULL döner
CREATE OR REPLACE FUNCTION public.admin_site_traffic_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) INTO ok;

  IF NOT ok THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'viewsLast24h',
    (SELECT COUNT(*)::bigint FROM public.site_page_views WHERE created_at >= now() - interval '24 hours'),
    'viewsLast7d',
    (SELECT COUNT(*)::bigint FROM public.site_page_views WHERE created_at >= now() - interval '7 days'),
    'uniqueSessions24h',
    (
      SELECT COUNT(DISTINCT session_key)::bigint
      FROM public.site_page_views
      WHERE created_at >= now() - interval '24 hours'
        AND length(trim(session_key)) > 0
    ),
    'uniqueSessions7d',
    (
      SELECT COUNT(DISTINCT session_key)::bigint
      FROM public.site_page_views
      WHERE created_at >= now() - interval '7 days'
        AND length(trim(session_key)) > 0
    ),
    'topPaths',
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('path', t.path, 'count', t.cnt))
        FROM (
          SELECT path, COUNT(*)::bigint AS cnt
          FROM public.site_page_views
          WHERE created_at >= now() - interval '7 days'
          GROUP BY path
          ORDER BY cnt DESC
          LIMIT 20
        ) t
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_site_traffic_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_site_traffic_summary() TO authenticated;
