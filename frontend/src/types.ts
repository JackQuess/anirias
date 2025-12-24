
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
  short_note?: string | null;
  air_date?: string | null;
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
  title: string;
  message: string;
  type: 'episode' | 'system' | 'social';
  is_read: boolean;
  link?: string;
  created_at: string;
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
  air_date: string;
  animes?: Anime;
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

export type AuthStatus = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export interface LoadState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}
