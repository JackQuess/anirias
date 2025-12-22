
import React, { useState } from 'react';
import { useAuth } from '@/services/auth';
import { Link } from 'react-router-dom';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from './LoadingSkeleton';
import { getAvatarSrc } from '@/utils/avatar';

const Comments: React.FC<{ animeId: string; episodeId: string }> = ({ animeId, episodeId }) => {
  const { user, profile } = useAuth();
  const [commentText, setCommentText] = useState('');
  
  // Load comments from DB
  const { data: comments, loading, reload } = useLoad(
    () => db.getComments(animeId, episodeId), 
    [animeId, episodeId]
  );

  const handleSend = async () => {
    if (!commentText.trim() || !user) return;
    try {
      await db.addComment({
        user_id: user.id,
        anime_id: animeId,
        episode_id: episodeId,
        text: commentText,
        user: profile || undefined,
      });
      setCommentText('');
      reload();
    } catch (e) {
      alert('Yorum gönderilemedi.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds

    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Yorumlar <span className="text-gray-600">({comments?.length || 0})</span></h3>
      </div>

      {/* Comment Input */}
      {user ? (
        <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 flex gap-6">
          <div className="w-14 h-14 bg-brand-red rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-xl shadow-brand-red/10 overflow-hidden">
            {profile?.avatar_id ? (
              <img src={getAvatarSrc(profile.avatar_id)} className="w-full h-full object-cover" />
            ) : (
              (profile?.username || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-grow space-y-4">
            <textarea 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Bölüm hakkındaki düşüncelerini paylaş..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-brand-red transition-all resize-none min-h-[120px] placeholder:text-gray-700"
            />
            <div className="flex justify-end">
               <button 
                onClick={handleSend}
                disabled={!commentText.trim()}
                className="bg-brand-red hover:bg-brand-redHover text-white px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-red/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
               >
                 YORUMU PAYLAŞ
               </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-12 text-center">
           <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-xs">Yorum yapabilmek için <Link to="/login" className="text-brand-red">Giriş Yapmalısın</Link></p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {loading && <LoadingSkeleton type="list" count={3} />}
        
        {!loading && comments && comments.length > 0 ? (
          comments.map(c => (
            <div key={c.id} className="group bg-brand-surface border border-brand-border rounded-[2rem] p-8 hover:border-white/10 transition-all">
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 font-black border border-white/5 overflow-hidden">
                  {c.profiles?.avatar_id ? (
                    <img src={getAvatarSrc(c.profiles.avatar_id)} className="w-full h-full object-cover" />
                  ) : (
                    (c.profiles?.username || 'A').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-grow space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-white uppercase tracking-tight">{c.profiles?.username || 'Anonim'}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase italic ${
                      (c.user as any)?.role === 'admin' ? 'bg-brand-red text-white' : 'bg-white/10 text-gray-500'
                    }`}>
                      {(c.user as any)?.role || 'Üye'}
                    </span>
                    <span className="text-[10px] text-gray-700 font-bold ml-auto">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{c.text}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
           !loading && (
             <div className="text-center py-10 opacity-50">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Henüz yorum yok. İlk yorumu sen yap!</p>
             </div>
           )
        )}
      </div>
    </div>
  );
};

export default Comments;
