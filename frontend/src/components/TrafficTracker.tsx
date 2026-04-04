import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { hasSupabaseEnv } from '@/services/supabaseClient';
import { db } from '@/services/db';

/**
 * Her sayfa geçişinde (admin hariç) site_page_views tablosuna bir satır yazar.
 * Tablo/RPC yoksa sessizce yok sayılır.
 */
export default function TrafficTracker() {
  const location = useLocation();
  const lastRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    const full = `${location.pathname}${location.search || ''}`;
    if (full.startsWith('/admin')) return;

    const now = Date.now();
    const prev = lastRef.current;
    if (prev && prev.key === full && now - prev.at < 900) return;
    lastRef.current = { key: full, at: now };

    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const id = window.setTimeout(() => {
      void db.recordPageView(full, referrer || null);
    }, 120);
    return () => clearTimeout(id);
  }, [location.pathname, location.search]);

  return null;
}
