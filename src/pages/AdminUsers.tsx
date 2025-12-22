
import React, { useState } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { Profile } from '../types';

const AdminUsers: React.FC = () => {
  const { data: users, loading, error, reload } = useLoad<Profile[]>(db.getAdminUsers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Üye <span className="text-brand-red">Yönetimi</span></h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Platformdaki tüm kullanıcıları ve yetkilerini görüntüleyin</p>
      </div>

      {loading && <LoadingSkeleton type="list" count={10} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && users && (
        <div className="bg-brand-dark border border-brand-border rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border bg-white/5">
                <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Kullanıcı Bilgisi</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Rol / Yetki</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Kayıt Tarihi</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="px-10 py-6">
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
                  <td className="px-10 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest italic ${
                      u.role === 'admin' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'bg-white/5 text-gray-500 border border-white/10'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-gray-400 font-black text-[10px] italic">{new Date(u.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => toggleRole(u)}
                      disabled={updatingId === u.id}
                      className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest border border-white/5 hover:border-white/20 px-4 py-2 rounded-xl transition-all disabled:opacity-30"
                    >
                      {updatingId === u.id ? '...' : (u.role === 'admin' ? 'YETKİSİNİ AL' : 'ADMİN YAP')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
