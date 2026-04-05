import { supabase } from './supabaseClient';
import type { WatchPartyMemberRow, WatchPartyProfileMini, WatchPartyRoomRow } from '../types/watchParty';

export type WatchPartyWatchPath = {
  animeSlug: string;
  seasonNumber: number;
  episodeNumber: number;
};

const getApiBase = (): string => {
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (!apiBase || typeof apiBase !== 'string' || !apiBase.trim()) {
    throw new Error('VITE_API_BASE_URL not configured');
  }
  return apiBase.replace(/\/+$/, '');
};

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('NOT_AUTHENTICATED');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  };
}

async function parseJson<T>(res: Response): Promise<T & { error?: string }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export async function createWatchParty(
  episodeId: string,
  animeId: string | null
): Promise<{ room: WatchPartyRoomRow; role: 'host'; watchPath: WatchPartyWatchPath | null }> {
  const base = getApiBase();
  const headers = await authHeaders();
  const res = await fetch(`${base}/api/watch-party/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ episodeId, animeId }),
  });
  const data = await parseJson<{
    room: WatchPartyRoomRow;
    role: 'host';
    watchPath: WatchPartyWatchPath | null;
  }>(res);
  if (!res.ok) {
    throw new Error(data.error || `create failed (${res.status})`);
  }
  return data;
}

export async function joinWatchParty(
  code: string
): Promise<{ room: WatchPartyRoomRow; role: 'host' | 'viewer'; watchPath: WatchPartyWatchPath | null }> {
  const base = getApiBase();
  const headers = await authHeaders();
  const res = await fetch(`${base}/api/watch-party/join`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
  const data = await parseJson<{
    room: WatchPartyRoomRow;
    role: 'host' | 'viewer';
    watchPath: WatchPartyWatchPath | null;
    error?: string;
  }>(res);
  if (!res.ok) {
    const err = new Error(data.error || `join failed (${res.status})`) as Error & { code?: string };
    err.code = data.error;
    throw err;
  }
  return data;
}

export async function getWatchPartyRoom(code: string): Promise<{
  room: WatchPartyRoomRow;
  members: WatchPartyMemberRow[];
  profiles: WatchPartyProfileMini[];
  role: 'host' | 'viewer';
  watchPath: WatchPartyWatchPath | null;
}> {
  const base = getApiBase();
  const headers = await authHeaders();
  const res = await fetch(`${base}/api/watch-party/room/${encodeURIComponent(code.trim().toUpperCase())}`, {
    headers,
  });
  const data = await parseJson<{
    room: WatchPartyRoomRow;
    members: WatchPartyMemberRow[];
    profiles: WatchPartyProfileMini[];
    role: 'host' | 'viewer';
    watchPath: WatchPartyWatchPath | null;
    error?: string;
  }>(res);
  if (!res.ok) {
    throw new Error(data.error || `room fetch failed (${res.status})`);
  }
  return data;
}

export async function leaveWatchParty(roomId: string): Promise<{ ok: boolean; ended?: boolean }> {
  const base = getApiBase();
  const headers = await authHeaders();
  const res = await fetch(`${base}/api/watch-party/leave`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ roomId }),
  });
  const data = await parseJson<{ ok: boolean; ended?: boolean; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error || `leave failed (${res.status})`);
  }
  return data;
}

export async function endWatchParty(roomId: string): Promise<{ ok: boolean }> {
  const base = getApiBase();
  const headers = await authHeaders();
  const res = await fetch(`${base}/api/watch-party/end`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ roomId }),
  });
  const data = await parseJson<{ ok: boolean; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error || `end failed (${res.status})`);
  }
  return data;
}

export async function patchWatchPartyPlayback(payload: {
  roomId: string;
  isPlaying: boolean;
  currentTime: number;
  lastAction: 'play' | 'pause' | 'seek' | 'sync';
}): Promise<{ room: WatchPartyRoomRow }> {
  const base = getApiBase();
  const headers = await authHeaders();
  const res = await fetch(`${base}/api/watch-party/playback`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ room: WatchPartyRoomRow; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error || `playback failed (${res.status})`);
  }
  return data;
}
