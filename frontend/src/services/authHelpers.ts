
import { supabase } from './supabaseClient';
import { Profile } from '../types';

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[Auth] Profile fetch error:', error.message);
      return null;
    }
    return data as Profile;
  } catch (err) {
    console.error('[Auth] Profile error:', err);
    return null;
  }
};

export const getActiveSession = async () => {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (e) {
    return null;
  }
};
