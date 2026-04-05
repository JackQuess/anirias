import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../services/supabaseAdmin.js';
import { requireUser, getUserIdFromRequest } from '../utils/auth.js';

const router = Router();

const MAX_MEMBERS = 5;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 8;

async function getWatchPathForEpisode(episodeId: string): Promise<{
  animeSlug: string;
  seasonNumber: number;
  episodeNumber: number;
} | null> {
  const { data: ep, error: epErr } = await supabaseAdmin
    .from('episodes')
    .select('episode_number, season_number, anime_id')
    .eq('id', episodeId)
    .maybeSingle();

  if (epErr || !ep?.anime_id) return null;

  const { data: anime, error: aErr } = await supabaseAdmin
    .from('animes')
    .select('slug')
    .eq('id', ep.anime_id)
    .maybeSingle();

  if (aErr || !anime?.slug) return null;

  return {
    animeSlug: anime.slug,
    seasonNumber: ep.season_number ?? 1,
    episodeNumber: ep.episode_number,
  };
}

function generateRoomCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

router.use(requireUser);

/** POST /api/watch-party/create */
router.post('/create', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const episodeId = typeof req.body?.episodeId === 'string' ? req.body.episodeId : null;
  const animeId =
    req.body?.animeId === null || req.body?.animeId === undefined
      ? null
      : typeof req.body?.animeId === 'string'
        ? req.body.animeId
        : null;

  if (!episodeId) {
    return res.status(400).json({ error: 'episodeId required' });
  }

  const { data: ep, error: epErr } = await supabaseAdmin
    .from('episodes')
    .select('id, anime_id')
    .eq('id', episodeId)
    .maybeSingle();

  if (epErr || !ep) {
    return res.status(404).json({ error: 'Episode not found' });
  }

  if (animeId && ep.anime_id !== animeId) {
    return res.status(400).json({ error: 'animeId does not match episode' });
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateRoomCode();

    const { data: room, error: insErr } = await supabaseAdmin
      .from('watch_party_rooms')
      .insert({
        code,
        created_by: userId,
        host_user_id: userId,
        anime_id: ep.anime_id,
        episode_id: ep.id,
        status: 'active',
        visibility: 'private',
        is_playing: false,
        playback_time: 0,
        last_action: null,
        last_action_by: null,
        playback_updated_at: null,
      })
      .select('*')
      .maybeSingle();

    if (insErr) {
      if (insErr.code === '23505' || insErr.message?.includes('duplicate')) {
        continue;
      }
      // eslint-disable-next-line no-console
      console.error('[watchParty/create]', insErr);
      return res.status(500).json({ error: insErr.message });
    }

    if (!room) continue;

    const { error: memErr } = await supabaseAdmin.from('watch_party_members').insert({
      room_id: room.id,
      user_id: userId,
      role: 'host',
      is_online: true,
      last_seen_at: new Date().toISOString(),
    });

    if (memErr) {
      await supabaseAdmin.from('watch_party_rooms').delete().eq('id', room.id);
      // eslint-disable-next-line no-console
      console.error('[watchParty/create] member insert', memErr);
      return res.status(500).json({ error: memErr.message });
    }

    const watchPath = await getWatchPathForEpisode(room.episode_id);
    return res.status(201).json({ room, role: 'host' as const, watchPath });
  }

  return res.status(503).json({ error: 'Could not allocate room code' });
});

/** POST /api/watch-party/join */
router.post('/join', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  if (!code) {
    return res.status(400).json({ error: 'code required' });
  }

  const { data: room, error: rErr } = await supabaseAdmin
    .from('watch_party_rooms')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (rErr || !room) {
    return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  }

  if (room.status !== 'active') {
    return res.status(410).json({ error: 'ROOM_ENDED' });
  }

  const { data: existing } = await supabaseAdmin
    .from('watch_party_members')
    .select('id, role')
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('watch_party_members')
      .update({ last_seen_at: new Date().toISOString(), is_online: true })
      .eq('id', existing.id);

    const watchPathExisting = await getWatchPathForEpisode(room.episode_id);
    return res.json({ room, role: existing.role as 'host' | 'viewer', watchPath: watchPathExisting });
  }

  const { count, error: cErr } = await supabaseAdmin
    .from('watch_party_members')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id);

  if (cErr) {
    return res.status(500).json({ error: cErr.message });
  }

  if ((count ?? 0) >= MAX_MEMBERS) {
    return res.status(403).json({ error: 'ROOM_FULL' });
  }

  const { error: jErr } = await supabaseAdmin.from('watch_party_members').insert({
    room_id: room.id,
    user_id: userId,
    role: 'viewer',
    is_online: true,
    last_seen_at: new Date().toISOString(),
  });

  if (jErr) {
    return res.status(500).json({ error: jErr.message });
  }

  const watchPath = await getWatchPathForEpisode(room.episode_id);
  return res.json({ room, role: 'viewer' as const, watchPath });
});

async function loadMembersWithProfiles(roomId: string) {
  const { data: members, error: mErr } = await supabaseAdmin
    .from('watch_party_members')
    .select('id, room_id, user_id, role, joined_at, last_seen_at, is_online')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (mErr || !members?.length) {
    return { members: members ?? [], profiles: [] as { id: string; username: string | null }[] };
  }

  const ids = [...new Set(members.map((m: { user_id: string }) => m.user_id))];
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, username').in('id', ids);

  return {
    members,
    profiles: profiles ?? [],
  };
}

/** GET /api/watch-party/room/:code */
router.get('/room/:code', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const code = (req.params.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Invalid code' });

  const { data: room, error: rErr } = await supabaseAdmin
    .from('watch_party_rooms')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (rErr || !room) {
    return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  }

  const { data: mem } = await supabaseAdmin
    .from('watch_party_members')
    .select('role')
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!mem) {
    return res.status(403).json({ error: 'NOT_MEMBER' });
  }

  const { members, profiles } = await loadMembersWithProfiles(room.id);
  const watchPath = await getWatchPathForEpisode(room.episode_id);
  return res.json({ room, members, profiles, role: mem.role as 'host' | 'viewer', watchPath });
});

/** POST /api/watch-party/leave */
router.post('/leave', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId : null;
  if (!roomId) return res.status(400).json({ error: 'roomId required' });

  const { data: room } = await supabaseAdmin.from('watch_party_rooms').select('*').eq('id', roomId).maybeSingle();
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { data: mem } = await supabaseAdmin
    .from('watch_party_members')
    .select('id, role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!mem) {
    return res.status(403).json({ error: 'NOT_MEMBER' });
  }

  if (mem.role === 'host' || room.host_user_id === userId) {
    await supabaseAdmin.from('watch_party_members').delete().eq('room_id', roomId);
    await supabaseAdmin
      .from('watch_party_rooms')
      .update({ status: 'ended', is_playing: false, updated_at: new Date().toISOString() })
      .eq('id', roomId);
    return res.json({ ok: true, ended: true });
  }

  await supabaseAdmin.from('watch_party_members').delete().eq('id', mem.id);
  return res.json({ ok: true, ended: false });
});

/** POST /api/watch-party/end */
router.post('/end', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId : null;
  if (!roomId) return res.status(400).json({ error: 'roomId required' });

  const { data: room } = await supabaseAdmin.from('watch_party_rooms').select('*').eq('id', roomId).maybeSingle();
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (room.host_user_id !== userId) {
    return res.status(403).json({ error: 'HOST_ONLY' });
  }

  await supabaseAdmin.from('watch_party_members').delete().eq('room_id', roomId);
  await supabaseAdmin
    .from('watch_party_rooms')
    .update({ status: 'ended', is_playing: false, updated_at: new Date().toISOString() })
    .eq('id', roomId);

  return res.json({ ok: true });
});

/** PATCH /api/watch-party/playback */
router.patch('/playback', async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId : null;
  const lastAction = req.body?.lastAction as string | undefined;
  const isPlaying = typeof req.body?.isPlaying === 'boolean' ? req.body.isPlaying : undefined;
  const currentTime = typeof req.body?.currentTime === 'number' && Number.isFinite(req.body.currentTime)
    ? req.body.currentTime
    : undefined;

  if (!roomId) {
    return res.status(400).json({ error: 'roomId required' });
  }

  const allowed = lastAction === 'play' || lastAction === 'pause' || lastAction === 'seek' || lastAction === 'sync';
  if (!allowed || isPlaying === undefined || currentTime === undefined) {
    return res.status(400).json({ error: 'Invalid playback payload' });
  }

  const { data: room } = await supabaseAdmin.from('watch_party_rooms').select('*').eq('id', roomId).maybeSingle();
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status !== 'active') {
    return res.status(410).json({ error: 'ROOM_ENDED' });
  }
  if (room.host_user_id !== userId) {
    return res.status(403).json({ error: 'HOST_ONLY' });
  }

  const now = new Date().toISOString();
  const { data: updated, error: uErr } = await supabaseAdmin
    .from('watch_party_rooms')
    .update({
      is_playing: isPlaying,
      playback_time: Math.max(0, currentTime),
      last_action: lastAction,
      last_action_by: userId,
      playback_updated_at: now,
      updated_at: now,
    })
    .eq('id', roomId)
    .select('*')
    .maybeSingle();

  if (uErr) {
    return res.status(500).json({ error: uErr.message });
  }

  return res.json({ room: updated });
});

export default router;
