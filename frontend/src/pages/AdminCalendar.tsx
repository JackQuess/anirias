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
      await db.updateEpisode(editing.id, {
        status: form.status,
        air_date: form.air_date || null,
        episode_number: form.episode_number,
        short_note: form.short_note || null,
      });
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
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Takvim Yönetimi</h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Bölüm durumları ve yayın saatleri</p>
        </div>
        <button onClick={reload} className="text-[10px] font-black text-white bg-brand-red px-5 py-3 rounded-xl uppercase tracking-widest hover:bg-brand-redHover transition-all">Yenile</button>
      </div>

      {loading && <LoadingSkeleton type="list" count={5} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && (
        <div className="bg-brand-dark border border-brand-border rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full">
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
          {rows.length === 0 && (
            <div className="py-16 text-center text-gray-600 text-xs font-black uppercase tracking-widest">Kayıt yok</div>
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-xl bg-brand-surface border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Bölüm Ayarları</h3>
            <form className="space-y-4" onSubmit={handleSave}>
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
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">İptal</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-brand-red hover:bg-brand-redHover text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-red/20 disabled:opacity-50">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
