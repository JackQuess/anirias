
import { supabase, hasSupabaseEnv } from './supabaseClient';
import { Anime, Episode, Season, WatchlistEntry, WatchlistStatus, WatchHistory, CalendarEntry, Notification, Comment, WatchProgress, Profile, ActivityLog } from '../types';

// Helper to ensure Supabase is configured
const checkEnv = () => {
  if (!hasSupabaseEnv || !supabase) {
    if (import.meta.env.DEV) {
      console.warn("Supabase bağlantısı yok. Lütfen .env dosyasını yapılandırın.");
    }
    return false;
  }
  return true;
};

// Helper for backend API calls (admin operations)
const getApiBase = (): string => {
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (!apiBase) {
    throw new Error("Backend API URL not configured (VITE_API_BASE_URL)");
  }
  return apiBase;
};

const callBackendApi = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any,
  adminToken?: string
): Promise<any> => {
  const apiBase = getApiBase();
  const token = adminToken || window.prompt('Admin Token (X-ADMIN-TOKEN)') || '';
  if (!token) {
    throw new Error('Admin token is required');
  }

  const res = await fetch(`${apiBase}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-ADMIN-TOKEN': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  
  if (!res.ok) {
    // Create error with structured information
    const error: any = new Error(data?.error || `HTTP ${res.status}: ${data?.message || 'Unknown error'}`);
    error.errorCode = data?.errorCode;
    error.details = data?.details;
    error.status = res.status;
    throw error;
  }

  return data;
};

export const db = {
  // --- ÖNERİ MOTORU ---
  getPersonalizedRecommendations: async (history: WatchHistory[]): Promise<Anime[]> => {
    if (!checkEnv()) return [];
    
    try {
      // 1. İzlenenlerin türlerini topla
      const genreCounts: Record<string, number> = {};
      history.forEach(h => h.anime?.genres?.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
      const favGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 3);

      if (favGenres.length === 0) return db.getAllAnimes('view_count');

      // 2. Bu türlerdeki animeleri getir (rpc veya filtreleme ile)
      const { data, error } = await supabase!
        .from('animes')
        .select('*')
        .overlaps('genres', favGenres)
        .limit(10);
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getPersonalizedRecommendations] Query error:', error);
        return [];
      }
        
      // 3. Zaten izlediklerini çıkar
      const watchedIds = new Set(history.map(h => h.anime_id));
      return (data || []).filter(a => !watchedIds.has(a.id)).slice(0, 5);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getPersonalizedRecommendations] Unexpected error:', err);
      return [];
    }
  },

  getSimilarAnimes: async (animeId: string): Promise<Anime[]> => {
    if (!checkEnv()) return [];
    
    try {
      // Gerçek bir senaryoda burada embedding vector search kullanılır.
      // Şimdilik aynı türe sahip diğer animeleri getiriyoruz.
      const current = await db.getAnimeById(animeId);
      if (!current || !current.genres) return [];

      const { data, error } = await supabase!
        .from('animes')
        .select('*')
        .overlaps('genres', current.genres.slice(0, 2))
        .neq('id', animeId)
        .limit(6);

      if (error) {
        if (import.meta.env.DEV) console.error('[db.getSimilarAnimes] Query error:', error);
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getSimilarAnimes] Unexpected error:', err);
      return [];
    }
  },

  // --- ANIME READ METHODS ---
  getFeaturedAnimes: async (): Promise<Anime[]> => {
    if (!checkEnv()) return [];
    
    try {
      const { data, error } = await supabase!
        .from('animes')
        .select('*')
        .eq('is_featured', true)
        .order('updated_at', { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) console.error("[db.getFeaturedAnimes] Query error:", error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getFeaturedAnimes] Unexpected error:', err);
      return [];
    }
  },

  getAllAnimes: async (sortBy: string = 'created_at'): Promise<Anime[]> => {
    if (!checkEnv()) return [];
    
    try {
      const { data, error } = await supabase!
        .from('animes')
        .select('*')
        .order(sortBy, { ascending: false });

      if (error) {
        if (import.meta.env.DEV) console.error('[db.getAllAnimes] Query error:', error);
        return [];
      }
      
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getAllAnimes] Unexpected error:', err);
      return [];
    }
  },

  getAnimeById: async (id: string): Promise<Anime | null> => {
    if (!checkEnv()) return null;
    
    try {
      const { data, error } = await supabase!
        .from('animes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        if (import.meta.env.DEV) console.error("[db.getAnimeById] Query error:", error);
        return null;
      }
      return data;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getAnimeById] Unexpected error:', err);
      return null;
    }
  },

  getAnimeByIdOrSlug: async (identifier: string): Promise<Anime | null> => {
    if (!checkEnv()) return null;
    if (!identifier || identifier.trim() === '') {
      if (import.meta.env.DEV) console.warn('[db.getAnimeByIdOrSlug] Empty identifier provided');
      return null;
    }

    // Check if identifier is a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    try {
      let query = supabase!.from('animes').select('*');
      
      if (isUUID) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('slug', identifier);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) {
        if (import.meta.env.DEV) console.error("[db.getAnimeByIdOrSlug] Query error:", error);
        return null;
      }
      
      if (!data) {
        if (import.meta.env.DEV) console.warn(`[db.getAnimeByIdOrSlug] Anime not found for ${isUUID ? 'id' : 'slug'}:`, identifier);
        return null;
      }
      
      return data;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getAnimeByIdOrSlug] Unexpected error:', err);
      return null;
    }
  },

  getAnimeBySlug: async (slug: string): Promise<Anime | null> => {
    if (!checkEnv()) return null;
    if (!slug || slug.trim() === '') {
      if (import.meta.env.DEV) console.warn('[db.getAnimeBySlug] Empty slug provided');
      return null;
    }
    
    try {
      const { data, error } = await supabase!
        .from('animes')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) {
        if (import.meta.env.DEV) console.error("[db.getAnimeBySlug] Query error:", error);
        return null;
      }
      
      if (!data) {
        // Anime not found - this is a valid state (slug might be missing or incorrect)
        // UI should handle this gracefully by showing "Anime not found" message
        if (import.meta.env.DEV) console.warn("[db.getAnimeBySlug] Anime not found for slug:", slug);
        return null;
      }
      
      // Verify slug is not null/empty in the returned data
      if (!data.slug || data.slug.trim() === '') {
        if (import.meta.env.DEV) console.warn("[db.getAnimeBySlug] Anime found but slug is missing:", data.id);
        // Still return the data - UI can handle missing slug
      }
      
      return data;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getAnimeBySlug] Unexpected error:', err);
      return null;
    }
  },

  // --- ANIME WRITE METHODS (ADMIN) ---
  // NOTE: All admin write operations now use backend APIs for security
  // Frontend only uses anon key for read operations and user data (RLS protected)
  
  createAnime: async (anime: Partial<Anime>, adminToken?: string): Promise<Anime> => {
    // Admin operation - must use backend API
    // TODO: Implement backend API endpoint and call it here
    throw new Error(
      'createAnime: Admin operations must use backend API.\n' +
      'Please implement backend endpoint: POST /api/admin/create-anime'
    );
  },

  updateAnime: async (id: string, updates: Partial<Anime>, adminToken?: string): Promise<void> => {
    // Admin operation - must use backend API
    // TODO: Implement backend API endpoint and call it here
    throw new Error(
      'updateAnime: Admin operations must use backend API.\n' +
      'Please implement backend endpoint: PUT /api/admin/update-anime/:id'
    );
  },

  deleteAnime: async (id: string, adminToken?: string): Promise<{ success: boolean; deleted?: any; error?: string }> => {
    // Use backend API for complete cascade deletion
    try {
      const data = await callBackendApi('/api/admin/delete-anime', 'POST', { animeId: id }, adminToken);
      return { success: true, deleted: data.deleted };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to delete anime' };
    }
  },

  toggleFeatured: async (animeId: string, status: boolean, adminToken?: string): Promise<Anime> => {
    // Admin operation - use backend API
    const apiBase = getApiBase();
    const token = adminToken || window.prompt('Admin Token (X-ADMIN-TOKEN)') || '';
    if (!token) {
      throw new Error('Admin token is required');
    }

    try {
      const res = await fetch(`${apiBase}/api/admin/toggle-featured`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ADMIN-TOKEN': token,
        },
        body: JSON.stringify({
          anime_id: animeId,
          featured: status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}: Failed to toggle featured status`);
      }

      // Fetch updated anime to return
      const updatedAnime = await db.getAnimeById(animeId);
      if (!updatedAnime) {
        throw new Error('Anime not found after update');
      }

      return updatedAnime;
    } catch (error: any) {
      throw new Error(`Failed to toggle featured status: ${error?.message || 'Unknown error'}`);
    }
  },

  // --- SEASONS & EPISODES ---
  getSeasons: async (animeId: string): Promise<Season[]> => {
    if (!checkEnv()) return [];
    
    try {
      const { data, error } = await supabase!
        .from('seasons')
        .select('*')
        .eq('anime_id', animeId)
        .order('season_number', { ascending: true });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getSeasons] Query error:', error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getSeasons] Unexpected error:', err);
      return [];
    }
  },

  getSeasonByAnimeAndNumber: async (animeId: string, seasonNumber: number): Promise<Season | null> => {
    if (!checkEnv()) return null;
    if (!animeId || !seasonNumber) return null;
    
    try {
      const { data, error } = await supabase!
        .from('seasons')
        .select('*')
        .eq('anime_id', animeId)
        .eq('season_number', seasonNumber)
        .maybeSingle();
      
      if (error) {
        if (import.meta.env.DEV) console.error("[db.getSeasonByAnimeAndNumber] Query error:", error);
        return null;
      }
      
      return data;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getSeasonByAnimeAndNumber] Unexpected error:', err);
      return null;
    }
  },

  createSeason: async (season: Partial<Season>, adminToken?: string): Promise<Season> => {
    // Admin operation - use backend API
    const apiBase = getApiBase();
    const token = adminToken || window.prompt('Admin Token (X-ADMIN-TOKEN)') || '';
    if (!token) {
      throw new Error('Admin token is required');
    }

    try {
      const res = await fetch(`${apiBase}/api/admin/create-season`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ADMIN-TOKEN': token,
        },
        body: JSON.stringify({
          anime_id: season.anime_id,
          season_number: season.season_number,
          title: season.title,
          anilist_id: season.anilist_id || null,
          episode_count: season.episode_count || null,
          expected_episode_count: (season as any).expected_episode_count || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}: Failed to create season`);
      }

      if (!data.success || !data.season) {
        throw new Error(data?.error || 'Failed to create season');
      }

      return data.season as Season;
    } catch (error: any) {
      throw new Error(`Failed to create season: ${error?.message || 'Unknown error'}`);
    }
  },

  updateSeason: async (id: string, updates: Partial<Season>, adminToken?: string): Promise<void> => {
    // Admin operation - must use backend API
    // TODO: Implement backend API endpoint and call it here
    throw new Error(
      'updateSeason: Admin operations must use backend API.\n' +
      'Please implement backend endpoint: PUT /api/admin/update-season/:id'
    );
  },

  deleteSeason: async (id: string, adminToken?: string): Promise<void> => {
    // Admin operation - must use backend API
    // TODO: Implement backend API endpoint and call it here
    throw new Error(
      'deleteSeason: Admin operations must use backend API.\n' +
      'Please implement backend endpoint: DELETE /api/admin/delete-season/:id'
    );
  },

  bindAniListSeason: async (
    seasonId: string,
    anilistMediaId: number,
    anilistMedia: {
      id: number;
      format: string;
      episodes: number | null;
      seasonYear: number | null;
    },
    animeId?: string,
    seasonNumber?: number
  ): Promise<Season> => {
    // Use backend API for transactional binding
    // No authentication required - backend uses service role key
    try {
      const apiBase = getApiBase();

      const res = await fetch(`${apiBase}/api/admin/anilist/bind-season`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          season_id: seasonId,
          anime_id: animeId, // Include for reliable lookup
          season_number: seasonNumber, // Include for reliable lookup
          anilist_media_id: anilistMediaId,
          anilist_media: anilistMedia,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const err: any = new Error(data?.error || 'Failed to bind season to AniList');
        err.errorCode = data?.errorCode;
        err.details = data?.details;
        throw err;
      }

      if (!data.success || !data.season) {
        throw new Error(data?.error || 'Failed to bind season to AniList');
      }

      return data.season as Season;
    } catch (error: any) {
      // Re-throw with structured error information
      const err: any = new Error(error?.message || 'Failed to bind season to AniList');
      err.errorCode = error?.errorCode;
      err.details = error?.details;
      throw err;
    }
  },

  // Admin panel: Get episodes by season_id directly (for admin use only)
  getEpisodesBySeasonId: async (seasonId: string): Promise<Episode[]> => {
    if (!checkEnv()) return [];
    if (!seasonId) return [];
    
    try {
      const { data, error } = await supabase!
        .from('episodes')
        .select('id, anime_id, season_id, season_number, episode_number, title, duration_seconds, duration, video_url, hls_url, status, error_message, short_note, air_date, updated_at, created_at')
        .eq('season_id', seasonId)
        .order('episode_number', { ascending: true });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getEpisodesBySeasonId] Query error:', error);
        return [];
      }
      
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getEpisodesBySeasonId] Unexpected error:', err);
      return [];
    }
  },

  getEpisodeBySeasonAndNumber: async (seasonId: string, episodeNumber: number): Promise<Episode | null> => {
    if (!checkEnv()) return null;
    if (!seasonId || !episodeNumber) return null;
    
    try {
      const { data, error } = await supabase!
        .from('episodes')
        .select('id, anime_id, season_id, season_number, episode_number, title, duration_seconds, duration, video_url, hls_url, status, error_message, short_note, air_date, updated_at, created_at')
        .eq('season_id', seasonId)
        .eq('episode_number', episodeNumber)
        .maybeSingle();
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getEpisodeBySeasonAndNumber] Query error:', error);
        return null;
      }
      
      return data;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getEpisodeBySeasonAndNumber] Unexpected error:', err);
      return null;
    }
  },

  getEpisodes: async (animeId: string, seasonId?: string): Promise<Episode[]> => {
    if (!checkEnv()) return [];
    
    try {
      // CRITICAL FIX: Episodes are now linked via season_id -> seasons -> anime_id
      // New imports (e.g. Overlord) don't have direct episodes.anime_id
      // Must use JOIN via seasons table to fetch episodes correctly
      // Query pattern: SELECT e.* FROM episodes e JOIN seasons s ON s.id = e.season_id WHERE s.anime_id = ?
      // ORDER BY s.season_number, e.episode_number
      
      // Step 1: Fetch all season IDs for this anime
      const { data: seasons, error: seasonsError } = await supabase!
        .from('seasons')
        .select('id, season_number')
        .eq('anime_id', animeId)
        .order('season_number', { ascending: true });
      
      if (seasonsError) {
        if (import.meta.env.DEV) console.error('[db.getEpisodes] Seasons query error:', seasonsError);
        return [];
      }
      
      if (!seasons || seasons.length === 0) {
        return [];
      }
      
      const seasonIds = seasons.map(s => s.id);
      const seasonMap = new Map(seasons.map(s => [s.id, s.season_number]));
      
      // Step 2: Fetch all episodes for these seasons
      let query = supabase!
        .from('episodes')
        .select('id, anime_id, season_id, season_number, episode_number, title, duration_seconds, duration, video_url, hls_url, status, error_message, short_note, air_date, updated_at, created_at')
        .in('season_id', seasonIds);
      
      // If seasonId is provided (for backward compatibility), filter by it
      if (seasonId) {
        query = query.eq('season_id', seasonId);
      }
      
      const { data, error } = await query.order('episode_number', { ascending: true });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getEpisodes] Episodes query error:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Enrich episodes with season_number from seasonMap
      
      // Step 3: Enrich episodes with season_number from seasonMap (in case episode.season_number is NULL)
      const enrichedEpisodes = (data as any[]).map((ep: any) => {
        const seasonNumber = ep.season_number ?? seasonMap.get(ep.season_id) ?? 0;
        return {
          ...ep,
          season_number: seasonNumber,
          anime_id: ep.anime_id || animeId, // Ensure anime_id is set
        };
      });
      
      // Step 4: Sort by season_number, then episode_number
      const sorted = enrichedEpisodes.sort((a, b) => {
        const aSeason = a.season_number ?? 0;
        const bSeason = b.season_number ?? 0;
        if (aSeason !== bSeason) return aSeason - bSeason;
        return a.episode_number - b.episode_number;
      });
      
      return sorted as Episode[];
    } catch (err) {
      console.error('[db.getEpisodes] Unexpected error:', err);
      return [];
    }
  },

  createEpisode: async (episode: Partial<Episode>, adminToken?: string): Promise<Episode> => {
    // Admin operation - must use backend API
    // TODO: Implement backend API endpoint and call it here
    throw new Error(
      'createEpisode: Admin operations must use backend API.\n' +
      'Please implement backend endpoint: POST /api/admin/create-episode\n' +
      'Or use direct Supabase call with service role key in backend only.'
    );
  },

  updateEpisode: async (id: string, updates: Partial<Episode>, adminToken?: string): Promise<Episode> => {
    // Admin operation - must use backend API
    // TODO: Implement backend API endpoint and call it here
    throw new Error(
      'updateEpisode: Admin operations must use backend API.\n' +
      'Please implement backend endpoint: PUT /api/admin/update-episode/:id'
    );
  },

  deleteEpisode: async (id: string, adminToken?: string): Promise<void> => {
    // Admin operation - must use backend API
    // TODO: Implement backend API endpoint and call it here
    throw new Error(
      'deleteEpisode: Admin operations must use backend API.\n' +
      'Please implement backend endpoint: DELETE /api/admin/delete-episode/:id'
    );
  },

  getLatestEpisodes: async (limit?: number, offset?: number): Promise<(Episode & { anime: Anime })[]> => {
    if (!checkEnv()) return [];
    
    try {
      // CRITICAL FIX: Episodes are now linked via season_id -> seasons -> anime_id
      // Must join through seasons to get anime relation for new imports
      // Use seasons!inner(anime:animes(*)) to ensure we get anime via seasons
      let query = supabase!
        .from('episodes')
        .select('id, anime_id, season_id, season_number, episode_number, title, duration_seconds, duration, video_url, hls_url, status, error_message, short_note, air_date, updated_at, created_at, seasons!inner(anime:animes(*))')
        .order('created_at', { ascending: false }); // Initial order, will be sorted client-side
      
      if (limit !== undefined && offset !== undefined) {
        // Supabase range is inclusive: range(0, 23) returns 24 items
        query = query.range(offset, offset + limit - 1);
      } else if (limit !== undefined) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
        
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getLatestEpisodes] Query error:', error);
        return [];
      }
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      // Extract and flatten the nested structure
      // Supabase returns: { episode fields, seasons: { anime: { ... } } }
      // We need: { episode fields, anime: { ... } }
      const flattened = data.map((item: any) => {
        const anime = item.seasons?.anime || item.anime || null;
        return {
          ...item,
          anime_id: item.anime_id || item.seasons?.anime?.id || null,
          anime: anime,
        };
      });
      
      // Client-side sorting: air_date DESC, fallback to created_at DESC for NULL air_date
      const sorted = flattened.sort((a: any, b: any) => {
        const aDate = a.air_date ? new Date(a.air_date).getTime() : null;
        const bDate = b.air_date ? new Date(b.air_date).getTime() : null;
        
        if (aDate !== null && bDate !== null) {
          return bDate - aDate; // Both have air_date: DESC
        }
        if (aDate !== null && bDate === null) {
          return -1; // a has air_date, b doesn't: a comes first
        }
        if (aDate === null && bDate !== null) {
          return 1; // b has air_date, a doesn't: b comes first
        }
        // Both are NULL: use created_at DESC
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Type assertion: Supabase returns anime as single object (not array) for foreign key relations
      return sorted as unknown as (Episode & { anime: Anime })[];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getLatestEpisodes] Unexpected error:', err);
      return [];
    }
  },

  // --- USER DATA ---
  getWatchlist: async (userId: string): Promise<WatchlistEntry[]> => {
    if (!checkEnv()) return [];
    
    try {
      // PostgREST join syntax: anime:animes(*) uses the foreign key constraint
      // If this fails with 400, the FK constraint may be missing or misnamed
      const { data, error } = await supabase!
        .from('watchlist')
        .select('*, anime:animes(*)')
        .eq('user_id', userId);
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[db.getWatchlist] Query error:', error);
          console.error('[db.getWatchlist] Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
        }
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getWatchlist] Unexpected error:', err);
      return [];
    }
  },

  updateWatchlist: async (userId: string, animeId: string, status: WatchlistStatus) => {
    if (!checkEnv()) {
      if (import.meta.env.DEV) console.warn('[db.updateWatchlist] Supabase not configured');
      return;
    }
    
    try {
      const { error } = await supabase!
        .from('watchlist')
        .upsert({ 
          user_id: userId, 
          anime_id: animeId, 
          status, 
          updated_at: new Date().toISOString() 
        });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.updateWatchlist] Error:', error);
        throw error;
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.updateWatchlist] Unexpected error:', err);
      throw err;
    }
  },

  saveWatchProgress: async (progress: Partial<WatchProgress>) => {
    if (!checkEnv()) return;
    // User data - allowed with RLS protection
    await supabase!.from('watch_progress').upsert(progress);
    
    // NOTE: View count updates should be handled by:
    // 1. Database triggers (preferred)
    // 2. Backend API endpoints
    // NOT by direct frontend updates to animes table
  },

  getWatchProgress: async (userId: string, animeId: string, episodeId: string): Promise<WatchProgress | null> => {
    if (!checkEnv()) return null;
    
    try {
      const { data, error } = await supabase!
        .from('watch_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('anime_id', animeId)
        .eq('episode_id', episodeId)
        .maybeSingle();
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getWatchProgress] Query error:', error);
        return null;
      }
      return data;
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getWatchProgress] Unexpected error:', err);
      return null;
    }
  },

  getWatchProgressForAnime: async (userId: string, animeId: string): Promise<Array<{ episode_id: string; progress_seconds: number; duration_seconds: number }>> => {
    if (!checkEnv()) return [];
    
    try {
      const { data, error } = await supabase!
        .from('watch_progress')
        .select('episode_id, progress_seconds, duration_seconds')
        .eq('user_id', userId)
        .eq('anime_id', animeId);
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getWatchProgressForAnime] Query error:', error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getWatchProgressForAnime] Unexpected error:', err);
      return [];
    }
  },

  getContinueWatching: async (userId: string): Promise<WatchProgress[]> => {
    if (!checkEnv()) return [];
    
    try {
      const { data, error } = await supabase!
        .from('watch_progress')
        .select('*, anime:animes(*), episode:episodes(*)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getContinueWatching] Query error:', error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getContinueWatching] Unexpected error:', err);
      return [];
    }
  },

  addToWatchHistory: async (history: Partial<WatchHistory>) => {
    if (!checkEnv()) return;
    await supabase!.from('watch_history').insert([history]);
  },

  getWatchHistory: async (userId: string): Promise<WatchHistory[]> => {
    if (!checkEnv()) return [];
    
    try {
      const { data, error } = await supabase!
        .from('watch_history')
        .select('*, anime:animes(*), episode:episodes(*)')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getWatchHistory] Query error:', error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getWatchHistory] Unexpected error:', err);
      return [];
    }
  },

  // --- COMMENTS ---
  getComments: async (animeId: string, episodeId: string): Promise<Comment[]> => {
    if (!checkEnv()) return [];
    
    // CRITICAL: Never query with undefined/null/"all" IDs
    if (!animeId || !episodeId || 
        typeof animeId !== 'string' || typeof episodeId !== 'string' ||
        animeId === 'all' || episodeId === 'all' ||
        animeId.trim() === '' || episodeId.trim() === '') {
      if (import.meta.env.DEV) console.warn('[db.getComments] Invalid IDs provided:', { animeId, episodeId });
      return [];
    }
    
    try {
      // Use .match() instead of .eq() to avoid RLS/nullable column issues
      const { data, error } = await supabase!
        .from('comments')
        .select('*, profiles:profiles(username,avatar_id)')
        .match({
          anime_id: animeId,
          episode_id: episodeId,
        })
        .order('created_at', { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getComments] Query error:', error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      // CRITICAL: Never throw - always return empty array on error
      if (import.meta.env.DEV) console.error('[db.getComments] Unexpected error:', err);
      return [];
    }
  },

  addComment: async (comment: Partial<Comment>) => {
    if (!checkEnv()) return;
    const payload = {
      user_id: comment.user_id,
      anime_id: comment.anime_id,
      episode_id: comment.episode_id ?? null,
      text: comment.text,
      created_at: new Date().toISOString()
    };
    await supabase!.from('comments').insert([payload]);
  },

  // --- PROFILE ---
  updateProfile: async (userId: string, updates: Partial<Profile>): Promise<Profile> => {
    if (!checkEnv()) throw new Error("Backend connection failed");
    
    // Filter out undefined/null values and only include fields that exist
    const safeUpdates: Record<string, any> = {};
    if (updates.bio !== undefined) safeUpdates.bio = updates.bio;
    if (updates.avatar_id !== undefined) safeUpdates.avatar_id = updates.avatar_id;
    if (updates.banner_id !== undefined) safeUpdates.banner_id = updates.banner_id;
    if (updates.username !== undefined) safeUpdates.username = updates.username;
    if (updates.avatar_url !== undefined) safeUpdates.avatar_url = updates.avatar_url;
    if (updates.banner_url !== undefined) safeUpdates.banner_url = updates.banner_url;
    
    // Always update updated_at (required for tracking)
    safeUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase!
      .from('profiles')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('[db.updateProfile] Full Error:', error);
      console.error('[db.updateProfile] Error Code:', error.code);
      console.error('[db.updateProfile] Error Message:', error.message);
      console.error('[db.updateProfile] Error Details:', error.details);
      console.error('[db.updateProfile] Error Hint:', error.hint);
      console.error('[db.updateProfile] Update Payload:', safeUpdates);
      
      // Check for specific error types
      if (error.code === '42703' || (error.message?.includes('column') && error.message?.includes('does not exist'))) {
        throw new Error(`Sütun bulunamadı: ${error.message}. Lütfen migration'ı kontrol edin: supabase/sql/add_profile_columns.sql`);
      }
      
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error(`Tablo bulunamadı: ${error.message}`);
      }
      
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        throw new Error(`İzin hatası: Profil güncelleme yetkiniz yok. RLS politikalarını kontrol edin.`);
      }
      
      // Generic error with full details
      throw new Error(`Profil güncellenemedi: ${error.message || error.code || 'Bilinmeyen hata'}`);
    }
    
    if (!data) {
      throw new Error('Profil güncellendi ancak veri alınamadı');
    }
    
    return data as Profile;
  },
  
  getAdminUsers: async (): Promise<Profile[]> => {
     if (!checkEnv()) return [];
     
     try {
       const { data, error } = await supabase!
         .from('profiles')
         .select('*')
         .order('created_at', { ascending: false });
       
       if (error) {
         if (import.meta.env.DEV) console.error('[db.getAdminUsers] Query error:', error);
         return [];
       }
       return Array.isArray(data) ? data : [];
     } catch (err: any) {
       if (import.meta.env.DEV) console.error('[db.getAdminUsers] Unexpected error:', err);
       return [];
     }
  },

  updateProfileRole: async (userId: string, role: 'user' | 'admin', adminToken?: string): Promise<void> => {
    // Admin operation - must use backend API
    // TODO: Implement backend API endpoint and call it here
    throw new Error(
      'updateProfileRole: Admin operations must use backend API.\n' +
      'Please implement backend endpoint: PUT /api/admin/update-profile-role/:userId'
    );
  },

  autoPatchEpisodeVideos: async () => {
    if (!checkEnv()) return { patched: 0 };
    const { data, error } = await supabase!
      .from('episodes')
      .select('id, episode_number, seasons:seasons(id, season_number, anime:animes(slug))')
      .is('video_url', null);

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
        const padded = String(episodeNumber).padStart(2, '0');
        const path = `https://anirias-videos.b-cdn.net/${slug}/season-${seasonNumber}/episode-${padded}.mp4`;
        return { id: ep.id, video_url: path };
      })
      .filter(Boolean) as { id: string; video_url: string }[];

    let patched = 0;
    for (const chunk of updates) {
      const { error: updateError } = await supabase!
        .from('episodes')
        .update({ video_url: chunk.video_url, updated_at: new Date().toISOString() })
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
    
    try {
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
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getRecentActivities] Unexpected error:', err);
      return [];
    }
  },

  // --- STATS & UTILS ---
  getStats: async () => {
    if (!checkEnv()) return { totalUsers: 0, totalAnimes: 0, totalViews: 0, totalEpisodes: 0 };
    
    try {
      const { count: users } = await supabase!.from('profiles').select('*', { count: 'exact', head: true });
      const { count: animes } = await supabase!.from('animes').select('*', { count: 'exact', head: true });
      const { count: episodes } = await supabase!.from('episodes').select('*', { count: 'exact', head: true });
      
      // View count sum
      const { data: viewsData, error: viewsError } = await supabase!.from('animes').select('view_count');
      
      if (viewsError) {
        if (import.meta.env.DEV) console.error('[db.getStats] Views query error:', viewsError);
      }
      
      const totalViews = viewsData?.reduce((acc, curr) => acc + (curr.view_count || 0), 0) || 0;

      return { totalUsers: users || 0, totalAnimes: animes || 0, totalViews: totalViews, totalEpisodes: episodes || 0 };
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getStats] Unexpected error:', err);
      return { totalUsers: 0, totalAnimes: 0, totalViews: 0, totalEpisodes: 0 };
    }
  },

  getCalendar: async (): Promise<CalendarEntry[]> => {
    if (!checkEnv()) return [];
    
    try {
      // CRITICAL FIX: Episodes are now linked via season_id -> seasons -> anime_id
      // Must join through seasons to get anime relation for new imports
      const { data, error } = await supabase!
        .from('episodes')
        .select('id, anime_id, season_id, season_number, episode_number, air_date, status, short_note, seasons!inner(anime:animes(*))')
        .not('air_date', 'is', null)
        .order('air_date', { ascending: true });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getCalendar] Query error:', error);
        return [];
      }
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      // Extract and flatten the nested structure
      return data.map((ep: any) => {
        const anime = ep.seasons?.anime || ep.animes || null;
        return {
          id: ep.id,
          anime_id: ep.anime_id || anime?.id || null,
          episode_id: ep.id,
          episode_number: ep.episode_number,
          season_number: ep.season_number || ep.seasons?.season_number || null,
          air_date: ep.air_date,
          status: ep.status,
          short_note: ep.short_note,
          animes: anime,
          anime: anime // Alias for easier access
        };
      });
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getCalendar] Unexpected error:', err);
      return [];
    }
  },

  getCalendarEpisodes: async (): Promise<(Episode & { anime: Anime | null })[]> => {
    if (!checkEnv()) return [];
    
    try {
      // CRITICAL FIX: Episodes are now linked via season_id -> seasons -> anime_id
      // Must join through seasons to get anime relation for new imports
      const { data, error } = await supabase!
        .from('episodes')
        .select('*, seasons!inner(anime:animes(id,title,cover_image))')
        .order('air_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) console.error('[db.getCalendarEpisodes] Query error:', error);
        return [];
      }
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      // Extract and flatten the nested structure
      return data.map((ep: any) => ({
        ...ep,
        anime: ep.seasons?.anime || ep.anime || null,
        anime_id: ep.anime_id || ep.seasons?.anime?.id || null,
      })) as (Episode & { anime: Anime | null })[];
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[db.getCalendarEpisodes] Unexpected error:', err);
      return [];
    }
  },
  
  getNotifications: async (userId: string): Promise<Notification[]> => {
    if (!checkEnv()) return [];
    
    try {
      const { data, error } = await supabase!
        .from('notifications')
        .select('id, user_id, type, title, body, anime_id, episode_id, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Silently fail - notifications table might not exist
        if (import.meta.env.DEV) console.error('[db.getNotifications] Query error:', error);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      // Silently fail - prevent app crash
      if (import.meta.env.DEV) console.error('[db.getNotifications] Unexpected error:', err);
      return [];
    }
  },
  
  markNotificationRead: async (id: string) => {
    if (!checkEnv()) return;
    const { error } = await supabase!.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  }
};
