import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * CLIENT-SIDE SUPABASE CLIENT (BROWSER ONLY)
 * 
 * SECURITY RULES:
 * - ONLY uses VITE_SUPABASE_ANON_KEY (public anon key)
 * - NEVER uses service role key
 * - ONLY for: auth, SELECT (read-only) queries
 * - Write operations (INSERT/UPDATE/DELETE) must go through backend APIs
 * 
 * Vite ONLY exposes env variables via import.meta.env
 * process.env does NOT exist in the browser.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// SECURITY CHECK: Detect if service role key is accidentally exposed
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                       import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
                       import.meta.env.SUPABASE_SERVICE_KEY ||
                       import.meta.env.sb_secret;

if (serviceRoleKey) {
  console.error(
    '🚨 CRITICAL SECURITY ISSUE: Service role key detected in frontend environment!\n' +
    'Service role keys MUST NEVER be exposed to the browser.\n' +
    'Remove these environment variables from frontend:\n' +
    '- VITE_SUPABASE_SERVICE_ROLE_KEY\n' +
    '- SUPABASE_SERVICE_ROLE_KEY\n' +
    '- SUPABASE_SERVICE_KEY\n' +
    '- sb_secret'
  );
  // Don't throw - just warn, but this is a critical security issue
}

export const hasSupabaseEnv =
  typeof supabaseUrl === 'string' &&
  typeof supabaseAnonKey === 'string' &&
  supabaseUrl.startsWith('https://');

if (!hasSupabaseEnv) {
  if (import.meta.env.DEV) {
    console.warn('[Supabase] ENV eksik veya geçersiz', {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : 'missing',
    });
  }
} else if (import.meta.env.DEV) {
  console.log('[Supabase] Client initialized');
}

export const supabase: SupabaseClient | null = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        ...(typeof window !== 'undefined' && {
          storageKey: 'anirias-auth',
          storage: window.localStorage,
        }),
      },
    })
  : null;

/**
 * Hard-assert helper for places where Supabase MUST exist
 */
export const assertSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase client oluşturulamadı. .env dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı mı kontrol et.'
    );
  }
  return supabase;
};
