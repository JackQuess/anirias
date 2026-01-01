import React, { useMemo, useState } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { Episode, Anime } from '@/types';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { getDisplayTitle } from '@/utils/title';

type Row = Episode & { anime: Anime | null };

const statusOptions = [
  { value: 'waiting', label: 'Bekleniyor' },
  { value: 'published', label: 'Yayında' },
  { value: 'airing', label: 'Sitemizde' },
];

const AdminCalendar: React.FC = () => {
  const { data, loading, error, reload } = useLoad<Row[]>(db.getCalendarEpisodes);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Partial<Row>>({});
  const [isSaving, setIsSaving] = useState(false);

  const rows = useMemo(() => data || [], [data]);

  const openEdit = (row: Row) => {
    setEditing(row);
    setForm({
      status: row.status || 'waiting',
      air_date: row.air_date || '',
      episode_number: row.episode_number,
      short_note: row.short_note || '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setIsSaving(true);
    try {
      const adminToken =
        localStorage.getItem('admin_token') ||
        localStorage.getItem('ADMIN_TOKEN') ||
        undefined;
      await db.updateEpisode(editing.id, {
        status: form.status,
        air_date: form.air_date || null,
        episode_number: form.episode_number,
        short_note: form.short_note || null,
      }, adminToken);
      setEditing(null);
      setForm({});
      await reload();
    } catch {
      alert('Kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter">Takvim Yönetimi</h1>
          <p className="text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Bölüm durumları ve yayın saatleri</p>
        </div>
        <button onClick={reload} className="text-[9px] lg:text-[10px] font-black text-white bg-brand-red px-4 lg:px-5 py-3 rounded-lg lg:rounded-xl uppercase tracking-widest active:bg-brand-redHover lg:hover:bg-brand-redHover transition-all touch-manipulation">Yenile</button>
      </div>

      {loading && <LoadingSkeleton type="list" count={5} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && (
        <div className="bg-brand-dark border border-brand-border rounded-2xl lg:rounded-[2.5rem] overflow-hidden shadow-2xl">
          {/* Desktop Table */}
          <table className="hidden lg:table w-full">
            <thead className="bg-white/5 border-b border-brand-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Anime</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Bölüm</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Durum</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Yayın</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Not</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={row.anime?.cover_image || ''} className="w-10 h-14 object-cover rounded-lg border border-white/10" />
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">{row.anime ? getDisplayTitle(row.anime.title) : 'Anime'}</p>
                        <p className="text-[10px] text-gray-600 font-bold">ID: {row.anime_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-bold">Bölüm {row.episode_number}</td>
                  <td className="px-6 py-4 text-[10px] font-black uppercase">
                    {statusOptions.find(s => s.value === row.status)?.label || 'Bekleniyor'}
                  </td>
                  <td className="px-6 py-4 text-white text-sm">{row.air_date ? new Date(row.air_date).toLocaleString('tr-TR') : '-'}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm line-clamp-2">{row.short_note || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(row)} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all">Düzenle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="lg:hidden divide-y divide-brand-border">
            {rows.map(row => (
              <div key={row.id} className="p-4 active:bg-white/[0.03] transition-colors">
                <div className="flex gap-3 mb-3">
                  <img src={row.anime?.cover_image || ''} className="w-12 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white uppercase tracking-tight truncate">{row.anime ? getDisplayTitle(row.anime.title) : 'Anime'}</p>
                    <p className="text-[10px] font-bold text-white mt-1">Bölüm {row.episode_number}</p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">ID: {row.anime_id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-[8px] text-gray-500 uppercase font-black mb-1">DURUM</p>
                    <p className="text-[10px] font-black text-white uppercase">{statusOptions.find(s => s.value === row.status)?.label || 'Bekleniyor'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-gray-500 uppercase font-black mb-1">YAYIN</p>
                    <p className="text-[10px] text-white">{row.air_date ? new Date(row.air_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</p>
                  </div>
                </div>
                {row.short_note && (
                  <p className="text-[10px] text-gray-500 mb-3 line-clamp-2">{row.short_note}</p>
                )}
                <button onClick={() => openEdit(row)} className="w-full bg-white/5 active:bg-white/10 text-white px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all touch-manipulation">Düzenle</button>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="py-12 lg:py-16 text-center text-gray-600 text-[10px] lg:text-xs font-black uppercase tracking-widest">Kayıt yok</div>
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-xl bg-brand-surface border border-white/10 rounded-xl lg:rounded-[2rem] p-6 lg:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg lg:text-xl font-black text-white uppercase tracking-tighter mb-4 lg:mb-6">Bölüm Ayarları</h3>
            <form className="space-y-3 lg:space-y-4" onSubmit={handleSave}>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Durum</label>
                <select
                  value={form.status || 'waiting'}
                  onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-red"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Yayın Tarihi / Saati</label>
                <input
                  type="datetime-local"
                  value={form.air_date ? form.air_date.slice(0,16) : ''}
                  onChange={(e) => setForm(prev => ({ ...prev, air_date: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-red"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Bölüm Numarası</label>
                <input
                  type="number"
                  value={form.episode_number ?? ''}
                  onChange={(e) => setForm(prev => ({ ...prev, episode_number: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-red"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Kısa Not</label>
                <textarea
                  rows={2}
                  value={form.short_note || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, short_note: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-red resize-none"
                />
              </div>
              <div className="flex gap-2 lg:gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-white/5 active:bg-white/10 lg:hover:bg-white/10 text-white py-3 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest touch-manipulation">İptal</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-brand-red active:bg-brand-redHover lg:hover:bg-brand-redHover text-white py-3 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-red/20 disabled:opacity-50 touch-manipulation">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
