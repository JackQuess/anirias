// Notification helper functions for follow/unfollow anime

import { supabase, hasSupabaseEnv } from './supabaseClient';

const checkEnv = () => {
  if (!hasSupabaseEnv || !supabase) {
    if (import.meta.env.DEV) {
      console.warn("Supabase bağlantısı yok. Lütfen .env dosyasını yapılandırın.");
    }
    return false;
  }
  return true;
};

export const notifications = {
  /**
   * Follow an anime (add to anime_follows table)
   */
  followAnime: async (userId: string, animeId: string): Promise<boolean> => {
    if (!checkEnv()) return false;
    
    try {
      const { error } = await supabase!
        .from('anime_follows')
        .upsert({
          user_id: userId,
          anime_id: animeId,
        }, {
          onConflict: 'user_id,anime_id'
        });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[notifications.followAnime] Error:', error);
        return false;
      }
      return true;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[notifications.followAnime] Unexpected error:', err);
      return false;
    }
  },

  /**
   * Unfollow an anime (remove from anime_follows table)
   */
  unfollowAnime: async (userId: string, animeId: string): Promise<boolean> => {
    if (!checkEnv()) return false;
    
    try {
      const { error } = await supabase!
        .from('anime_follows')
        .delete()
        .eq('user_id', userId)
        .eq('anime_id', animeId);
      
      if (error) {
        if (import.meta.env.DEV) console.error('[notifications.unfollowAnime] Error:', error);
        return false;
      }
      return true;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[notifications.unfollowAnime] Unexpected error:', err);
      return false;
    }
  },

  /**
   * Check if user is following an anime
   */
  isFollowing: async (userId: string, animeId: string): Promise<boolean> => {
    if (!checkEnv()) return false;
    
    try {
      const { data, error } = await supabase!
        .from('anime_follows')
        .select('id')
        .eq('user_id', userId)
        .eq('anime_id', animeId)
        .maybeSingle();
      
      if (error) {
        if (import.meta.env.DEV) console.error('[notifications.isFollowing] Error:', error);
        return false;
      }
      return !!data;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[notifications.isFollowing] Unexpected error:', err);
      return false;
    }
  },

  /**
   * Get all anime IDs that user is following
   */
  getFollowingAnimes: async (userId: string): Promise<string[]> => {
    if (!checkEnv()) return [];
    
    try {
      const { data, error } = await supabase!
        .from('anime_follows')
        .select('anime_id')
        .eq('user_id', userId);
      
      if (error) {
        if (import.meta.env.DEV) console.error('[notifications.getFollowingAnimes] Error:', error);
        return [];
      }
      return (data || []).map(row => row.anime_id);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[notifications.getFollowingAnimes] Unexpected error:', err);
      return [];
    }
  },
};

