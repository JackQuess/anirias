import React, { useState, useMemo, useCallback } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { Link, useNavigate } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { getDisplayTitle } from '@/utils/title';
import { proxyImage } from '@/utils/proxyImage';
import { Anime } from '../types';

const AdminAnimes: React.FC = () => {
  const navigate = useNavigate();

  // Fetch animes - always returns array
  const fetchAnimes = useCallback(async (): Promise<Anime[]> => {
    const data = await db.getAllAnimes('created_at');
    return Array.isArray(data) ? data : [];
  }, []);

  const { data: animesRaw, loading, error, reload } = useLoad(fetchAnimes);

  // CRITICAL: Ensure animes is ALWAYS an array
  const animes = useMemo(() => {
    return Array.isArray(animesRaw) ? animesRaw : [];
  }, [animesRaw]);

  // Local state
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [adminToken, setAdminToken] = useState('');

  // Filtered animes - always array
  const filteredAnimes = useMemo(() => {
    if (!Array.isArray(animes)) return [];
    return animes.filter(a => {
      const title = getDisplayTitle(a.title);
      return title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [animes, searchTerm]);

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    
    const token = adminToken || window.prompt('Admin Token (X-ADMIN-TOKEN)') || '';
    if (!token) {
      alert('Admin token gerekli.');
      setDeleteConfirm(null);
      return;
    }

    try {
      setIsDeleting(deleteConfirm.id);
      const result = await db.deleteAnime(deleteConfirm.id, token);
      
      if (result.success) {
        alert(`Anime ve tüm ilgili veriler başarıyla silindi.\n\nSilinen:\n- Anime: 1\n- Sezonlar: ${result.deleted?.seasons || 0}\n- Bölümler: ${result.deleted?.episodes || 0}\n- İzleme listesi: ${result.deleted?.watchlist || 0}\n- İlerleme: ${result.deleted?.watch_progress || 0}\n- Geçmiş: ${result.deleted?.watch_history || 0}\n- Yorumlar: ${result.deleted?.comments || 0}`);
      reload();
      } else {
        alert(`Silme hatası: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[AdminAnimes] Delete error:', err);
      alert('Silme hatası: ' + err.message);
    } finally {
      setIsDeleting(null);
      setDeleteConfirm(null);
      setAdminToken('');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
    setAdminToken('');
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            İçerik <span className="text-brand-red">Yönetimi</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Platformdaki tüm animeleri düzenleyin veya yenilerini ekleyin
          </p>
        </div>
        <button 
          onClick={() => navigate('/admin/animes/new')}
          className="bg-brand-red hover:bg-brand-redHover text-white px-10 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-brand-red/30 transition-all active:scale-95"
        >
          YENİ ANİME EKLE
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
         <input 
          type="text" 
          placeholder="ANİME ARA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-brand-dark border border-brand-border rounded-2xl px-12 py-4 text-xs font-black text-white uppercase tracking-widest outline-none focus:border-brand-red transition-all"
         />
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>

      {/* Loading State */}
      {loading && <LoadingSkeleton type="list" count={8} />}

      {/* Error State */}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {/* Anime List */}
      {!loading && !error && (
        <div className="bg-brand-dark border border-brand-border rounded-[2.5rem] overflow-hidden shadow-2xl">
          {filteredAnimes.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <p className="text-gray-600 font-black uppercase text-xs tracking-[0.3em]">
                {searchTerm ? 'Aradığınız kriterde anime bulunamadı.' : 'Henüz anime eklenmedi.'}
              </p>
            </div>
          ) : (
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
                            <p className="text-white font-black text-base uppercase tracking-tight group-hover:text-brand-red transition-colors">
                              {titleString}
                            </p>
                          <div className="flex gap-2 mt-1">
                              {Array.isArray(anime.genres) && anime.genres.slice(0, 2).map(g => (
                                <span key={g} className="text-[9px] text-gray-600 font-black uppercase tracking-widest">
                                  {g}
                                </span>
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
                          <Link 
                            to={`/admin/episodes/${anime.id}`} 
                            className="bg-white/5 hover:bg-white/10 text-[10px] font-black text-white px-4 py-2.5 rounded-xl border border-white/5 transition-all"
                          >
                            BÖLÜMLER
                          </Link>
                          <Link 
                            to={`/admin/animes/${anime.id}/edit`} 
                            className="bg-white/5 hover:bg-white/10 text-[10px] font-black text-white px-4 py-2.5 rounded-xl border border-white/5 transition-all"
                          >
                            DÜZENLE
                          </Link>
                        <button 
                            onClick={() => handleDeleteClick(anime.id, titleString)}
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
            </tbody>
          </table>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-brand-black/90 backdrop-blur-xl" onClick={handleDeleteCancel} />
          <div className="relative w-full max-w-lg bg-brand-dark border border-brand-red/50 p-10 rounded-[3rem] shadow-[0_0_100px_rgba(229,9,20,0.3)]">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">
              <span className="text-brand-red">SİLME</span> ONAYI
            </h2>
            <p className="text-white/80 text-sm mb-6 leading-relaxed">
              Bu anime ve <strong className="text-brand-red">TÜM bölümleri</strong> kalıcı olarak silinecek.
            </p>
            <div className="bg-brand-red/10 border border-brand-red/30 rounded-2xl p-4 mb-6">
              <p className="text-white font-black text-lg uppercase italic">
                {getDisplayTitle(deleteConfirm.title)}
              </p>
            </div>
            <p className="text-gray-400 text-xs mb-6">
              Bu işlem geri alınamaz. Aşağıdaki veriler silinecek:
            </p>
            <ul className="text-gray-500 text-xs space-y-1 mb-6 list-disc list-inside">
              <li>Tüm sezonlar</li>
              <li>Tüm bölümler</li>
              <li>İzleme listesi kayıtları</li>
              <li>İzleme ilerlemesi</li>
              <li>İzleme geçmişi</li>
              <li>Yorumlar</li>
            </ul>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">
                  Admin Token (X-ADMIN-TOKEN)
                </label>
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="ADMIN_TOKEN"
                  className="w-full bg-brand-black border border-brand-border rounded-xl px-4 py-3 text-xs font-black text-white uppercase tracking-widest outline-none focus:border-brand-red transition-all"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  İPTAL
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting === deleteConfirm.id}
                  className="flex-1 bg-brand-red hover:bg-brand-redHover text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {isDeleting === deleteConfirm.id ? 'SİLİNİYOR...' : 'SİL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnimes;
