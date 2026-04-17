import React, { useCallback, useState } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';
import { getAdminToken } from '@/utils/adminToken';
import { getDisplayTitle } from '@/utils/title';
import type { Comment, CommentReportListItem } from '@/types';

const AdminCommentModeration: React.FC = () => {
  const adminToken = getAdminToken() ?? '';
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!adminToken) throw new Error('Admin token gerekli (tarayıcıda kayıtlı token).');
    const data = await db.getCommentModeration(adminToken);
    if (!data.success) throw new Error('Yükleme başarısız');
    return data;
  }, [adminToken]);

  const { data, loading, error, reload } = useLoad(load, [adminToken]);

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const run = async (id: string | null, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await reload();
    } catch (e: any) {
      alert(e?.message || 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  const reports: CommentReportListItem[] = data?.reports || [];
  const deleted: Comment[] = data?.deletedComments || [];

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter md:text-4xl">
          Yorum <span className="text-brand-red">moderasyonu</span>
        </h1>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
          Şikayetler ve silinmiş yorumlar (yumuşak silme — satır veritabanında kalır)
        </p>
      </div>

      {!adminToken ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Admin panelde işlem için admin token gerekir. Genel bakıştan token veya ortam değişkeni ile giriş yapın.
        </p>
      ) : null}

      {loading && <LoadingSkeleton type="list" count={6} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && data && (
        <>
          <section className="rounded-[2rem] border border-white/10 bg-brand-surface p-6 shadow-xl md:p-10">
            <h2 className="mb-6 text-lg font-black uppercase tracking-tight text-white">
              Şikayetler <span className="text-gray-500">({reports.length})</span>
            </h2>
            {reports.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz şikayet yok.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {reports.map((r) => {
                  const c = r.comment;
                  const title = c?.animes ? getDisplayTitle((c.animes as any).title) : '—';
                  const slug = (c?.animes as any)?.slug;
                  return (
                    <li key={r.id} className="py-6 first:pt-0">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {formatDate(r.created_at)} · sebep: {r.reason}
                          </p>
                          <p className="text-xs text-gray-400">
                            <span className="text-white/70">Şikayet eden:</span> {r.reporter_user_id.slice(0, 8)}…
                          </p>
                          {r.details ? (
                            <p className="text-sm text-white/80">&quot;{r.details}&quot;</p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            Anime: {title}
                            {slug ? ` · /watch/${slug}/…` : ''}
                          </p>
                          <blockquote className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-amber-100/90">
                            {(c as any)?.text || (c as any)?.content || '(Yorum metni yüklenemedi veya silinmiş)'}
                          </blockquote>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 md:items-end">
                          {c?.id ? (
                            <button
                              type="button"
                              disabled={busyId !== null}
                                onClick={() =>
                                  void run(c!.id, async () => {
                                    await db.adminSoftDeleteComment(c!.id, 'Şikayet sonrası moderasyon', adminToken);
                                  })
                                }
                              className="rounded-lg bg-brand-red px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:brightness-110 disabled:opacity-50"
                            >
                              Yorumu kaldır
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-brand-surface p-6 shadow-xl md:p-10">
            <h2 className="mb-6 text-lg font-black uppercase tracking-tight text-white">
              Silinmiş yorumlar <span className="text-gray-500">({deleted.length})</span>
            </h2>
            {deleted.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz silinmiş yorum yok.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {deleted.map((c) => {
                  const title = c.animes ? getDisplayTitle((c.animes as any).title) : '—';
                  return (
                    <li key={c.id} className="py-6 first:pt-0">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Silinme: {c.deleted_at ? formatDate(c.deleted_at) : '—'} ·{' '}
                            <span className="text-amber-400">{c.deleted_kind || '—'}</span>
                            {c.deleted_reason ? ` · ${c.deleted_reason}` : ''}
                          </p>
                          <p className="text-xs text-gray-400">
                            Yazar: {c.profiles?.username || c.user_id?.slice(0, 8)} · Anime: {title}
                          </p>
                          <blockquote className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/85">
                            {c.text}
                          </blockquote>
                        </div>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() =>
                            void run(c.id, async () => {
                              await db.adminRestoreComment(c.id, adminToken);
                            })
                          }
                          className="h-fit shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          Yorumu geri aç
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminCommentModeration;
