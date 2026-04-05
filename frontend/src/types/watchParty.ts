export type WatchPartyRoomRow = {
  id: string;
  code: string;
  created_by: string;
  host_user_id: string;
  anime_id: string | null;
  episode_id: string;
  status: 'active' | 'ended';
  visibility: 'private';
  is_playing: boolean;
  playback_time: number;
  last_action: 'play' | 'pause' | 'seek' | 'sync' | null;
  last_action_by: string | null;
  playback_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WatchPartyMemberRow = {
  id: string;
  room_id: string;
  user_id: string;
  role: 'host' | 'viewer';
  joined_at: string;
  last_seen_at: string;
  is_online: boolean;
};

export type WatchPartyProfileMini = {
  id: string;
  username: string | null;
};
