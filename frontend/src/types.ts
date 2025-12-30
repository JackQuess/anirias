
export interface Profile {
  id: string;
  username: string | null;
  role: 'user' | 'admin';
  created_at: string;
  bio?: string;
  avatar_id?: string | null;
  banner_id?: string | null;
  avatar_url?: string;
  banner_url?: string;
}

export interface Anime {
  id: string;
  anilist_id: number | null;
  slug?: string | null;
  title: {
    romaji: string;
    english: string;
  };
  description: string | null;
  cover_image: string | null;
  banner_image: string | null;
  score: number;
  year: number;
  genres: string[];
  tags?: string[];
  view_count: number;
  is_featured?: boolean; // New field for Hero Slider
  is_adult?: boolean; // +18 age restriction flag
  rating?: string | null; // AniList rating (e.g. "R18", "Rx", "PG-13")
  updated_at: string;
  created_at: string;
  ai_summary?: string;
}

export interface Season {
  id: string;
  anime_id: string;
  season_number: number;
  anilist_id?: number | null;
  title_override?: string | null;
  year?: number | null;
  episode_count?: number | null;
  title: string | null;
  created_at: string;
}

export interface Episode {
  id: string;
  anime_id: string;
  season_id: string;
  season_number?: number | null;
  episode_number: number;
  title: string;
  duration_seconds: number;
  duration?: number | null;
  video_url?: string | null;
  stream_id?: string | null;
  hls_url?: string | null;
  status?: string | null;
  error_message?: string | null;
  short_note?: string | null;
  air_date?: string | null;
  intro_start?: number | null;
  intro_end?: number | null;
  updated_at: string;
  created_at: string;
  seasons?: {
    season_number?: number | null;
    anime?: {
      slug?: string | null;
    } | null;
  } | null;
}

export type WatchlistStatus = 'watching' | 'planning' | 'completed' | 'dropped' | 'paused';

export interface WatchlistEntry {
  id: string;
  user_id: string;
  anime_id: string;
  status: WatchlistStatus;
  score?: number;
  updated_at: string;
  anime?: Anime;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_episode' | 'admin' | 'system' | 'upcoming' | 'released';
  title: string;
  body: string;
  anime_id?: string | null;
  episode_id?: string | null;
  is_read: boolean;
  created_at: string;
  episode?: {
    season_number?: number | null;
    episode_number?: number | null;
    anime_slug?: string | null;
  } | null;
}

export interface ActivityLog {
  id: string;
  action: string;
  target: string;
  user: string;
  created_at: string;
}

export interface WatchProgress {
  user_id: string;
  anime_id: string;
  episode_id: string;
  progress_seconds: number;
  duration_seconds: number;
  updated_at: string;
  anime?: Anime;
  episode?: Episode;
}

export interface WatchHistory {
  id: string;
  user_id: string;
  anime_id: string;
  episode_id: string;
  completed_at: string;
  anime?: Anime;
  episode?: Episode;
}

export interface CalendarEntry {
  id: string;
  anime_id: string;
  episode_id?: string;
  episode_number: number;
  season_number?: number | null;
  air_date: string;
  animes?: Anime;
  anime?: Anime; // Alias for animes (for consistency)
  status?: string | null;
  short_note?: string | null;
}

export interface CommentProfile {
  username?: string | null;
  avatar_id?: string | null;
}

export interface Comment {
  id: string;
  user_id: string;
  anime_id: string;
  episode_id?: number | string | null;
  episode_no?: number | null;
  text: string;
  created_at: string;
  user?: Profile;
  profiles?: CommentProfile;
}

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  source: 'animely' | 'system' | 'downloader' | 'import';
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export type AuthStatus = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export interface LoadState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

export interface Feedback {
  id: string;
  user_id: string | null;
  message: string;
  rating: number | null;
  page_url: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: Profile | null;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ErrorLog {
  id: string;
  user_id: string | null;
  message: string;
  stack: string | null;
  page_url: string;
  user_agent: string | null;
  is_resolved: boolean;
  created_at: string;
  profiles?: Profile | null;
}
