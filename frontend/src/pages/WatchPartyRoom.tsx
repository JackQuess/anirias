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

  const copyInvite = useCallback(async () => {
    const url = `${window.location.origin}/watch-party/${code}`;
    const title = 'ANIRIAS — Birlikte izle';
    const coarsePointer =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    const touchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const useNativeShare = coarsePointer || touchDevice;

    if (useNativeShare && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: `${title}\n${url}`, url });
        showToast('Davet paylaşıldı', 'success');
        return;
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('Link kopyalandı', 'success');
    } catch {
      showToast('Kopyalanamadı', 'error');
    }
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
      <div className="min-h-[100dvh] bg-[#08080c] pt-[max(5rem,env(safe-area-inset-top,0px)+3.5rem)] pb-mobile-nav">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-[100dvh] bg-[#08080c] text-white flex items-center justify-center px-4 sm:px-6 pt-[max(5rem,env(safe-area-inset-top,0px)+3.5rem)] pb-mobile-nav font-inter">
        <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 text-center shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">Birlikte izle</p>
          <p className="text-white/80 text-sm mb-6 leading-relaxed">{bootError}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.08] border border-white/10 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/[0.12] touch-manipulation active:opacity-90"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    );
  }

  if (!room || !watchPayload || !playbackUrl) {
    return (
      <div className="min-h-[100dvh] bg-[#08080c] pt-[max(5rem,env(safe-area-inset-top,0px)+3.5rem)] pb-mobile-nav">
        <LoadingSkeleton type="banner" />
      </div>
    );
  }

  const active = room.status === 'active';

  return (
    <div className="min-h-[100dvh] bg-[#08080c] text-white font-inter antialiased pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+3.25rem))] sm:pt-16 md:pt-20 pb-6 md:pb-10">
      <div className="max-w-[1800px] mx-auto px-2.5 sm:px-6 md:px-10 flex flex-col xl:flex-row gap-4 sm:gap-6">
        <div className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-0.5">
            <span
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 sm:py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] touch-manipulation',
                active
                  ? 'border-emerald-500/40 text-emerald-300/90 bg-emerald-500/10'
                  : 'border-white/15 text-white/40 bg-white/[0.04]'
              )}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              {active ? 'Oda aktif' : 'Oda kapalı'}
            </span>
            {role === 'host' ? (
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/90">Host</span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">İzleyici</span>
            )}
          </div>

          <div className="relative w-full aspect-video rounded-none sm:rounded-xl border-y border-white/[0.07] sm:border border-white/[0.07] bg-black shadow-2xl overflow-hidden -mx-2.5 sm:mx-0">
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

          <p className="text-[10px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white/35 leading-relaxed px-0.5">
            {role === 'viewer' ? (
              <>
                <span className="md:hidden">
                  Oynatma çoğu telefonda sessiz başlar. Ses için alttaki ses simgesi veya kontrol çubuğundan açın. Tam
                  ekran: videoda{' '}
                  <span className="text-white/55">çift dokunuş</span> veya oynatıcıdaki genişlet ikonu.
                </span>
                <span className="hidden md:inline">
                  İzleyicide oynatma genelde sessiz başlar (tarayıcı kuralı). Ses için{' '}
                  <span className="text-white/55">M</span> tuşuna basın veya kontrollerden sesi açın. Tam ekran: çift
                  tıklama veya <span className="text-white/55">F</span>.
                </span>
              </>
            ) : (
              <>
                <span className="md:hidden">Senkron: host yönetir · Mobilde tam ekran için çift dokunuş</span>
                <span className="hidden md:inline">Senkron: yayın host üzerinden</span>
              </>
            )}
          </p>
        </div>

        <aside className="w-full xl:w-[380px] shrink-0 flex flex-col gap-3 sm:gap-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
              <h2 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] sm:tracking-[0.28em] text-white/90 flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-primary/90 shrink-0" />
                <span className="truncate">Katılımcılar</span>
              </h2>
              <span className="text-[10px] font-bold text-white/40 shrink-0 tabular-nums">
                {members.length}/{5}
              </span>
            </div>
            <ul className="space-y-2 mb-4 sm:mb-6 max-h-[min(42vh,16rem)] sm:max-h-none overflow-y-auto overscroll-contain -mr-1 pr-1 touch-pan-y [scrollbar-width:thin]">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/30 px-3 min-h-[44px] py-2 sm:py-2.5"
                >
                  <span className="text-sm text-white/90 truncate pr-2">{profileLabel(profiles, m.user_id)}</span>
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

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => void copyInvite()}
                className="flex items-center justify-center gap-2 w-full min-h-[48px] py-3 rounded-xl border border-white/10 bg-white/[0.06] text-[10px] font-black uppercase tracking-[0.18em] sm:tracking-[0.2em] hover:bg-white/[0.1] active:bg-white/[0.12] transition-colors touch-manipulation"
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Davet paylaş / kopyala</span>
                <span className="hidden sm:inline">Davet linkini kopyala</span>
              </button>

              <button
                type="button"
                onClick={() => void handleLeave()}
                className="flex items-center justify-center gap-2 w-full min-h-[48px] py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.18em] sm:tracking-[0.2em] text-white/80 hover:bg-white/[0.06] active:bg-white/[0.08] touch-manipulation"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Odadan ayrıl
              </button>

              {role === 'host' ? (
                <button
                  type="button"
                  onClick={() => void handleEnd()}
                  className="flex items-center justify-center gap-2 w-full min-h-[48px] py-3 rounded-xl border border-primary/35 bg-primary/15 text-[10px] font-black uppercase tracking-[0.18em] sm:tracking-[0.2em] text-primary hover:bg-primary/25 active:bg-primary/30 touch-manipulation"
                >
                  <Square className="w-4 h-4 shrink-0" />
                  Odayı bitir
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3.5 text-[10px] uppercase tracking-[0.2em] text-white/35 break-all">
            Kod: <span className="text-white/70 font-mono tracking-widest">{code}</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WatchPartyRoom;
