
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Season, Episode } from '../types';
import { getDisplayTitle } from '@/utils/title';

const ANILIST_API = 'https://graphql.anilist.co';
const ANILIST_SEARCH_QUERY = `
query ($search: String) {
  Page(perPage: 10) {
    media(search: $search, type: ANIME, format_in: [TV, TV_SHORT]) {
      id
      title { romaji english }
      format
      episodes
      seasonYear
      coverImage { large }
    }
  }
}
`;

const AdminEpisodes: React.FC = () => {
  const { animeId } = useParams<{ animeId: string }>();
  const navigate = useNavigate();
  
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [isAction, setIsAction] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPatching, setIsPatching] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isBunnyPatching, setIsBunnyPatching] = useState(false);
  const [isAniListModalOpen, setIsAniListModalOpen] = useState(false);
  const [anilistSearch, setAnilistSearch] = useState('');
  const [anilistResults, setAnilistResults] = useState<any[]>([]);
  const [anilistLoading, setAnilistLoading] = useState(false);
  const [anilistError, setAnilistError] = useState<string | null>(null);
  const [bindingSeason, setBindingSeason] = useState<Season | null>(null);
  const [autoTemplate, setAutoTemplate] = useState<string>('https://animely.net/anime/{anime_slug}/izle/{episode_number}');
  const [autoSeasonNumber, setAutoSeasonNumber] = useState<number>(1);
  const [autoMode, setAutoMode] = useState<'season' | 'all'>('season');
  const [autoResult, setAutoResult] = useState<any | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [cdnTestUrl, setCdnTestUrl] = useState('');
  const [cdnToken, setCdnToken] = useState('');
  const [cdnTestResult, setCdnTestResult] = useState<{ exists: boolean; status: number } | null>(null);
  const [cdnTesting, setCdnTesting] = useState(false);
  const [progress, setProgress] = useState<{
    total: number;
    processed: number;
    success: number;
    failed: number;
    currentEpisode: number | null;
    status: string;
    percent: number;
    message?: string;
    lastUpdateAt?: number;
    error?: string | null;
  }>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    currentEpisode: null,
    status: 'idle',
    percent: 0,
    message: '',
    lastUpdateAt: Date.now(),
    error: null
  });
  const [progressTimer, setProgressTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [missingSummary, setMissingSummary] = useState<{ missing: number[]; noVideo: number[]; error: number[] } | null>(null);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);
  const [seasonForm, setSeasonForm] = useState<{
    season_number: number;
    anilist_media_id: number | null;
    expected_episode_count: number | null;
  }>({
    season_number: 1,
    anilist_media_id: null,
    expected_episode_count: null
  });

  // Form State for new Episode
  const [newEp, setNewEp] = useState<Partial<Episode>>({
    episode_number: 1,
    title: '',
    stream_id: '',
    duration_seconds: 1440,
    created_at: new Date().toISOString()
  });
  const [hlsInput, setHlsInput] = useState<string>('');
  const [airDateInput, setAirDateInput] = useState<string>(new Date().toISOString().slice(0,16));

  const { data: anime, loading: animeLoading } = useLoad(() => db.getAnimeById(animeId!), [animeId]);
  const { data: seasons, loading: seasonsLoading, reload: reloadSeasons } = useLoad(() => db.getSeasons(animeId!), [animeId]);
  const { data: episodes, loading: episodesLoading, reload } = useLoad(() => 
    selectedSeasonId ? db.getEpisodes(animeId!, selectedSeasonId) : Promise.resolve([]), 
    [animeId, selectedSeasonId]
  );
  const selectedSeason = seasons?.find((s) => s.id === selectedSeasonId);
  const [editEp, setEditEp] = useState<Partial<Episode> | null>(null);
  const hasSeasons = (seasons?.length ?? 0) > 0;

  useEffect(() => {
    if (seasons && seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(seasons[0].id);
    }
  }, [seasons, selectedSeasonId]);

  useEffect(() => {
    if (seasons && selectedSeasonId) {
      const found = seasons.find((s) => s.id === selectedSeasonId);
      if (found) setAutoSeasonNumber(found.season_number);
    }
  }, [seasons, selectedSeasonId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu bölümü kalıcı olarak silmek istediğinize emin misiniz?')) return;
    setIsAction(id);
    try {
      await db.deleteEpisode(id);
      reload();
    } finally {
      setIsAction(null);
    }
  };

  const resetForm = () => {
    const nowIso = new Date().toISOString();
    setNewEp({ episode_number: (episodes?.length || 0) + 1, title: '', stream_id: '', duration_seconds: 1440, created_at: nowIso });
    setHlsInput('');
    setAirDateInput(nowIso.slice(0,16));
    setEditEp(null);
  };
  const formatHlsPreview = (url?: string | null) => url || '';

  const handleCdnTest = async () => {
    if (!cdnTestUrl) {
      alert('CDN URL girin.');
      return;
    }
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
    if (!apiBase) {
      alert('VITE_API_BASE_URL tanımlı değil.');
      return;
    }
    setCdnTesting(true);
    setCdnTestResult(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/bunny/check-file?url=${encodeURIComponent(cdnTestUrl)}`, {
        method: 'GET',
        headers: {
          'X-ADMIN-TOKEN': cdnToken || ''
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setCdnTestResult({ exists: !!data.exists, status: data.status });
    } catch (err: any) {
      alert(err?.message || 'CDN testi başarısız');
    } finally {
      setCdnTesting(false);
    }
  };

  useEffect(() => {
    if (autoRunning) {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
      if (!apiBase) return;
      const timer = setInterval(async () => {
        try {
          if (!autoResult?.jobId) return;
          const res = await fetch(`${apiBase}/api/admin/auto-import/${autoResult.jobId}/progress`);
          const data = await res.json();
          const prog = data?.progress || {};
          const totalEpisodes = Number(prog?.totalEpisodes ?? progress.total ?? 0);
          const completedEpisodes = Number(prog?.completedEpisodes ?? prog?.processed ?? progress.processed ?? 0);
          const percent = totalEpisodes ? Math.round((completedEpisodes / totalEpisodes) * 100) : Number(prog?.percent ?? progress.percent ?? 0);
          const statusText = prog?.status || data?.state || 'idle';
          const message = prog?.message || (statusText === 'completed' ? 'Tamamlandı' : 'Devam ediyor');
          setProgress((prev) => ({
            total: totalEpisodes,
            processed: completedEpisodes,
            success: completedEpisodes,
            failed: Number(prog?.failed ?? prev.failed ?? 0),
            currentEpisode: prog?.currentEpisode ?? null,
            status: statusText,
            percent,
            message,
            lastUpdateAt: Date.now(),
            error: prog?.error ?? null
          }));
          if (data?.state === 'completed' || data?.state === 'failed') {
            clearInterval(timer);
            setProgressTimer(null);
            setAutoRunning(false);
            // Reload episodes after import completes
            if (data?.state === 'completed') {
              reload();
              reloadSeasons();
            }
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);
      setProgressTimer(timer as any);
      return () => {
        clearInterval(timer);
        setProgressTimer(null);
      };
    }
  }, [autoRunning]);

  const runAutoImport = async () => {
    if (!animeId) return;
    const ok = window.confirm(
      autoMode === 'all'
        ? 'Seçili animedeki TÜM sezonlar için Auto Import çalışacak. Emin misin?'
        : `Seçili anime ve sezon ${autoSeasonNumber} için Auto Import çalışacak. Emin misin?`
    );
    if (!ok) return;
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
    if (!apiBase) {
      alert('VITE_API_BASE_URL tanımlı değil. Lütfen frontend .env dosyasında ayarla.');
      return;
    }
    setAutoRunning(true);
    setAutoError(null);
    setAutoResult(null);
    try {
      const url = `${apiBase}/api/admin/auto-import-all`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ADMIN-TOKEN': adminTokenInput || ''
        },
        body: JSON.stringify({
          animeId,
          seasonNumber: autoMode === 'season' ? autoSeasonNumber : null,
          mode: autoMode
        })
      });

      const text = await res.text();
      let json: any = null;
      try {
        if (text && res.headers.get('content-type')?.includes('application/json')) {
          json = JSON.parse(text);
        }
      } catch (err) {
        // ignore parse errors
      }
      if (!json && text) json = { error: text };

      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setAutoResult(json);
      setProgress((p) => ({
        total: p.total ?? 0,
        processed: 0,
        success: 0,
        failed: 0,
        currentEpisode: null,
        status: 'waiting',
        percent: 0,
        message: 'Başlatıldı',
        lastUpdateAt: Date.now(),
        error: null
      }));
    } catch (err: any) {
      setAutoError(err?.message || 'Auto import başarısız');
      setAutoRunning(false);
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
        setProgressTimer(null);
      }
    }
  };

  const handleCreateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId) return;
    try {
      const value = hlsInput.trim();
      if (!value.includes('.m3u8')) throw new Error('Geçerli bir HLS URL girin');
      await db.createEpisode({
        ...newEp,
        anime_id: animeId,
        season_id: selectedSeasonId,
        stream_id: null,
        hls_url: value,
        created_at: airDateInput ? new Date(airDateInput).toISOString() : new Date().toISOString()
      });
      setIsAddModalOpen(false);
      resetForm();
      reload();
    } catch (e) {
      alert('Bölüm eklenemedi.');
    }
  };

  const handleEditClick = (ep: Episode) => {
    setEditEp(ep);
    setIsAddModalOpen(true);
    setNewEp({
      episode_number: ep.episode_number,
      title: ep.title,
      stream_id: (ep as any).stream_id || ep.video_url,
      hls_url: ep.hls_url,
      duration_seconds: ep.duration_seconds,
      created_at: ep.created_at
    });
    setHlsInput(ep.hls_url || '');
    const air = ep.created_at || new Date().toISOString();
    setAirDateInput(air.slice(0,16));
  };

  const handleUpdateEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEp) return;
    setIsAction(editEp.id);
    try {
      const value = hlsInput.trim();
      if (!value.includes('.m3u8')) throw new Error('Geçerli bir HLS URL girin');
      const payload: Partial<Episode> = {
        title: newEp.title,
        episode_number: newEp.episode_number,
        hls_url: value,
        duration_seconds: newEp.duration_seconds,
        created_at: airDateInput ? new Date(airDateInput).toISOString() : newEp.created_at
      };
      await db.updateEpisode(editEp.id!, payload);
      setIsAddModalOpen(false);
      resetForm();
      reload();
      alert('Bölüm güncellendi.');
    } catch (err) {
      alert('Bölüm güncellenemedi.');
    } finally {
      setIsAction(null);
    }
  };

  const handleEpisodeVideoPatch = async (ep: Episode) => {
    if (!anime?.slug || !selectedSeasonId) {
      alert('Slug veya sezon bilgisi eksik.');
      return;
    }
    const season = seasons?.find((s) => s.id === selectedSeasonId);
    if (!season) {
      alert('Sezon bulunamadı.');
      return;
    }
    const padded = String(ep.episode_number).padStart(2, '0');
    const videoUrl = `https://anirias-videos.b-cdn.net/${anime.slug}/season-${season.season_number}/episode-${padded}.mp4`;
    try {
      await db.updateEpisode(ep.id, { video_url: videoUrl });
      reload();
      alert('Video patch tamamlandı.');
    } catch {
      alert('Video patch başarısız.');
    }
  };

  const handleMissingScan = () => {
    const season = seasons?.find((s) => s.id === selectedSeasonId);
    if (!season) {
      alert('Sezon bulunamadı.');
      return;
    }
    const total = season.episode_count || 0;
    const existingNums = new Set((episodes || []).map((e) => e.episode_number));
    const missing: number[] = [];
    for (let i = 1; i <= total; i += 1) {
      if (!existingNums.has(i)) missing.push(i);
    }
    const noVideo = (episodes || [])
      .filter((e) => !e.video_url)
      .map((e) => e.episode_number);
    const error = (episodes || [])
      .filter((e) => e.status === 'error')
      .map((e) => e.episode_number);
    setMissingSummary({ missing, noVideo, error });
    setIsMissingModalOpen(true);
  };

  const handlePatchMissingOnly = async () => {
    const season = seasons?.find((s) => s.id === selectedSeasonId);
    if (!season) return;
    await handleBunnyPatch(season.season_number);
    setIsMissingModalOpen(false);
  };

  const handleOpenSeasonModal = () => {
    const nextSeasonNumber = (seasons?.length || 0) > 0 
      ? Math.max(...(seasons?.map(s => s.season_number) || [])) + 1 
      : 1;
    setSeasonForm({
      season_number: nextSeasonNumber,
      anilist_media_id: null,
      expected_episode_count: null
    });
    setIsSeasonModalOpen(true);
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animeId) return;

    const seasonNum = seasonForm.season_number;
    if (!seasonNum || seasonNum < 1) {
      alert('Sezon numarası 1 veya daha büyük olmalıdır.');
      return;
    }

    // Check for duplicate season
    const existingSeason = seasons?.find(s => s.season_number === seasonNum);
    if (existingSeason) {
      alert('Bu sezon zaten mevcut');
      return;
    }

    if (!seasonForm.expected_episode_count || seasonForm.expected_episode_count < 1) {
      alert('Beklenen bölüm sayısı gerekli (1 veya daha büyük).');
      return;
    }

    setIsCreatingSeason(true);
    try {
      // Create season
      const newSeason = await db.createSeason({
        anime_id: animeId,
        season_number: seasonNum,
        title: `Sezon ${seasonNum}`,
        anilist_id: seasonForm.anilist_media_id || null,
        episode_count: seasonForm.expected_episode_count || null
      } as Partial<Season>);

      if (!newSeason?.id) {
        throw new Error('Sezon oluşturulamadı');
      }

      // Auto-create episode rows (1 to expected_episode_count)
      const episodePromises = [];
      for (let epNum = 1; epNum <= seasonForm.expected_episode_count!; epNum++) {
        episodePromises.push(
          db.createEpisode({
            anime_id: animeId,
            season_id: newSeason.id,
            episode_number: epNum,
            title: `Bölüm ${epNum}`,
            duration_seconds: 1440,
            status: 'pending',
            video_url: null
          })
        );
      }
      await Promise.all(episodePromises);

      // Reload seasons list
      await reloadSeasons();

      // Automatically select the newly created season
      setSelectedSeasonId(newSeason.id);
      
      // Reload episodes to show newly created episodes
      reload();

      // Close modal and reset
      setIsSeasonModalOpen(false);
      setSeasonForm({
        season_number: 1,
        anilist_media_id: null,
        expected_episode_count: null
      });

      alert(`Sezon ${seasonNum} ve ${seasonForm.expected_episode_count} bölüm başarıyla oluşturuldu.`);
    } catch (err: any) {
      const errorMsg = err?.message || 'Sezon oluşturulamadı';
      
      // Check if it's a duplicate error
      if (errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('already exists')) {
        alert('Bu sezon zaten mevcut');
      } else {
        alert(`Hata: ${errorMsg}`);
      }
    } finally {
      setIsCreatingSeason(false);
    }
  };

  const handlePatchVideos = async () => {
    if (!animeId) return;
    if (!window.confirm('Eksik video yollarını otomatik patch etmek istiyor musun?')) return;
    setIsPatching(true);
    try {
      const { updated } = await db.patchEpisodeVideosRpc(animeId);
      alert(`Güncellenen bölüm sayısı: ${updated}`);
      reload();
    } catch (e: any) {
      alert(e?.message || 'Patch başarısız');
    } finally {
      setIsPatching(false);
    }
  };

  const handleBunnyPatch = async (seasonNumber?: number) => {
    if (!animeId || !selectedSeasonId) return;
    
    const targetSeason = selectedSeason;
    if (!targetSeason) {
      alert('Lütfen önce bir sezon seçin.');
      return;
    }
    
    if (!episodes || episodes.length === 0) {
      alert('Bu sezonda patch edilecek bölüm yok. Önce bölümleri oluşturun.');
      return;
    }
    
    if (!window.confirm(`Sezon ${targetSeason.season_number} için mevcut ${episodes.length} bölümün Bunny Patch'i çalıştırılsın mı? (Sadece DB'deki bölümler patch edilir)`)) return;
    
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
    if (!apiBase) {
      alert('VITE_API_BASE_URL tanımlı değil.');
      return;
    }
    const token = adminTokenInput || window.prompt('Admin Token') || '';
    if (!token) {
      alert('Admin token gerekli.');
      return;
    }
    setIsBunnyPatching(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/bunny-patch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ADMIN-TOKEN': token
        },
        body: JSON.stringify({
          animeId,
          seasonNumber: targetSeason.season_number,
          checkCdn: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      
      const patched = data?.patched ?? 0;
      const errors = data?.errors ?? [];
      const missing = errors.length;
      const total = episodes?.length || 0;
      
      const summary = [
        `Toplam: ${total} bölüm`,
        `✅ Patch edildi: ${patched}`,
        `⚠ CDN 404 (eksik): ${missing}`,
        ...(errors.length > 0 ? errors.slice(0, 3).map((e: any) => `   Ep ${e.episode_number}: ${e.error?.replace('CDN 404: ', '') || '404'}`) : [])
      ].join('\n');
      
      if (errors.length > 0) {
        alert(`Bunny Patch Sonuçları:\n\n${summary}${errors.length > 3 ? `\n...ve ${errors.length - 3} bölüm daha eksik` : ''}`);
      } else {
        alert(`✅ Bunny Patch Başarılı!\n\n${summary}`);
      }
      reload();
    } catch (err: any) {
      alert(err?.message || 'Bunny Patch başarısız');
    } finally {
      setIsBunnyPatching(false);
    }
  };

  const openAniListModal = (season: Season) => {
    if (season.anilist_id) return;
    setBindingSeason(season);
    setAnilistSearch('');
    setAnilistResults([]);
    setAnilistError(null);
    setIsAniListModalOpen(true);
  };

  const searchAniList = async () => {
    if (!anilistSearch.trim()) return;
    setAnilistLoading(true);
    setAnilistError(null);
    try {
      const res = await fetch(ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ANILIST_SEARCH_QUERY,
          variables: { search: anilistSearch.trim() }
        })
      });
      const json = await res.json();
      setAnilistResults(json.data?.Page?.media || []);
    } catch (err) {
      setAnilistError('AniList araması başarısız.');
    } finally {
      setAnilistLoading(false);
    }
  };

  const handleSelectAniList = async (media: any) => {
    if (!bindingSeason || !animeId) return;
    const alreadyBound = seasons?.some((s) => s.anilist_id === media.id);
    if (alreadyBound) {
      alert('Bu AniList ID zaten başka bir sezona bağlı.');
      return;
    }
    try {
      await db.updateSeason(bindingSeason.id, {
        anilist_id: media.id,
        episode_count: media.episodes || 0,
        year: media.seasonYear || null
      });

      alert(`Sezon ${bindingSeason.season_number} AniList'e bağlandı.`);
      setIsAniListModalOpen(false);
      setBindingSeason(null);
      reloadSeasons();
    } catch (err) {
      alert('AniList bağlama başarısız.');
    }
  };

  const handleDeleteSeason = async (seasonId: string) => {
    if (!window.confirm('Sezonu silmek istediğine emin misin?')) return;
    try {
      await db.deleteSeason(seasonId);
      window.location.reload();
    } catch (err) {
      alert('Sezon silinemedi.');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate('/admin/animes')} className="p-4 bg-brand-dark border border-brand-border rounded-2xl text-gray-400 hover:text-brand-red transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
              {anime ? getDisplayTitle(anime.title) : 'Bölüm'} <span className="text-brand-red">Yönetimi</span>
            </h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Sezon ve Bölüm Arşivi</p>
            {selectedSeason && (
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">
                AniList: {selectedSeason.episode_count || 0} Bölüm | Mevcut: {episodes?.length || 0} Bölüm
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-4 flex-wrap">
          <button 
            type="button"
            onClick={handleOpenSeasonModal}
            className="bg-brand-dark hover:bg-white/10 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-brand-border transition-all cursor-pointer"
          >
            ➕ YENİ SEZON EKLE
          </button>
          {selectedSeason && (
            <button
              onClick={() => handleBunnyPatch()}
              disabled={isBunnyPatching || !episodes || episodes.length === 0}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/30 transition-all disabled:opacity-50"
            >
              🔧 Bunny Patch
            </button>
          )}
        </div>
      </div>

      {/* Season Creation Modal */}
      {isSeasonModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-brand-black/90 backdrop-blur-xl" onClick={() => setIsSeasonModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-brand-dark border border-brand-border p-10 rounded-[3rem] shadow-[0_0_100px_rgba(229,9,20,0.2)]">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8">
              Yeni <span className="text-brand-red">Sezon Ekle</span>
            </h2>
            <form onSubmit={handleCreateSeason} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                  SEZON NUMARASI <span className="text-brand-red">*</span>
                </label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={seasonForm.season_number}
                  onChange={e => setSeasonForm({...seasonForm, season_number: parseInt(e.target.value) || 1})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-black outline-none focus:border-brand-red"
                  disabled={isCreatingSeason}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                  ANILIST MEDIA ID
                </label>
                <input 
                  type="number"
                  min="1"
                  value={seasonForm.anilist_media_id || ''}
                  onChange={e => setSeasonForm({...seasonForm, anilist_media_id: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-black outline-none focus:border-brand-red"
                  disabled={isCreatingSeason}
                  placeholder="Opsiyonel"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                  BEKLENEN BÖLÜM SAYISI <span className="text-brand-red">*</span>
                </label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={seasonForm.expected_episode_count || ''}
                  onChange={e => setSeasonForm({...seasonForm, expected_episode_count: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-black outline-none focus:border-brand-red"
                  disabled={isCreatingSeason}
                  placeholder="1, 2, 3..."
                />
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                  Bu sayı kadar bölüm otomatik oluşturulacak (status: missing)
                </p>
              </div>
              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { setIsSeasonModalOpen(false); setSeasonForm({ season_number: 1, anilist_media_id: null, expected_episode_count: null }); }} 
                  disabled={isCreatingSeason}
                  className="flex-grow bg-white/5 text-gray-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] disabled:opacity-50"
                >
                  İPTAL
                </button>
                <button 
                  type="submit" 
                  disabled={isCreatingSeason}
                  className="flex-grow bg-brand-red text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-brand-red/20 disabled:opacity-50"
                >
                  {isCreatingSeason ? 'OLUŞTURULUYOR...' : 'OLUŞTUR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!hasSeasons && !seasonsLoading ? (
        <div className="bg-brand-dark border border-brand-border rounded-[2.5rem] p-10 text-center">
          <p className="text-white font-black uppercase tracking-widest text-sm">Bu anime için henüz sezon eklenmedi.</p>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Önce sezon ekleyin, sonra bölümleri yönetin.</p>
        </div>
      ) : (
        <>
          {/* Season Cards */}
          {seasons && seasons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
              {seasons.map(s => {
                const isSelected = selectedSeasonId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`rounded-2xl border p-6 bg-brand-dark transition-all ${
                      isSelected ? 'border-brand-red/60 shadow-lg shadow-brand-red/10' : 'border-brand-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">
                          Sezon {s.season_number}
                        </h3>
                        <div className="space-y-1 text-[10px] font-black uppercase tracking-widest">
                          {s.episode_count !== null && (
                            <div className="text-gray-400">
                              Bölüm: <span className="text-white">{s.episode_count}</span>
                            </div>
                          )}
                          <div className="text-gray-400">
                            AniList: <span className={s.anilist_id ? 'text-emerald-400' : 'text-red-400'}>{s.anilist_id ? 'Bağlandı' : 'Bağlı değil'}</span>
                          </div>
                          {s.year && (
                            <div className="text-gray-400">
                              Yıl: <span className="text-white">{s.year}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedSeasonId(s.id)}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-brand-red text-white border-brand-red'
                            : 'bg-white/5 text-gray-400 border-brand-border hover:text-white'
                        }`}
                      >
                        {isSelected ? 'SEÇİLİ' : 'SEÇ'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openAniListModal(s)}
                        disabled={!!s.anilist_id}
                        className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-brand-border transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                      >
                        {s.anilist_id ? '✓ BAĞLI' : '🔗 ANILIST BAĞLA'}
                      </button>
                      <button
                        disabled
                        title="Bu işlem artık Desktop App üzerinden yapılır."
                        className="bg-emerald-500/10 text-gray-600 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-emerald-500/30 opacity-50 cursor-not-allowed flex-1"
                      >
                        ⚡ BUNNY PATCH
                      </button>
                      <button
                        disabled
                        title="Bu işlem artık Desktop App üzerinden yapılır."
                        className="bg-red-500/10 text-gray-600 text-[10px] font-black uppercase tracking-widest px-2 py-2 rounded-xl border border-red-500/30 opacity-50 cursor-not-allowed"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Season Info & Actions for Selected Season */}
          {selectedSeason && (
            <div className="bg-brand-dark border border-brand-border rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">
                    Sezon {selectedSeason.season_number} - Bölüm Yönetimi
                  </h3>
                </div>
              </div>
            </div>
          )}

          {episodesLoading ? <LoadingSkeleton type="list" count={5} /> : (
            <div className="bg-brand-dark border border-brand-border rounded-[2.5rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-brand-border bg-white/5">
                    <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Sıra</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Bölüm Detayı</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Süre</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {episodes?.map(ep => (
                    <tr key={ep.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-10 py-6 font-black text-brand-red italic text-xl">
                        {ep.episode_number < 10 ? `0${ep.episode_number}` : ep.episode_number}
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-white font-black text-base uppercase tracking-tight">{ep.title || `Bölüm ${ep.episode_number}`}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                            ep.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            ep.status === 'patched' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            ep.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            ep.status === 'pending_download' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            ep.status === 'downloading' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            ep.status === 'uploading' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            ep.status === 'source_missing' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            ep.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            ep.status === 'missing' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {ep.status === 'ready' ? '✓ Hazır' :
                             ep.status === 'patched' ? '✓ Hazır' :
                             ep.status === 'pending' ? '⏳ Bekliyor' :
                             ep.status === 'pending_download' ? '⏬ İndirilecek' :
                             ep.status === 'downloading' ? '⬇️ İndiriliyor' :
                             ep.status === 'uploading' ? '⬆️ Yükleniyor' :
                             ep.status === 'source_missing' ? '❌ Kaynak Yok' :
                             ep.status === 'error' ? '❌ Hata' :
                             ep.status === 'missing' ? '⚠ Henüz eklenmemiş' :
                             '⚠ Henüz eklenmemiş'}
                          </span>
                          {ep.video_url && (
                            <span className="text-[9px] text-gray-500 font-mono max-w-xs truncate">
                              {ep.video_url}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-xs text-gray-500 font-bold italic">{Math.floor(ep.duration_seconds / 60)} DAKİKA</td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex items-center justify-end gap-4">
                            <button 
                              disabled
                              title="Bu işlem artık Desktop App üzerinden yapılır."
                              className="text-[10px] font-black text-gray-600 uppercase tracking-widest opacity-50 cursor-not-allowed"
                            >
                              DÜZENLE
                            </button>
                            <button 
                              disabled
                              title="Bu işlem artık Desktop App üzerinden yapılır."
                              className="text-[10px] font-black text-gray-600 uppercase tracking-widest opacity-50 cursor-not-allowed"
                            >
                              VİDEO PATCH
                            </button>
                            <button 
                              disabled
                              title="Bu işlem artık Desktop App üzerinden yapılır."
                              className="text-[10px] font-black text-gray-600 uppercase tracking-widest opacity-50 cursor-not-allowed"
                            >
                              SİL
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {(!episodes || episodes.length === 0) && !episodesLoading && (
                    <tr>
                      <td colSpan={4} className="px-10 py-20 text-center text-gray-600 font-black uppercase text-xs tracking-[0.4em] opacity-40 italic">
                        Bu sezona henüz bölüm eklenmemiş. Yeni bir bölüm ekleyerek başlayın.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* New Episode Modal - DISABLED (Read-only mode) */}
      {false && isAddModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-brand-black/90 backdrop-blur-xl" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-brand-dark border border-brand-border p-10 rounded-[3rem] shadow-[0_0_100px_rgba(229,9,20,0.2)]">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8">
              {editEp ? <><span className="text-brand-red">Bölüm</span> Düzenle</> : <>Yeni <span className="text-brand-red">Bölüm Ekle</span></>}
            </h2>
            <form onSubmit={editEp ? handleUpdateEpisode : handleCreateEpisode} className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">BÖLÜM NO</label>
                  <input 
                    type="number"
                    value={newEp.episode_number}
                    onChange={e => setNewEp({...newEp, episode_number: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-black outline-none focus:border-brand-red"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">BÖLÜM BAŞLIĞI</label>
                  <input 
                    type="text"
                    required
                    value={newEp.title}
                    onChange={e => setNewEp({...newEp, title: e.target.value})}
                    placeholder="Bölüm Adı"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-black outline-none focus:border-brand-red"
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">YAYIN TARİHİ</label>
                  <input
                    type="datetime-local"
                    value={airDateInput}
                    onChange={(e) => setAirDateInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-xs outline-none focus:border-brand-red"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Bunny HLS URL (playlist.m3u8)</label>
                <input 
                  type="text"
                  required
                  value={hlsInput}
                  onChange={e => setHlsInput(e.target.value)}
                  placeholder="https://vz-xxxxx.b-cdn.net/<id>/playlist.m3u8"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-xs outline-none focus:border-brand-red"
                />
                {(hlsInput) && (
                  <p className="text-[10px] text-gray-500 font-mono">
                    HLS: {formatHlsPreview(hlsInput)}
                  </p>
                )}
              </div>
              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { setIsAddModalOpen(false); resetForm(); }} 
                  className="flex-grow bg-white/5 text-gray-500 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]"
                >
                  İPTAL
                </button>
                <button 
                  type="submit" 
                  className="flex-grow bg-brand-red text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-brand-red/20"
                >
                  {editEp ? 'GÜNCELLE' : 'OLUŞTUR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAniListModalOpen && bindingSeason && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-brand-black/90 backdrop-blur-xl" onClick={() => setIsAniListModalOpen(false)} />
          <div className="relative w-full max-w-3xl bg-brand-dark border border-brand-border p-10 rounded-[3rem] shadow-[0_0_100px_rgba(229,9,20,0.2)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                AniList Sezon Bağla · Sezon {bindingSeason.season_number}
              </h2>
              <button onClick={() => setIsAniListModalOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                value={anilistSearch}
                onChange={(e) => setAnilistSearch(e.target.value)}
                placeholder="AniList'te ara"
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black uppercase tracking-widest outline-none focus:border-brand-red"
              />
              <button
                onClick={searchAniList}
                disabled={anilistLoading}
                className="bg-brand-red hover:bg-brand-redHover text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-50"
              >
                {anilistLoading ? 'ARANIYOR...' : 'ARA'}
              </button>
            </div>
            {anilistError && (
              <div className="text-red-400 text-xs font-black uppercase tracking-widest mb-4">{anilistError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2">
              {anilistResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectAniList(item)}
                  disabled={seasons?.some((s) => s.anilist_id === item.id)}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-brand-red/40 transition-all disabled:opacity-40"
                >
                  <img src={item.coverImage?.large} className="w-16 h-24 object-cover rounded-xl" />
                  <div className="text-left">
                    <p className="text-white font-black text-sm uppercase">{item.title?.romaji || 'Başlık'}</p>
                    <p className="text-gray-500 text-xs uppercase">{item.title?.english || ''}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">
                      {item.format} · {item.episodes || 0} Bölüm · {item.seasonYear || '-'}
                    </p>
                  </div>
                </button>
              ))}
              {anilistResults.length === 0 && !anilistLoading && (
                <div className="text-gray-600 text-xs font-black uppercase tracking-widest">Sonuç yok</div>
              )}
            </div>
          </div>
        </div>
      )}

      {false && isMissingModalOpen && missingSummary && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-brand-black/90 backdrop-blur-xl" onClick={() => setIsMissingModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-brand-dark border border-brand-border p-8 rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white uppercase">Eksik Tarama</h2>
              <button onClick={() => setIsMissingModalOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <div>Eksik Bölüm: <span className="text-white font-black">{missingSummary.missing.length}</span></div>
              <div>Video Yok: <span className="text-white font-black">{missingSummary.noVideo.length}</span></div>
              <div>Hatalı: <span className="text-white font-black">{missingSummary.error.length}</span></div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handlePatchMissingOnly}
                className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Sadece Patch Dene
              </button>
              <button
                onClick={() => alert('Eksikleri indirme için Desktop Importer kullanın.')}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Eksikleri İndir
              </button>
            </div>
            {missingSummary.missing.length > 0 && (
              <div className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest">
                Eksik Bölümler: {missingSummary.missing.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {false && isAutoModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-black/90 backdrop-blur-xl" onClick={() => setIsAutoModalOpen(false)} />
          <div className="relative w-full max-w-5xl bg-brand-dark border border-brand-border p-8 rounded-[2.5rem] shadow-[0_0_100px_rgba(16,185,129,0.2)] space-y-8 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                  ⚡ Auto <span className="text-emerald-400">Import</span>
                </h2>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">yt-dlp → Bunny → Supabase</p>
              </div>
              <button onClick={() => setIsAutoModalOpen(false)} className="text-gray-500 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-2">Kaynak URL Şablonu</label>
                <input
                  type="text"
                  value={autoTemplate}
                  onChange={(e) => setAutoTemplate(e.target.value)}
                  placeholder="https://animely.net/anime/{anime_slug}/izle/{episode_number}"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs outline-none focus:border-emerald-400"
                />
                <p className="text-[11px] text-gray-500">
                  Sezon 1: animely.net/anime/{'{anime_slug}'}/izle/{'{episode_number}'} | Diğer sezonlar: animely.net/anime/{'{anime_slug}'}-{ '{season_number}' }-sezon/izle/{'{episode_number}'}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Mod</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAutoMode('season')}
                    className={`flex-1 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      autoMode === 'season'
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Sadece Seçili Sezon
                  </button>
                  <button
                    onClick={() => setAutoMode('all')}
                    className={`flex-1 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      autoMode === 'all'
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Tüm Sezonlar (AUTO)
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Sezon</label>
                  <input
                    type="number"
                    value={autoSeasonNumber}
                    onChange={(e) => setAutoSeasonNumber(parseInt(e.target.value) || autoSeasonNumber)}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-emerald-400 ${
                      autoMode === 'all' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={autoMode === 'all'}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Admin Token (X-ADMIN-TOKEN)</label>
                <input
                  type="password"
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  placeholder="ADMIN_TOKEN"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {autoError && <div className="text-red-400 text-sm font-semibold">{autoError}</div>}
            {autoResult && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-4 flex-wrap">
                  <span>Özet:</span>
                  <span className="text-emerald-400">{autoResult.summary?.imported || 0} import</span>
                  <span className="text-gray-300">{autoResult.summary?.skipped || 0} skip</span>
                  <span className="text-yellow-300">{autoResult.summary?.failed || 0} hata</span>
                  <span className="text-gray-400">{autoResult.summary?.total || 0} toplam</span>
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-4 flex-wrap">
                  <span>Durumlar:</span>
                  <span>Queued: {autoResult.statusCounts?.queued || 0}</span>
                  <span>Downloading: {autoResult.statusCounts?.downloading || 0}</span>
                  <span>Uploading: {autoResult.statusCounts?.uploading || 0}</span>
                  <span>Updating: {autoResult.statusCounts?.updating || 0}</span>
                  <span>Done: {autoResult.statusCounts?.done || 0}</span>
                  <span>Skipped: {autoResult.statusCounts?.skipped || 0}</span>
                  <span>Failed: {autoResult.statusCounts?.error || 0}</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {autoResult.items?.map((it: any) => (
                    <div key={it.episodeNumber} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-black">Ep {it.episodeNumber}</span>
                        <span className="text-gray-500 text-xs truncate max-w-[200px]">{it.pageUrl}</span>
                      </div>
                      <div className="text-xs font-black uppercase tracking-widest">
                        {it.status === 'done' && <span className="text-emerald-400">✓ Import</span>}
                        {it.status === 'skipped' && <span className="text-gray-400">Skip</span>}
                        {it.status === 'error' && <span className="text-red-400">{it.error}</span>}
                        {['downloading','uploading','updating'].includes(it.status) && <span className="text-gray-300">{it.status}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setIsAutoModalOpen(false)}
                className="flex-1 bg-white/5 text-gray-400 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]"
              >
                Kapat
              </button>
              <button
                onClick={runAutoImport}
                disabled={autoRunning}
                className="flex-1 bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/30 disabled:opacity-60"
              >
                {autoRunning ? 'Çalışıyor...' : 'İçe Aktarmayı Başlat'}
              </button>
            </div>
            {progress && (
              <div className="mt-3 bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-white">
                  <span>{progress.processed} / {progress.total} bölüm işlendi</span>
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-white/10 text-gray-200">
                    Direct Mode
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${progress.status === 'error' ? 'bg-red-500' : progress.failed > 0 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                    style={{ width: `${progress.percent || 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-300">
                  <span className="text-white font-semibold">
                    {progress.message || 'Devam ediyor...'}
                    {progress.lastUpdateAt && Date.now() - progress.lastUpdateAt > 10000 ? ' (Still working...)' : ''}
                  </span>
                  <span>Başarılı: {progress.success}</span>
                  <span>Hata: {progress.failed}</span>
                  <span>Toplam: {progress.total}</span>
                  {progress.error && <span className="text-red-400">Hata: {progress.error}</span>}
                </div>
                <div className="text-xs text-gray-400">
                  Bölüm indiriliyor (arka planda) · Bu işlem devam ederken sayfadan ayrılabilirsin
                </div>
                {(progress.status === 'downloading' || progress.status === 'uploading') && (
                  <div className="flex items-center gap-2 text-gray-200 text-xs">
                    <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    Devam ediyor
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminEpisodes;
