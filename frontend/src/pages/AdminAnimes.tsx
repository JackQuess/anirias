
import React, { useState } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { Link, useNavigate } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';

const AdminAnimes: React.FC = () => {
  const navigate = useNavigate();
  const { data: animes, loading, error, reload } = useLoad(() => db.getAllAnimes('created_at'));
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu animeyi ve tüm bölümlerini silmek istediğinize emin misiniz?')) return;
    try {
      setIsDeleting(id);
      await db.deleteAnime(id);
      reload();
    } catch (err: any) {
      alert('Silme hatası: ' + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredAnimes = animes?.filter(a => getDisplayTitle(a.title).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">İçerik <span className="text-brand-red">Yönetimi</span></h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Platformdaki tüm animeleri düzenleyin veya yenilerini ekleyin</p>
        </div>
        <button 
          onClick={() => navigate('/admin/animes/new')}
          className="bg-brand-red hover:bg-brand-redHover text-white px-10 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-brand-red/30 transition-all active:scale-95"
        >
          YENİ ANİME EKLE
        </button>
      </div>

      {/* Quick Filter */}
      <div className="relative">
         <input 
          type="text" 
          placeholder="ANİME ARA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-brand-dark border border-brand-border rounded-2xl px-12 py-4 text-xs font-black text-white uppercase tracking-widest outline-none focus:border-brand-red transition-all"
         />
         <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>

      {loading && <LoadingSkeleton type="list" count={8} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && filteredAnimes && (
        <div className="bg-brand-dark border border-brand-border rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border bg-white/5">
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Anime Bilgisi</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Puan / Yıl</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">İzlenme</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredAnimes.map((anime) => {
                const titleString = getDisplayTitle(anime.title);
                return (
                  <tr key={anime.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-20 rounded-xl overflow-hidden border border-brand-border shadow-lg">
                          <img
                            src={proxyImage(anime.cover_image || '')}
                            className="w-full h-full object-cover"
                            alt={titleString}
                            onError={(e) => {
                              const fallback = anime.cover_image || '';
                              if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                                (e.target as HTMLImageElement).src = fallback;
                              }
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-white font-black text-base uppercase tracking-tight group-hover:text-brand-red transition-colors">{titleString}</p>
                          <div className="flex gap-2 mt-1">
                            {anime.genres.slice(0, 2).map(g => (
                              <span key={g} className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{g}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-white font-black text-sm italic">{anime.year}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                         <span className="text-brand-red text-xs font-black italic">★ {anime.score}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-white font-black text-sm">{anime.view_count?.toLocaleString() || 0}</p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">GÖRÜNTÜLENME</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/admin/episodes/${anime.id}`} className="bg-white/5 hover:bg-white/10 text-[10px] font-black text-white px-4 py-2.5 rounded-xl border border-white/5 transition-all">BÖLÜMLER</Link>
                        <Link to={`/admin/animes/${anime.id}/edit`} className="bg-white/5 hover:bg-white/10 text-[10px] font-black text-white px-4 py-2.5 rounded-xl border border-white/5 transition-all">DÜZENLE</Link>
                        <button 
                          onClick={() => handleDelete(anime.id)}
                          disabled={isDeleting === anime.id}
                          className="bg-brand-red/10 hover:bg-brand-red text-brand-red hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-black transition-all disabled:opacity-20"
                        >
                          {isDeleting === anime.id ? '...' : 'SİL'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAnimes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-600 font-black uppercase text-xs tracking-[0.3em]">Aradığınız kriterde anime bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAnimes;
