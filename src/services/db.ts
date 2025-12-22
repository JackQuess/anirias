
import { supabase, hasSupabaseEnv } from './supabaseClient';
import { Anime, Episode, Season, WatchlistEntry, WatchlistStatus, WatchHistory, CalendarEntry, Notification, Comment, WatchProgress, Profile, ActivityLog } from '../types';

// Helper to ensure Supabase is configured
const checkEnv = () => {
  if (!hasSupabaseEnv || !supabase) {
    console.warn("Supabase bağlantısı yok. Lütfen .env dosyasını yapılandırın.");
    return false;
  }
  return true;
};

export const db = {
  // --- ÖNERİ MOTORU ---
  getPersonalizedRecommendations: async (history: WatchHistory[]): Promise<Anime[]> => {
    if (!checkEnv()) return [];
    
    // 1. İzlenenlerin türlerini topla
    const genreCounts: Record<string, number> = {};
    history.forEach(h => h.anime?.genres?.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
    const favGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 3);

    if (favGenres.length === 0) return db.getAllAnimes('view_count');

    // 2. Bu türlerdeki animeleri getir (rpc veya filtreleme ile)
    const { data } = await supabase!
      .from('animes')
      .select('*')
      .overlaps('genres', favGenres)
      .limit(10);
      
    // 3. Zaten izlediklerini çıkar
    const watchedIds = new Set(history.map(h => h.anime_id));
    return (data || []).filter(a => !watchedIds.has(a.id)).slice(0, 5);
  },

  getSimilarAnimes: async (animeId: string): Promise<Anime[]> => {
    if (!checkEnv()) return [];
    // Gerçek bir senaryoda burada embedding vector search kullanılır.
    // Şimdilik aynı türe sahip diğer animeleri getiriyoruz.
    const current = await db.getAnimeById(animeId);
    if (!current || !current.genres) return [];

    const { data } = await supabase!
      .from('animes')
      .select('*')
      .overlaps('genres', current.genres.slice(0, 2))
      .neq('id', animeId)
      .limit(6);

    return data || [];
  },

  // --- ANIME READ METHODS ---
  getFeaturedAnimes: async (): Promise<Anime[]> => {
    if (!checkEnv()) return [];
    const { data, error } = await supabase!
      .from('animes')
      .select('*')
      .eq('is_featured', true)
      .order('updated_at', { ascending: false });
    
    if (error) console.error("Featured Error:", error);
    return data || [];
  },

  getAllAnimes: async (sortBy: string = 'created_at'): Promise<Anime[]> => {
    if (!checkEnv()) return [];
    const { data, error } = await supabase!
      .from('animes')
      .select('*')
      .order(sortBy, { ascending: false });

    if (error) console.error("All Animes Error:", error);
    return data || [];
  },

  getAnimeById: async (id: string): Promise<Anime | null> => {
    if (!checkEnv()) return null;
    const { data, error } = await supabase!
      .from('animes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) console.error("Get Anime Error:", error);
    return data;
  },

  // --- ANIME WRITE METHODS (ADMIN) ---
  createAnime: async (anime: Partial<Anime>) => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    const payload = {
       ...anime,
       view_count: 0,
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase!.from('animes').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  updateAnime: async (id: string, updates: Partial<Anime>) => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    const { error } = await supabase!.from('animes').update({...updates, updated_at: new Date().toISOString()}).eq('id', id);
    if (error) throw error;
  },

  deleteAnime: async (id: string) => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    const { error } = await supabase!.from('animes').delete().eq('id', id);
    if (error) throw error;
  },

  toggleFeatured: async (animeId: string, status: boolean) => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    const { data, error } = await supabase!.from('animes').update({ is_featured: status }).eq('id', animeId).select().single();
    if (error) throw error;
    return data;
  },

  // --- SEASONS & EPISODES ---
  getSeasons: async (animeId: string): Promise<Season[]> => {
    if (!checkEnv()) return [];
    const { data } = await supabase!.from('seasons').select('*').eq('anime_id', animeId).order('season_number', { ascending: true });
    return data || [];
  },

  createSeason: async (season: Partial<Season>) => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    const { data, error } = await supabase!.from('seasons').insert([season]).select().single();
    if (error) throw error;
    return data;
  },

  getEpisodes: async (animeId: string, seasonId?: string): Promise<Episode[]> => {
    if (!checkEnv()) return [];
    let query = supabase!
      .from('episodes')
      .select('*, seasons:seasons(season_number, anime:animes(slug))')
      .eq('anime_id', animeId);
    if (seasonId) query = query.eq('season_id', seasonId);
    
    const { data } = await query.order('episode_number', { ascending: true });
    return data || [];
  },

  createEpisode: async (episode: Partial<Episode>) => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    const { data, error } = await supabase!.from('episodes').insert([episode]).select().single();
    if (error) throw error;
    return data;
  },

  updateEpisode: async (id: string, updates: Partial<Episode>) => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    const { data, error } = await supabase!
      .from('episodes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteEpisode: async (id: string) => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    const { error } = await supabase!.from('episodes').delete().eq('id', id);
    if (error) throw error;
  },

  getLatestEpisodes: async (): Promise<(Episode & { anime: Anime })[]> => {
    if (!checkEnv()) return [];
    const { data, error } = await supabase!
      .from('episodes')
      .select('*, anime:animes(*)')
      .order('created_at', { ascending: false })
      .limit(12);
      
    if (error) return [];
    return data as (Episode & { anime: Anime })[];
  },

  // --- USER DATA ---
  getWatchlist: async (userId: string): Promise<WatchlistEntry[]> => {
    if (!checkEnv()) return [];
    const { data } = await supabase!.from('watchlist').select('*, anime:animes(*)').eq('user_id', userId);
    return data || [];
  },

  updateWatchlist: async (userId: string, animeId: string, status: WatchlistStatus) => {
    if (!checkEnv()) return;
    await supabase!.from('watchlist').upsert({ user_id: userId, anime_id: animeId, status, updated_at: new Date().toISOString() });
  },

  saveWatchProgress: async (progress: Partial<WatchProgress>) => {
    if (!checkEnv()) return;
    await supabase!.from('watch_progress').upsert(progress);
    
    // View count increment logic can be moved to a Postgres Trigger for efficiency, 
    // but keeping a simple client-side trigger here for now.
    if (Math.random() > 0.9) { 
       const { data: anime } = await supabase!.from('animes').select('view_count').eq('id', progress.anime_id).single();
       if (anime) {
          await supabase!.from('animes').update({ view_count: (anime.view_count || 0) + 1 }).eq('id', progress.anime_id);
       }
    }
  },

  getWatchProgress: async (userId: string, animeId: string, episodeId: string): Promise<WatchProgress | null> => {
    if (!checkEnv()) return null;
    const { data } = await supabase!.from('watch_progress').select('*').eq('user_id', userId).eq('anime_id', animeId).eq('episode_id', episodeId).maybeSingle();
    return data;
  },

  getContinueWatching: async (userId: string): Promise<WatchProgress[]> => {
    if (!checkEnv()) return [];
    const { data } = await supabase!.from('watch_progress')
      .select('*, anime:animes(*), episode:episodes(*)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);
    return data || [];
  },

  addToWatchHistory: async (history: Partial<WatchHistory>) => {
    if (!checkEnv()) return;
    await supabase!.from('watch_history').insert([history]);
  },

  getWatchHistory: async (userId: string): Promise<WatchHistory[]> => {
    if (!checkEnv()) return [];
    const { data } = await supabase!.from('watch_history')
      .select('*, anime:animes(*), episode:episodes(*)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    return data || [];
  },

  // --- COMMENTS ---
  getComments: async (animeId: string, episodeId: string): Promise<Comment[]> => {
    if (!checkEnv()) return [];
    const { data, error } = await supabase!.from('comments')
      .select('*, profiles:profiles(username,avatar_id)')
      .eq('anime_id', animeId)
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Comments fetch error:', error);
      return [];
    }
    return data || [];
  },

  addComment: async (comment: Partial<Comment>) => {
    if (!checkEnv()) return;
    await supabase!.from('comments').insert([comment]);
  },

  // --- PROFILE ---
  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    if (!checkEnv()) return;
    await supabase!.from('profiles').update(updates).eq('id', userId);
  },
  
  getAdminUsers: async (): Promise<Profile[]> => {
     if (!checkEnv()) return [];
     const { data } = await supabase!.from('profiles').select('*').order('created_at', { ascending: false });
     return data || [];
  },

  updateProfileRole: async (userId: string, role: 'user' | 'admin') => {
    if (!checkEnv()) return;
    await supabase!.from('profiles').update({ role }).eq('id', userId);
  },

  autoPatchEpisodeVideos: async () => {
    if (!checkEnv()) return { patched: 0 };
    const { data, error } = await supabase!
      .from('episodes')
      .select('id, episode_number, seasons:seasons(id, season_number, anime:animes(slug))')
      .is('video_path', null);

    if (error || !data) {
      if (error) console.error('Auto patch fetch error:', error);
      return { patched: 0 };
    }

    const updates = data
      .map((ep: any) => {
        const slug = ep?.seasons?.anime?.slug;
        const seasonNumber = ep?.seasons?.season_number;
        const episodeNumber = ep?.episode_number;
        if (!slug || !seasonNumber || !episodeNumber) return null;
        const path = `https://anirias-videos.b-cdn.net/${slug}/season-${seasonNumber}/episode-${episodeNumber}.mp4`;
        return { id: ep.id, video_path: path };
      })
      .filter(Boolean) as { id: string; video_path: string }[];

    let patched = 0;
    for (const chunk of updates) {
      const { error: updateError } = await supabase!
        .from('episodes')
        .update({ video_path: chunk.video_path, updated_at: new Date().toISOString() })
        .eq('id', chunk.id);
      if (!updateError) patched += 1;
      else console.error('Auto patch update error:', updateError);
    }
    return { patched };
  },

  patchEpisodeVideosRpc: async (animeId: string) => {
    if (!checkEnv()) return { updated: 0 };
    const { data, error } = await supabase!.rpc('patch_episode_videos', { p_anime_id: animeId });
    if (error) throw error;
    return { updated: typeof data === 'number' ? data : 0 };
  },

  getRecentActivities: async (): Promise<ActivityLog[]> => {
    if (!checkEnv()) return [];
    const logs: ActivityLog[] = [];

    const fetchComments = supabase!.from('comments').select('id, text, created_at, user_id, profiles:profiles(username)').order('created_at', { ascending: false }).limit(5);
    const fetchEpisodes = supabase!.from('episodes').select('id, title, episode_number, updated_at, anime_id').order('updated_at', { ascending: false }).limit(5);
    const fetchAnimes = supabase!.from('animes').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(3);

    const [cRes, eRes, aRes] = await Promise.all([fetchComments, fetchEpisodes, fetchAnimes]);

    if (!cRes.error && cRes.data) {
      cRes.data.forEach((c: any) => {
        logs.push({
          id: `c-${c.id}`,
          action: 'Yeni Yorum',
          target: (c.text || '').slice(0, 80) || 'Yorum',
          user: c.profiles?.username || 'Kullanıcı',
          created_at: c.created_at
        });
      });
    }
    if (!eRes.error && eRes.data) {
      eRes.data.forEach((e: any) => {
        logs.push({
          id: `e-${e.id}`,
          action: 'Bölüm Güncellendi',
          target: `${e.title || 'Bölüm'} #${e.episode_number || ''}`,
          user: 'Admin',
          created_at: e.updated_at
        });
      });
    }
    if (!aRes.error && aRes.data) {
      aRes.data.forEach((a: any) => {
        const t = typeof a.title === 'string' ? a.title : a.title?.english || a.title?.romaji || 'Anime';
        logs.push({
          id: `a-${a.id}`,
          action: 'Anime Güncellendi',
          target: t,
          user: 'Admin',
          created_at: a.updated_at
        });
      });
    }

    return logs
      .filter(l => l.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  },

  // --- STATS & UTILS ---
  getStats: async () => {
    if (!checkEnv()) return { totalUsers: 0, totalAnimes: 0, totalViews: 0, totalEpisodes: 0 };
    
    const { count: users } = await supabase!.from('profiles').select('*', { count: 'exact', head: true });
    const { count: animes } = await supabase!.from('animes').select('*', { count: 'exact', head: true });
    const { count: episodes } = await supabase!.from('episodes').select('*', { count: 'exact', head: true });
    
    // View count sum
    const { data: viewsData } = await supabase!.from('animes').select('view_count');
    const totalViews = viewsData?.reduce((acc, curr) => acc + (curr.view_count || 0), 0) || 0;

    return { totalUsers: users || 0, totalAnimes: animes || 0, totalViews: totalViews, totalEpisodes: episodes || 0 };
  },

  getCalendar: async (): Promise<CalendarEntry[]> => {
    if (!checkEnv()) return [];
    const { data, error } = await supabase!
      .from('episodes')
      .select('id, anime_id, episode_number, air_date, status, short_note, animes:animes(*)')
      .not('air_date', 'is', null)
      .order('air_date', { ascending: true });
    if (error) {
      console.error('Calendar fetch error:', error);
      return [];
    }
    return (data || []).map(ep => ({
      id: ep.id,
      anime_id: ep.anime_id,
      episode_id: ep.id,
      episode_number: ep.episode_number,
      air_date: ep.air_date,
      status: (ep as any).status,
      short_note: (ep as any).short_note,
      animes: ep.animes as any
    }));
  },

  getCalendarEpisodes: async (): Promise<(Episode & { anime: Anime | null })[]> => {
    if (!checkEnv()) return [];
    const { data, error } = await supabase!
      .from('episodes')
      .select('*, anime:animes(id,title,cover_image)')
      .order('air_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Calendar episodes fetch error:', error);
      return [];
    }
    return data || [];
  },
  
  getNotifications: async (userId: string): Promise<Notification[]> => {
    if (!checkEnv()) return [];
    const { data, error } = await supabase!
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Notifications error:', error);
      return [];
    }
    return data || [];
  },
  
  markNotificationRead: async (id: string) => {
    if (!checkEnv()) return;
    const { error } = await supabase!.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  }
};
