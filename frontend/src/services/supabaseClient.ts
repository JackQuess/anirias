import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Vite ONLY exposes env variables via import.meta.env
 * process.env does NOT exist in the browser.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseEnv =
  typeof supabaseUrl === 'string' &&
  typeof supabaseAnonKey === 'string' &&
  supabaseUrl.startsWith('https://');

if (!hasSupabaseEnv) {
  console.warn('[Supabase] ENV eksik veya geçersiz', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : 'missing',
  });
} else {
  console.log('[Supabase] Client initialized successfully');
  console.log('[Supabase] URL:', supabaseUrl);
  console.log('[Supabase] Anon Key present:', !!supabaseAnonKey);
}

export const supabase: SupabaseClient | null = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

if (supabase) {
  console.log('[Supabase] Client instance created');
} else {
  console.error('[Supabase] Client instance is NULL');
}

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
