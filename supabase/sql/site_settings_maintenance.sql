-- Bakım modu ayarı (site_settings.key = maintenance)
-- İlk kurulumda kapalı; admin panelden açılır.
INSERT INTO public.site_settings (key, value)
VALUES (
  'maintenance',
  '{"enabled": false, "message": ""}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
