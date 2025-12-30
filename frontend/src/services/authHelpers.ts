
import { supabase } from './supabaseClient';
import { Profile } from '../types';

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  if (!supabase) return null;
  
  try {
    // Use limit(1) + maybeSingle to prevent "Cannot coerce" errors
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[AuthService] Profile fetch error:', error.message);
      return null;
    }
    return data as Profile;
  } catch (err) {
    console.error('[AuthService] Unexpected profile error:', err);
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
