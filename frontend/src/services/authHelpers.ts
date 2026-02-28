
import { supabase } from './supabaseClient';
import { Profile } from '../types';

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  if (!supabase) {
    console.log('[Anirias:AuthHelpers] fetchProfile: supabase null', { userId });
    return null;
  }
  console.log('[Anirias:AuthHelpers] fetchProfile start', { userId });
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Anirias:AuthHelpers] fetchProfile error', { userId, message: error.message, code: error.code });
      return null;
    }
    console.log('[Anirias:AuthHelpers] fetchProfile ok', { userId, found: !!data, username: (data as Profile)?.username });
    return data as Profile;
  } catch (err) {
    console.error('[Anirias:AuthHelpers] fetchProfile exception', { userId, err });
    return null;
  }
};

export const getActiveSession = async () => {
  if (!supabase) {
    console.log('[Anirias:AuthHelpers] getActiveSession: supabase null');
    return null;
  }
  try {
    const { data } = await supabase.auth.getSession();
    console.log('[Anirias:AuthHelpers] getActiveSession', { hasSession: !!data.session });
    return data.session;
  } catch (e) {
    console.error('[Anirias:AuthHelpers] getActiveSession error', e);
    return null;
  }
};
