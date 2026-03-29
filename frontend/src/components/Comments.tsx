
import React, { useState } from 'react';
import { useAuth } from '@/services/auth';
import { Link } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from './LoadingSkeleton';
import { getAvatarSrc } from '@/utils/avatar';
export interface CommentsProps {
  animeId: string;
  episodeId: string;
  /** İzleme sayfası: zip/prod ile aynı sade düzen */
  variant?: 'default' | 'watch';
}

const Comments: React.FC<CommentsProps> = ({ animeId, episodeId, variant = 'default' }) => {
  const { user, profile } = useAuth();
  const [commentText, setCommentText] = useState('');

  const shouldFetch =
    animeId &&
    episodeId &&
    typeof animeId === 'string' &&
    typeof episodeId === 'string' &&
    animeId !== 'all' &&
    episodeId !== 'all' &&
    animeId.trim() !== '' &&
    episodeId.trim() !== '';

  const { data: comments, loading, reload } = useLoad(
    () => {
      if (!shouldFetch) {
        return Promise.resolve([]);
      }
      return db.getComments(animeId, episodeId).catch(() => []);
    },
    [animeId, episodeId, shouldFetch]
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
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const isWatch = variant === 'watch';

  if (isWatch) {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white">
          Yorumlar <span className="text-white/40 font-normal">({comments?.length || 0})</span>
        </h3>

        {user ? (
          <div className="flex gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0 border border-white/10">
              {profile?.avatar_id ? (
                <img
                  src={getAvatarSrc(profile.avatar_id)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/70">
                  {(profile?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Yorum ekle…"
                rows={2}
                className="w-full bg-transparent border-0 border-b border-white/20 pb-2 outline-none focus:border-white transition-colors text-sm text-white placeholder:text-white/40 resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSend}
                  disabled={!commentText.trim()}
                  className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white disabled:opacity-40 transition-colors"
                >
                  Gönder
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/50 border-b border-white/10 pb-4">
            Yorum yazmak için{' '}
            <Link to="/login" className="text-primary hover:underline">
              giriş yap
            </Link>
            .
          </p>
        )}

        <div className="space-y-6">
          {loading && <LoadingSkeleton type="list" count={3} />}
          {!loading && comments && comments.length > 0 ? (
            comments.map((c) => (
              <div key={c.id} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1a1a24] overflow-hidden shrink-0 border border-white/5">
                  {c.profiles?.avatar_id ? (
                    <img
                      src={getAvatarSrc(c.profiles.avatar_id)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">
                      {(c.profiles?.username || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-white">
                      {c.profiles?.username || 'Anonim'}
                    </span>
                    <span className="text-xs text-white/40">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{c.text}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      —
                    </button>
                    <button type="button" className="text-xs text-white/50 hover:text-white transition-colors">
                      Yanıtla
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            !loading && (
              <p className="text-sm text-white/40 text-center py-8">Henüz yorum yok.</p>
            )
          )}
        </div>
      </div>
    );
  }

  /* —— default (diğer sayfalar) —— */
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
          Yorumlar <span className="text-gray-600">({comments?.length || 0})</span>
        </h3>
      </div>

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
          <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-xs">
            Yorum yapabilmek için{' '}
            <Link to="/login" className="text-brand-red">
              Giriş Yapmalısın
            </Link>
          </p>
        </div>
      )}

      <div className="space-y-6">
        {loading && <LoadingSkeleton type="list" count={3} />}

        {!loading && comments && comments.length > 0 ? (
          comments.map((c) => (
            <div
              key={c.id}
              className="group bg-brand-surface border border-brand-border rounded-[2rem] p-8 hover:border-white/10 transition-all"
            >
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
                    <span className="text-sm font-black text-white uppercase tracking-tight">
                      {c.profiles?.username || 'Anonim'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase italic ${
                        (c.user as any)?.role === 'admin'
                          ? 'bg-brand-red text-white'
                          : 'bg-white/10 text-gray-500'
                      }`}
                    >
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
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                Henüz yorum yok. İlk yorumu sen yap!
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Comments;
