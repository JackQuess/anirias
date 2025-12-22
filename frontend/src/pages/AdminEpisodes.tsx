
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Season, Episode } from '../types';
import { getDisplayTitle } from '@/utils/title';

const AdminEpisodes: React.FC = () => {
  const { animeId } = useParams<{ animeId: string }>();
  const navigate = useNavigate();
  
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [isAction, setIsAction] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPatching, setIsPatching] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [autoTemplate, setAutoTemplate] = useState<string>('https://animely.net/anime/{anime_slug}/izle/{episode_number}');
  const [autoSeasonNumber, setAutoSeasonNumber] = useState<number>(1);
  const [autoMode, setAutoMode] = useState<'season' | 'all'>('season');
  const [autoResult, setAutoResult] = useState<any | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState('');

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

  const { data: anime } = useLoad(() => db.getAnimeById(animeId!), [animeId]);
  const { data: seasons, loading: seasonsLoading } = useLoad(() => db.getSeasons(animeId!), [animeId]);
  const { data: episodes, loading: episodesLoading, reload } = useLoad(() => 
    selectedSeasonId ? db.getEpisodes(animeId!, selectedSeasonId) : Promise.resolve([]), 
    [animeId, selectedSeasonId]
  );
  const [editEp, setEditEp] = useState<Partial<Episode> | null>(null);

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
      reload();
      alert(`Toplam: ${json.total || 0} | Başarılı: ${json.downloaded || 0} | Hata: ${json.failed || 0}`);
    } catch (err: any) {
      setAutoError(err?.message || 'Auto import başarısız');
    } finally {
      setAutoRunning(false);
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
      stream_id: (ep as any).stream_id || ep.stream_url,
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

  const handleCreateSeason = async () => {
    const num = prompt('Sezon Numarası:');
    if (!num) return;
    try {
      await db.createSeason({
        anime_id: animeId,
        season_number: parseInt(num),
        title: `Sezon ${num}`
      });
      window.location.reload();
    } catch (e) {
      alert('Sezon oluşturulamadı.');
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
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleCreateSeason}
            className="bg-brand-dark hover:bg-white/10 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-brand-border transition-all"
          >
            YENİ SEZON
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand-red hover:bg-brand-redHover text-white px-10 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-brand-red/30 transition-all active:scale-95"
          >
            YENİ BÖLÜM EKLE
          </button>
          <button
            onClick={handlePatchVideos}
            disabled={isPatching}
            className="bg-white/5 hover:bg-white/10 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-brand-border transition-all disabled:opacity-50"
          >
            🎬 Video Patch
          </button>
          <button
            onClick={() => setIsAutoModalOpen(true)}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/40 transition-all"
          >
            ⚡ Auto Import
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide border-b border-brand-border">
        {seasons?.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSeasonId(s.id)}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 ${
              selectedSeasonId === s.id 
              ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' 
              : 'bg-brand-dark text-gray-500 border border-brand-border hover:text-white'
            }`}
          >
            SEZON {s.season_number}
          </button>
        ))}
      </div>

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
                    <p className="text-[9px] text-gray-700 font-mono mt-1 max-w-xs truncate">
                      {formatHlsPreview(ep.hls_url)}
                    </p>
                  </td>
                  <td className="px-10 py-6 text-xs text-gray-500 font-bold italic">{Math.floor(ep.duration_seconds / 60)} DAKİKA</td>
                  <td className="px-10 py-6 text-right">
                     <div className="flex items-center justify-end gap-4">
                        <button 
                          onClick={() => handleEditClick(ep)}
                          className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-all"
                        >
                          DÜZENLE
                        </button>
                        <button 
                          onClick={() => handleDelete(ep.id)}
                          disabled={isAction === ep.id}
                          className="text-[10px] font-black text-brand-red/40 hover:text-brand-red uppercase tracking-widest transition-all disabled:opacity-20"
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

      {/* New Episode Modal */}
      {isAddModalOpen && (
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

      {isAutoModalOpen && (
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEpisodes;
