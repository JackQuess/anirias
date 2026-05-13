
import React, { useMemo, useState } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { Profile } from '../types';

const AdminUsers: React.FC = () => {
  const { data: users, loading, error, reload } = useLoad<Profile[]>(db.getAdminUsers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!users) return [];
    if (!q) return users;
    return users.filter((u) => {
      return (
        u.id.toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  const toggleRole = async (u: Profile) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`${u.username} adlı kullanıcının yetkisini ${newRole.toUpperCase()} yapmak istediğine emin misin?`)) return;
    
    setUpdatingId(u.id);
    try {
      await db.updateProfileRole(u.id, newRole);
      reload();
    } catch (e) {
      alert('Yetki güncellenemedi.');
    } finally {
      setUpdatingId(null);
    }
  };

  const banUser = async (u: Profile) => {
    const reason = window.prompt(`${u.username || u.id} için ban sebebi`, u.ban_reason || '');
    if (reason === null) return;
    if (!window.confirm(`${u.username || u.id} adlı kullanıcı banlansın mı?`)) return;

    setModeratingId(u.id);
    try {
      await db.updateUserModeration(u.id, {
        is_banned: true,
        ban_reason: reason.trim() || null,
      });
      reload();
    } catch (e: any) {
      alert(e?.message || 'Kullanıcı banlanamadı.');
    } finally {
      setModeratingId(null);
    }
  };

  const unbanUser = async (u: Profile) => {
    if (!window.confirm(`${u.username || u.id} adlı kullanıcının banı kaldırılsın mı?`)) return;

    setModeratingId(u.id);
    try {
      await db.updateUserModeration(u.id, {
        is_banned: false,
        ban_reason: null,
      });
      reload();
    } catch (e: any) {
      alert(e?.message || 'Ban kaldırılamadı.');
    } finally {
      setModeratingId(null);
    }
  };

  const warnUser = async (u: Profile) => {
    const message = window.prompt(`${u.username || u.id} için kişisel uyarı metni`, u.account_warning_message || '');
    if (message === null) return;
    const trimmed = message.trim();
    if (!trimmed) {
      alert('Uyarı metni boş olamaz. Uyarıyı kaldırmak için "UYARIYI TEMİZLE" kullan.');
      return;
    }

    setModeratingId(u.id);
    try {
      await db.updateUserModeration(u.id, {
        warning_message: trimmed,
      });
      reload();
    } catch (e: any) {
      alert(e?.message || 'Uyarı gönderilemedi.');
    } finally {
      setModeratingId(null);
    }
  };

  const clearWarning = async (u: Profile) => {
    if (!window.confirm(`${u.username || u.id} için kişisel uyarı temizlensin mi?`)) return;

    setModeratingId(u.id);
    try {
      await db.updateUserModeration(u.id, {
        clear_warning: true,
      });
      reload();
    } catch (e: any) {
      alert(e?.message || 'Uyarı temizlenemedi.');
    } finally {
      setModeratingId(null);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Üye <span className="text-brand-red">Yönetimi</span></h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Kullanıcı rolleri, ban durumu ve kişisel uyarılar</p>
        </div>
        <div className="w-full xl:w-96">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı adı, ID veya rol ara"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white placeholder:text-gray-600 outline-none transition focus:border-brand-red/60"
          />
          <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-gray-600">
            {filteredUsers.length} / {users?.length || 0} kullanıcı
          </p>
        </div>
      </div>

      {loading && <LoadingSkeleton type="list" count={10} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && users && (
        <div className="overflow-x-auto rounded-[2rem] border border-brand-border bg-brand-dark shadow-2xl">
          <table className="min-w-[1180px] w-full text-left">
            <thead>
              <tr className="border-b border-brand-border bg-white/5">
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Kullanıcı</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Rol</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Ban</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Kişisel Uyarı</th>
                <th className="px-6 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Kayıt</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center text-[10px] font-black text-brand-red shadow-lg">
                        {u.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-black text-sm uppercase tracking-tight">{u.username || 'İsimsiz Üye'}</p>
                        <p className="text-[9px] text-gray-700 font-mono tracking-tighter">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest italic ${
                      u.role === 'admin' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'bg-white/5 text-gray-500 border border-white/10'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-2">
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        u.is_banned ? 'bg-red-500/15 text-red-300 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        {u.is_banned ? 'Banlı' : 'Aktif'}
                      </span>
                      {u.ban_reason ? (
                        <p className="max-w-[210px] whitespace-pre-wrap text-[10px] font-bold leading-relaxed text-gray-500">{u.ban_reason}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-2">
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        u.account_warning_message ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' : 'bg-white/5 text-gray-600 border border-white/10'
                      }`}>
                        {u.account_warning_message ? 'Uyarı Var' : 'Yok'}
                      </span>
                      {u.account_warning_message ? (
                        <p className="max-w-[260px] whitespace-pre-wrap text-[10px] font-bold leading-relaxed text-gray-500">{u.account_warning_message}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-gray-400 font-black text-[10px] italic">{formatDate(u.created_at)}</p>
                    {u.updated_at ? <p className="mt-1 text-[9px] font-bold text-gray-700">Güncel: {formatDate(u.updated_at)}</p> : null}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => toggleRole(u)}
                        disabled={updatingId === u.id || moderatingId === u.id}
                        className="rounded-xl border border-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-gray-600 transition hover:border-white/20 hover:text-white disabled:opacity-30"
                      >
                        {updatingId === u.id ? '...' : (u.role === 'admin' ? 'Yetkiyi Al' : 'Admin Yap')}
                      </button>
                      {u.is_banned ? (
                        <button
                          onClick={() => unbanUser(u)}
                          disabled={updatingId === u.id || moderatingId === u.id}
                          className="rounded-xl border border-emerald-400/20 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-30"
                        >
                          {moderatingId === u.id ? '...' : 'Banı Kaldır'}
                        </button>
                      ) : (
                        <button
                          onClick={() => banUser(u)}
                          disabled={updatingId === u.id || moderatingId === u.id}
                          className="rounded-xl border border-red-500/20 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/10 disabled:opacity-30"
                        >
                          {moderatingId === u.id ? '...' : 'Banla'}
                        </button>
                      )}
                      <button
                        onClick={() => warnUser(u)}
                        disabled={updatingId === u.id || moderatingId === u.id}
                        className="rounded-xl border border-amber-300/20 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-amber-300 transition hover:bg-amber-300/10 disabled:opacity-30"
                      >
                        Uyarı Gönder
                      </button>
                      {u.account_warning_message ? (
                        <button
                          onClick={() => clearWarning(u)}
                          disabled={updatingId === u.id || moderatingId === u.id}
                          className="rounded-xl border border-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-gray-600 transition hover:border-white/20 hover:text-white disabled:opacity-30"
                        >
                          Uyarıyı Temizle
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-[10px] font-black uppercase tracking-widest text-gray-600">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
