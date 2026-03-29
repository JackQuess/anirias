import React, { useState, useEffect } from 'react';
import { useAuth } from '@/services/auth';
import { Link } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from './LoadingSkeleton';
import { getAvatarSrc } from '@/utils/avatar';
import type { Comment } from '@/types';

/** Spoiler yorum: kapalıyken tıklanınca açılır. */
const CommentSpoilerText: React.FC<{
  commentId: string;
  text: string;
  isSpoiler?: boolean;
  className: string;
}> = ({ commentId, text, isSpoiler, className }) => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [commentId]);

  if (!isSpoiler) {
    return <p className={className}>{text}</p>;
  }

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="w-full rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-left transition-colors hover:bg-amber-500/15"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Spoiler</span>
        <span className="block text-xs text-white/55 mt-0.5">İçeriği göstermek için tıkla</span>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <p className={className}>{text}</p>
      <button
        type="button"
        onClick={() => setRevealed(false)}
        className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70"
      >
        Gizle
      </button>
    </div>
  );
};

const SpoilerComposerTag: React.FC<{ active: boolean; onToggle: () => void; compact?: boolean }> = ({
  active,
  onToggle,
  compact,
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={cn(
      'font-black uppercase tracking-widest transition-colors border rounded-lg',
      compact ? 'text-[9px] px-2.5 py-1' : 'text-[10px] px-3 py-1.5',
      active
        ? 'border-amber-400/60 text-amber-400 bg-amber-500/15'
        : 'border-white/15 text-white/45 hover:text-white/80 hover:border-white/25'
    )}
  >
    Spoiler
  </button>
);

export interface CommentsProps {
  animeId: string;
  episodeId: string;
  /** İzleme sayfası: zip/prod ile aynı sade düzen */
  variant?: 'default' | 'watch';
}

const Comments: React.FC<CommentsProps> = ({ animeId, episodeId, variant = 'default' }) => {
  const { user, profile } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [composerSpoiler, setComposerSpoiler] = useState(false);
  const [replyingToParentId, setReplyingToParentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySpoiler, setReplySpoiler] = useState(false);

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
      return db.getComments(animeId, episodeId, user?.id ?? null).catch(() => []);
    },
    [animeId, episodeId, shouldFetch, user?.id]
  );

  const handleSend = async (parentId?: string | null) => {
    const text = (parentId ? replyText : commentText).trim();
    if (!text || !user) return;
    const isSpoilerFlag = parentId ? replySpoiler : composerSpoiler;
    try {
      await db.addComment({
        user_id: user.id,
        anime_id: animeId,
        episode_id: episodeId,
        text,
        parent_id: parentId ?? undefined,
        is_spoiler: isSpoilerFlag,
      });
      if (parentId) {
        setReplyText('');
        setReplySpoiler(false);
        setReplyingToParentId(null);
      } else {
        setCommentText('');
        setComposerSpoiler(false);
      }
      reload();
    } catch (e) {
      alert('Yorum gönderilemedi.');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      alert('Beğenmek için giriş yapın.');
      return;
    }
    try {
      await db.toggleCommentLike(user.id, commentId);
      reload();
    } catch {
      alert('Beğeni kaydedilemedi.');
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

  const watchAvatarBlock = (c: Comment, small: boolean) => (
    <div
      className={cn(
        'rounded-full bg-[#1a1a24] overflow-hidden shrink-0 border border-white/5',
        small ? 'w-8 h-8' : 'w-10 h-10'
      )}
    >
      {c.profiles?.avatar_id ? (
        <img src={getAvatarSrc(c.profiles.avatar_id)} alt="" className="w-full h-full object-cover" />
      ) : (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center font-bold text-white/50',
            small ? 'text-[10px]' : 'text-xs'
          )}
        >
          {(c.profiles?.username || 'A').charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SpoilerComposerTag active={composerSpoiler} onToggle={() => setComposerSpoiler((v) => !v)} compact />
                <button
                  type="button"
                  onClick={() => void handleSend()}
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
              <div key={c.id} className="space-y-3">
                <div className="flex gap-4">
                  {watchAvatarBlock(c, false)}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-white">{c.profiles?.username || 'Anonim'}</span>
                      {c.is_spoiler ? (
                        <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/35">
                          Spoiler
                        </span>
                      ) : null}
                      <span className="text-xs text-white/40">{formatDate(c.created_at)}</span>
                    </div>
                    <CommentSpoilerText
                      commentId={c.id}
                      text={c.text}
                      isSpoiler={c.is_spoiler}
                      className="text-sm text-white/80 leading-relaxed"
                    />
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <button
                        type="button"
                        onClick={() => void handleCommentLike(c.id)}
                        className={cn(
                          'flex items-center gap-1 text-xs transition-colors',
                          c.liked_by_me ? 'text-primary' : 'text-white/50 hover:text-white'
                        )}
                      >
                        <ThumbsUp className={cn('w-3.5 h-3.5', c.liked_by_me && 'fill-current')} />
                        {c.like_count ?? 0}
                      </button>
                      {user ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToParentId((prev) => (prev === c.id ? null : c.id));
                            setReplyText('');
                            setReplySpoiler(false);
                          }}
                          className="text-xs text-white/50 hover:text-white transition-colors"
                        >
                          {replyingToParentId === c.id ? 'Vazgeç' : 'Yanıtla'}
                        </button>
                      ) : null}
                    </div>

                    {replyingToParentId === c.id && user ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`${c.profiles?.username || 'Kullanıcı'} yanıtla…`}
                          rows={2}
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary resize-none"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <SpoilerComposerTag active={replySpoiler} onToggle={() => setReplySpoiler((v) => !v)} compact />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToParentId(null);
                                setReplyText('');
                                setReplySpoiler(false);
                              }}
                              className="text-[10px] font-bold uppercase text-white/40 hover:text-white"
                            >
                              İptal
                            </button>
                            <button
                              type="button"
                              disabled={!replyText.trim()}
                              onClick={() => void handleSend(c.id)}
                              className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white disabled:opacity-40"
                            >
                              Yanıt gönder
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {(c.replies?.length ?? 0) > 0 ? (
                  <div className="ml-4 pl-4 border-l border-white/10 space-y-4">
                    {c.replies!.map((r) => (
                      <div key={r.id} className="flex gap-3">
                        {watchAvatarBlock(r, true)}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="font-semibold text-xs text-white">{r.profiles?.username || 'Anonim'}</span>
                            {r.is_spoiler ? (
                              <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/35">
                                Spoiler
                              </span>
                            ) : null}
                            <span className="text-[10px] text-white/40">{formatDate(r.created_at)}</span>
                          </div>
                          <CommentSpoilerText
                            commentId={r.id}
                            text={r.text}
                            isSpoiler={r.is_spoiler}
                            className="text-xs text-white/75 leading-relaxed"
                          />
                          <button
                            type="button"
                            onClick={() => void handleCommentLike(r.id)}
                            className={cn(
                              'flex items-center gap-1 text-[10px] mt-1.5 transition-colors',
                              r.liked_by_me ? 'text-primary' : 'text-white/45 hover:text-white'
                            )}
                          >
                            <ThumbsUp className={cn('w-3 h-3', r.liked_by_me && 'fill-current')} />
                            {r.like_count ?? 0}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            !loading && <p className="text-sm text-white/40 text-center py-8">Henüz yorum yok.</p>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SpoilerComposerTag active={composerSpoiler} onToggle={() => setComposerSpoiler((v) => !v)} />
              <button
                type="button"
                onClick={() => void handleSend()}
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
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-black text-white uppercase tracking-tight">
                      {c.profiles?.username || 'Anonim'}
                    </span>
                    {c.is_spoiler ? (
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/35">
                        Spoiler
                      </span>
                    ) : null}
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
                  <CommentSpoilerText
                    commentId={c.id}
                    text={c.text}
                    isSpoiler={c.is_spoiler}
                    className="text-gray-400 text-sm leading-relaxed"
                  />
                  {(c.replies?.length ?? 0) > 0 ? (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      {c.replies!.map((r) => (
                        <div key={r.id} className="text-gray-500 text-xs pl-3 border-l-2 border-brand-red/40 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-white/70 font-bold">{r.profiles?.username || 'Anonim'}</span>
                            {r.is_spoiler ? (
                              <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                Spoiler
                              </span>
                            ) : null}
                          </div>
                          <CommentSpoilerText
                            commentId={r.id}
                            text={r.text}
                            isSpoiler={r.is_spoiler}
                            className="text-gray-500 text-xs leading-relaxed"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
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
