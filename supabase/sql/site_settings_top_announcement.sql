-- Üst duyuru şeridi (site_settings.key = top_announcement)
-- İsteğe bağlı; admin panelden ilk kayıtta da oluşturulur.
INSERT INTO public.site_settings (key, value)
VALUES (
  'top_announcement',
  '{"enabled": true, "label": "DUYURU", "messages": []}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
