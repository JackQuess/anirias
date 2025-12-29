import { useState, useEffect } from 'react';
import { db } from '@/services/db';

export interface MascotSettings {
  enabled: boolean;
  rias: boolean;
  lightning: boolean;
  light: boolean;
  angel: boolean;
}

const DEFAULT_SETTINGS: MascotSettings = {
  enabled: true,
  rias: true,
  lightning: true,
  light: true,
  angel: true,
};

/**
 * Hook to fetch and manage mascot settings
 * Caches result in memory, falls back to all enabled if fetch fails
 */
export const useMascotSettings = (): MascotSettings => {
  const [settings, setSettings] = useState<MascotSettings>(DEFAULT_SETTINGS);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Only fetch once per session
    if (hasFetched) return;

    const fetchSettings = async () => {
      try {
        const data = await db.getSiteSetting('mascots');
        
        if (data && typeof data === 'object') {
          // Validate and merge with defaults
          setSettings({
            enabled: data.enabled !== undefined ? Boolean(data.enabled) : DEFAULT_SETTINGS.enabled,
            rias: data.rias !== undefined ? Boolean(data.rias) : DEFAULT_SETTINGS.rias,
            lightning: data.lightning !== undefined ? Boolean(data.lightning) : DEFAULT_SETTINGS.lightning,
            light: data.light !== undefined ? Boolean(data.light) : DEFAULT_SETTINGS.light,
            angel: data.angel !== undefined ? Boolean(data.angel) : DEFAULT_SETTINGS.angel,
          });
        }
      } catch (err) {
        // Silent fallback to defaults
        if (import.meta.env.DEV) {
          console.warn('[useMascotSettings] Failed to fetch settings, using defaults:', err);
        }
      } finally {
        setHasFetched(true);
      }
    };

    fetchSettings();
  }, [hasFetched]);

  return settings;
};

