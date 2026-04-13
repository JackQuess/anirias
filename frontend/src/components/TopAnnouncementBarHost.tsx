import React from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { TopAnnouncementBar } from './TopAnnouncementBar';

export type TopAnnouncementSetting = {
  enabled?: boolean;
  label?: string;
  messages?: string[];
};

/**
 * Ana sayfa üst şeridi — ayarlar `site_settings.top_announcement` (admin).
 * Kayıt yoksa varsayılan şerit gösterilir; enabled: false ise gizlenir.
 */
export const TopAnnouncementBarHost: React.FC = () => {
  const { data, loading } = useLoad(() => db.getSiteSetting('top_announcement'));

  if (loading) return null;

  const s = data as TopAnnouncementSetting | null;
  if (s && s.enabled === false) return null;

  const label =
    typeof s?.label === 'string' && s.label.trim() ? s.label.trim() : undefined;
  const raw = s?.messages;
  const messages =
    Array.isArray(raw) && raw.length > 0
      ? raw.map((m) => String(m).trim()).filter(Boolean)
      : undefined;

  return <TopAnnouncementBar label={label} messages={messages} />;
};

export default TopAnnouncementBarHost;
