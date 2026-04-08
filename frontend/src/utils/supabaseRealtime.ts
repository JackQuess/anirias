import type { SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime kanalını kısa gecikmeyle kaldırır.
 * React Strict Mode veya hızlı route değişiminde WebSocket henüz açılmadan
 * removeChannel çağrılınca oluşan "closed before connection established" gürültüsünü azaltır.
 */
export function scheduleRemoveChannel(
  client: SupabaseClient,
  channel: RealtimeChannel,
  delayMs = 80
): () => void {
  const id = window.setTimeout(() => {
    try {
      void client.removeChannel(channel);
    } catch {
      /* ignore */
    }
  }, delayMs);
  return () => clearTimeout(id);
}
