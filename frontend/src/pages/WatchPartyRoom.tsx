import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Users, Copy, LogOut, Square, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import VideoPlayer from '@/components/VideoPlayer';
import { useAuth } from '@/services/auth';
import { supabase, hasSupabaseEnv } from '@/services/supabaseClient';
import {
  endWatchParty,
  getWatchPartyRoom,
  joinWatchParty,
  leaveWatchParty,
  patchWatchPartyPlayback,
} from '@/services/watchPartyApi';
import { showToast } from '@/components/ToastProvider';
import type { WatchPartyMemberRow, WatchPartyProfileMini, WatchPartyRoomRow } from '@/types/watchParty';
import type { Anime, Episode, Season } from '@/types';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import LoadingSkeleton from '@/components/LoadingSkeleton';

type WatchPath = { animeSlug: string; seasonNumber: number; episodeNumber: number };

type WatchPagePayload = {
  anime: Anime;
  season: Season;
  episode: Episode;
  seasons: Season[];
  episodes: Episode[];
};

const getApiBase = (): string | null => {
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (!apiBase || typeof apiBase !== 'string' || !apiBase.trim()) return null;
  return apiBase.replace(/\/+$/, '');
};

function profileLabel(profiles: WatchPartyProfileMini[], userId: string): string {
  const p = profiles.find((x) => x.id === userId);
  if (p?.username?.trim()) return p.username.trim();
  return userId.slice(0, 8);
}

const WatchPartyRoom: React.FC = () => {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = rawCode?.trim().toUpperCase() ?? '';
  const navigate = useNavigate();
  const { user, status } = useAuth();

  const [bootError, setBootError] = useState<string | null>(null);
  const [room, setRoom] = useState<WatchPartyRoomRow | null>(null);
  const [role, setRole] = useState<'host' | 'viewer' | null>(null);
  const [members, setMembers] = useState<WatchPartyMemberRow[]>([]);
  const [profiles, setProfiles] = useState<WatchPartyProfileMini[]>([]);
  const [watchPath, setWatchPath] = useState<WatchPath | null>(null);
  const [watchPayload, setWatchPayload] = useState<WatchPagePayload | null>(null);
  const [syncSeq, setSyncSeq] = useState(0);

  const partyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedNavigatedRef = useRef(false);

  useEffect(() => {
    if (status === 'UNAUTHENTICATED') {
      const ret = encodeURIComponent(`/watch-party/${code}`);
      navigate(`/login?returnUrl=${ret}`, { replace: true });
    }
  }, [status, navigate, code]);

  useEffect(() => {
    if (!user || !code || status !== 'AUTHENTICATED') return;

    let cancelled = false;
    (async () => {
      setBootError(null);
      try {
        await joinWatchParty(code);
        if (cancelled) return;
        const full = await getWatchPartyRoom(code);
        if (cancelled) return;
        setRoom(full.room);
        setRole(full.role);
        setMembers(full.members);
        setProfiles(full.profiles);
        setWatchPath(full.watchPath ?? null);
        setSyncSeq(1);

        const apiBase = getApiBase();
        if (full.watchPath && apiBase) {
          const { animeSlug, seasonNumber, episodeNumber } = full.watchPath;
          const res = await fetch(
            `${apiBase}/api/watch/${encodeURIComponent(animeSlug)}/${seasonNumber}/${episodeNumber}`
          );
          if (!res.ok) throw new Error(`İzleme verisi alınamadı (${res.status})`);
          const payload = (await res.json()) as WatchPagePayload;
          if (!cancelled) setWatchPayload(payload);
        }
      } catch (e: any) {
        const err = e as Error & { code?: string };
        if (err.code === 'ROOM_NOT_FOUND') {
          if (!cancelled) setBootError('Oda bulunamadı.');
        } else if (err.code === 'ROOM_ENDED' || err.message?.includes('ROOM_ENDED')) {
          if (!cancelled) setBootError('Bu oda sona ermiş.');
        } else if (err.code === 'ROOM_FULL') {
          if (!cancelled) setBootError('Oda dolu (en fazla 5 kişi).');
        } else {
          if (!cancelled) setBootError(err.message || 'Oda açılamadı.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, code, status]);

  useEffect(() => {
    if (!room?.id || !hasSupabaseEnv || !supabase) return;

    const channel = supabase
      .channel(`watch-party:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'watch_party_rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const next = payload.new as WatchPartyRoomRow;
          setRoom(next);
          setSyncSeq((s) => s + 1);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room?.id]);

  useEffect(() => {
    if (!room || room.status !== 'ended' || endedNavigatedRef.current) return;
    endedNavigatedRef.current = true;
    showToast('Oda sonlandırıldı', 'info');
    if (watchPath) {
      navigate(
        `/watch/${encodeURIComponent(watchPath.animeSlug)}/${watchPath.seasonNumber}/${watchPath.episodeNumber}`,
        { replace: true }
      );
    } else {
      navigate('/', { replace: true });
    }
  }, [room?.status, room, watchPath, navigate]);

  const onPartyHostPlayback = useCallback(
    (payload: { currentTime: number; isPlaying: boolean; lastAction: 'play' | 'pause' | 'seek' | 'sync' }) => {
      if (!room?.id || role !== 'host') return;

      const send = () => {
        void patchWatchPartyPlayback({
          roomId: room.id,
          isPlaying: payload.isPlaying,
          currentTime: payload.currentTime,
          lastAction: payload.lastAction,
        }).catch((err: Error) => {
          showToast(err.message || 'Senkron güncellenemedi', 'error');
        });
      };

      if (payload.lastAction === 'sync') {
        send();
        return;
      }

      if (partyDebounceRef.current) clearTimeout(partyDebounceRef.current);
      partyDebounceRef.current = setTimeout(send, 100);
    },
    [room?.id, role]
  );

  useEffect(() => {
    return () => {
      if (partyDebounceRef.current) clearTimeout(partyDebounceRef.current);
    };
  }, []);

  const handleLeave = useCallback(async () => {
    if (!room?.id) return;
    try {
      await leaveWatchParty(room.id);
      showToast('Odadan ayrıldınız', 'info');
      if (watchPath) {
        navigate(
          `/watch/${encodeURIComponent(watchPath.animeSlug)}/${watchPath.seasonNumber}/${watchPath.episodeNumber}`
        );
      } else {
        navigate('/');
      }
    } catch (e: any) {
      showToast(e?.message || 'Ayrılma başarısız', 'error');
    }
  }, [room?.id, navigate, watchPath]);

  const handleEnd = useCallback(async () => {
    if (!room?.id) return;
    try {
      await endWatchParty(room.id);
      showToast('Oda sonlandırıldı', 'success');
      navigate('/');
    } catch (e: any) {
      showToast(e?.message || 'Oda bitirilemedi', 'error');
    }
  }, [room?.id, navigate]);

  const copyInvite = useCallback(() => {
    const url = `${window.location.origin}/watch-party/${code}`;
    void navigator.clipboard.writeText(url).then(
      () => showToast('Link kopyalandı', 'success'),
      () => showToast('Kopyalanamadı', 'error')
    );
  }, [code]);

  const playbackUrl = useMemo(() => {
    if (!watchPayload?.episode) return null;
    const ep = watchPayload.episode;
    return ep.video_url || ep.hls_url || null;
  }, [watchPayload?.episode]);

  const poster = useMemo(() => {
    const anime = watchPayload?.anime;
    if (!anime) return '/banners/hsdxd_rias_banner.webp';
    const raw = anime.banner_image || anime.cover_image || null;
    return proxyImage(raw || '/banners/hsdxd_rias_banner.webp');
  }, [watchPayload?.anime]);

  const titleString = watchPayload?.anime ? getDisplayTitle(watchPayload.anime.title) : '';
  const episodeLine =
    watchPayload?.episode?.title?.replace(/<[^>]*>/g, '') ||
    (watchPayload?.episode ? `Bölüm ${watchPayload.episode.episode_number}` : '');

  const partyRemote = useMemo(() => {
    if (!room || role === 'host') return undefined;
    return {
      seq: syncSeq,
      isPlaying: room.is_playing,
      currentTime: room.playback_time,
      lastAction: room.last_action,
    };
  }, [room, role, syncSeq]);

  if (status === 'LOADING' || (status === 'AUTHENTICATED' && user && !room && !bootError)) {
    return (
      <div className="min-h-screen bg-[#08080c] pt-20">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen bg-[#08080c] text-white flex items-center justify-center px-6 pt-20 font-inter">
        <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 text-center shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">Birlikte izle</p>
          <p className="text-white/80 text-sm mb-6">{bootError}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/[0.08] border border-white/10 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/[0.12]"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    );
  }

  if (!room || !watchPayload || !playbackUrl) {
    return (
      <div className="min-h-screen bg-[#08080c] pt-20">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  const active = room.status === 'active';

  return (
    <div className="min-h-screen bg-[#08080c] text-white font-inter antialiased pt-14 sm:pt-16 md:pt-20 pb-16">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-6 md:px-10 flex flex-col xl:flex-row gap-6">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em]',
                active
                  ? 'border-emerald-500/40 text-emerald-300/90 bg-emerald-500/10'
                  : 'border-white/15 text-white/40 bg-white/[0.04]'
              )}
            >
              <Radio className="w-3.5 h-3.5" />
              {active ? 'Oda aktif' : 'Oda kapalı'}
            </span>
            {role === 'host' ? (
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/90">Host</span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">İzleyici</span>
            )}
          </div>

          <div className="relative w-full aspect-video rounded-xl border border-white/[0.07] bg-black shadow-2xl overflow-hidden">
            <VideoPlayer
              src={playbackUrl}
              poster={poster}
              title={titleString}
              episodeLine={episodeLine}
              animeSlug={watchPayload.anime.slug || undefined}
              initialTime={room.playback_time > 0 ? room.playback_time : 0}
              introStart={watchPayload.episode.intro_start || undefined}
              introEnd={watchPayload.episode.intro_end || undefined}
              onSkipIntro={() => {}}
              hasNextEpisode={false}
              partyRole={role === 'host' ? 'host' : 'viewer'}
              onPartyControlAttempt={() => showToast('Kontrol hostta', 'info')}
              onPartyHostPlayback={onPartyHostPlayback}
              partyRemote={partyRemote}
              subtitleFiles={
                watchPayload.episode.subtitle_tracks?.length
                  ? watchPayload.episode.subtitle_tracks.map((t) => ({
                      src: t.url,
                      label: t.label,
                      srclang: t.lang,
                    }))
                  : undefined
              }
            />
          </div>

          <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">
            {role === 'viewer' ? 'Senkron: canlı · küçük sapmalar tolere edilir' : 'Senkron: yayın host üzerinden'}
          </p>
        </div>

        <aside className="w-full xl:w-[380px] shrink-0 flex flex-col gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[11px] font-black uppercase tracking-[0.28em] text-white/90 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary/90" />
                Katılımcılar
              </h2>
              <span className="text-[10px] font-bold text-white/40">
                {members.length}/{5}
              </span>
            </div>
            <ul className="space-y-2 mb-6">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2.5"
                >
                  <span className="text-sm text-white/90 truncate">{profileLabel(profiles, m.user_id)}</span>
                  {m.role === 'host' ? (
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary shrink-0">Host</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30 shrink-0">
                      İzleyici
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void copyInvite()}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/[0.1] transition-colors"
              >
                <Copy className="w-4 h-4" />
                Davet linkini kopyala
              </button>

              <button
                type="button"
                onClick={() => void handleLeave()}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 hover:bg-white/[0.06]"
              >
                <LogOut className="w-4 h-4" />
                Odadan ayrıl
              </button>

              {role === 'host' ? (
                <button
                  type="button"
                  onClick={() => void handleEnd()}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-primary/35 bg-primary/15 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/25"
                >
                  <Square className="w-4 h-4" />
                  Odayı bitir
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-white/35">
            Kod: <span className="text-white/70 font-mono tracking-widest">{code}</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WatchPartyRoom;
