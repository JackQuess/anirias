
export interface Profile {
  id: string;
  username: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at?: string | null;
  bio?: string;
  avatar_id?: string | null;
  banner_id?: string | null;
  avatar_url?: string;
  banner_url?: string;
  /** 18+ içerik uyarısı bir kez onaylandı (Supabase profiles; cihazlar arası). */
  is_adult_confirmed?: boolean | null;
  is_banned?: boolean | null;
  ban_reason?: string | null;
  banned_at?: string | null;
  banned_until?: string | null;
  account_warning_message?: string | null;
  account_warning_updated_at?: string | null;
  account_warning_seen_at?: string | null;
}

export type ActivePlan = 'free' | 'pro' | 'pro_max';

export interface Anime {
  id: string;
  anilist_id: number | null;
  slug?: string | null;
  title: {
    romaji: string;
    english: string;
  };
  description: string | null;
  description_tr?: string | null;
  cover_image: string | null;
  banner_image: string | null;
  score: number;
  year: number;
  genres: string[];
  /** AniList format: TV, MOVIE, OVA, ONA, SPECIAL, TV_SHORT, MUSIC */
  format?: string | null;
  tags?: string[];
  view_count: number;
  is_featured?: boolean; // New field for Hero Slider
  is_adult?: boolean; // +18 age restriction flag
  /** AniList content label when stored in dedicated column (migration). */
  anilist_content_rating?: string | null;
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

/** External WebVTT subtitles for the in-app player (not embed). */
export interface EpisodeSubtitleTrack {
  url: string;
  label: string;
  lang?: string;
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
  /** Optional WebVTT tracks; requires CORS on the VTT host when cross-origin. */
  subtitle_tracks?: EpisodeSubtitleTrack[] | null;
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

/** Admin analitik: site_page_views + admin_site_traffic_summary RPC */
export interface SiteTrafficSummary {
  viewsLast24h: number;
  viewsLast7d: number;
  uniqueSessions24h: number;
  uniqueSessions7d: number;
  topPaths: { path: string; count: number }[];
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

export interface PublicCalendarEntry {
  animeId: string;
  slug: string | null;
  title: string;
  episodeNumber: number;
  airingAt: string;
  isReleased: boolean;
  releasedAt: string | null;
  coverImage: string | null;
  statusBadge: 'YAYINLANDI' | 'BUGÜN' | 'YAKINDA';
}

export interface CommentProfile {
  username?: string | null;
  avatar_id?: string | null;
  role?: 'user' | 'admin' | string | null;
}

export interface Comment {
  id: string;
  user_id: string;
  anime_id: string;
  episode_id?: number | string | null;
  episode_no?: number | null;
  parent_id?: string | null;
  is_spoiler?: boolean;
  text: string;
  created_at: string;
  /** Yumuşak silme (migration sonrası); silinenler public listede görünmez */
  deleted_at?: string | null;
  deleted_kind?: 'user' | 'admin' | 'report' | string | null;
  deleted_reason?: string | null;
  user?: Profile;
  profiles?: CommentProfile;
  animes?: { title?: { romaji?: string; english?: string } | null; slug?: string | null } | null;
  /** Enriched on read; not a DB column */
  like_count?: number;
  liked_by_me?: boolean;
  replies?: Comment[];
}

export interface CommentReportListItem {
  id: string;
  comment_id: string;
  reporter_user_id: string;
  reason: string;
  details?: string | null;
  created_at: string;
  comment: Comment | null;
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

export type TeamApplicationStatus =
  | 'pending'
  | 'contacted'
  | 'trial_assigned'
  | 'accepted'
  | 'rejected'
  | 'archived';

export interface TeamApplicationRecord {
  id: string;
  user_id: string | null;
  site_username: string | null;
  display_name: string;
  email: string;
  discord_or_social: string | null;
  role_interests: string[];
  weekly_availability: string;
  skills_text: string;
  previous_experience: string | null;
  contribution_plan: string;
  operations_scenario: string;
  review_process_answer: string;
  trial_task_preference: string;
  trial_task_answer: string;
  conflict_scenario: string;
  motivation_text: string;
  ack_volunteer_basis: boolean;
  ack_admin_review: boolean;
  ack_limited_access: boolean;
  status: TeamApplicationStatus;
  admin_notes: string | null;
  trial_task_assigned: string | null;
  trial_score: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  page_url: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile | null;
}

export interface SupportConversation {
  id: string;
  user_id: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_role: 'user' | 'admin';
  sender_user_id: string;
  message: string;
  created_at: string;
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
