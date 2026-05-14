import React, { useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, ClipboardCheck, ExternalLink, Mail, RefreshCw, Save, Search, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';
import { db } from '@/services/db';
import { useLoad } from '@/services/useLoad';
import { TeamApplicationRecord, TeamApplicationStatus } from '@/types';

const statusLabels: Record<TeamApplicationStatus, string> = {
  pending: 'Beklemede',
  contacted: 'İletişime geçildi',
  trial_assigned: 'Deneme verildi',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
  archived: 'Arşivlendi',
};

const statusOptions = Object.keys(statusLabels) as TeamApplicationStatus[];

const categoryOptions = [
  'Tümü',
  'Takvim',
  'Yeni bölüm',
  'Katalog',
  'Moderasyon',
  'Sosyal medya',
  'Teknik',
  'Tasarım',
];

const textAreaClass =
  'w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-red/50';

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const matchesCategory = (app: TeamApplicationRecord, category: string) => {
  if (category === 'Tümü') return true;
  const haystack = [
    ...app.role_interests,
    app.weekly_availability,
    app.skills_text,
    app.contribution_plan,
    app.operations_scenario,
    app.trial_task_preference,
    app.trial_task_answer,
  ]
    .join(' ')
    .toLocaleLowerCase('tr-TR');
  const needle = category.toLocaleLowerCase('tr-TR');
  if (category === 'Katalog') return haystack.includes('katalog') || haystack.includes('anime veri');
  if (category === 'Teknik') return haystack.includes('teknik') || haystack.includes('frontend') || haystack.includes('hata');
  return haystack.includes(needle);
};

const AdminTeamApplications: React.FC = () => {
  const { data, loading, error, reload } = useLoad<TeamApplicationRecord[]>(db.getTeamApplications);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Tümü');
  const [statusFilter, setStatusFilter] = useState<TeamApplicationStatus | 'all'>('all');
  const [drafts, setDrafts] = useState<Record<string, Partial<TeamApplicationRecord>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const applications = data || [];
  const filteredApplications = useMemo(() => {
    const q = searchTerm.trim().toLocaleLowerCase('tr-TR');
    return applications.filter((app) => {
      const matchesSearch =
        !q ||
        [
          app.display_name,
          app.email,
          app.discord_or_social || '',
          app.site_username || '',
          app.role_interests.join(' '),
          app.skills_text,
          app.motivation_text,
          app.admin_notes || '',
        ]
          .join(' ')
          .toLocaleLowerCase('tr-TR')
          .includes(q);
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      return matchesSearch && matchesStatus && matchesCategory(app, category);
    });
  }, [applications, category, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const loggedIn = applications.filter((app) => Boolean(app.user_id)).length;
    return {
      total: applications.length,
      pending: applications.filter((app) => app.status === 'pending').length,
      trial: applications.filter((app) => app.status === 'trial_assigned').length,
      accepted: applications.filter((app) => app.status === 'accepted').length,
      loggedIn,
    };
  }, [applications]);

  const statCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Toplam', value: stats.total, icon: Users },
    { label: 'Beklemede', value: stats.pending, icon: ClipboardCheck },
    { label: 'Deneme', value: stats.trial, icon: CalendarCheck },
    { label: 'Kabul', value: stats.accepted, icon: CheckCircle2 },
    { label: 'Üye hesabı', value: stats.loggedIn, icon: ShieldCheck },
  ];

  const setDraft = (id: string, patch: Partial<TeamApplicationRecord>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };

  const getDraftValue = <K extends keyof TeamApplicationRecord>(app: TeamApplicationRecord, key: K): TeamApplicationRecord[K] => {
    return (drafts[app.id]?.[key] ?? app[key]) as TeamApplicationRecord[K];
  };

  const saveReview = async (app: TeamApplicationRecord) => {
    const draft = drafts[app.id] || {};
    setSavingId(app.id);
    try {
      await db.updateTeamApplicationReview(app.id, {
        status: (draft.status ?? app.status) as TeamApplicationStatus,
        admin_notes: (draft.admin_notes ?? app.admin_notes) || null,
        trial_task_assigned: (draft.trial_task_assigned ?? app.trial_task_assigned) || null,
        trial_score: draft.trial_score === undefined ? app.trial_score : draft.trial_score,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
      reload();
    } catch (err: any) {
      alert(err?.message || 'Başvuru güncellenemedi.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">
            Ekip <span className="text-brand-red">Başvuruları</span>
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500">
            Başvuru durumlarını, deneme görevlerini ve admin notlarını yönetin
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:border-brand-red/40 hover:bg-brand-red/10"
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-brand-dark p-5">
            <Icon className="h-5 w-5 text-brand-red" />
            <p className="mt-4 text-3xl font-black text-white">{value}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-brand-dark p-5 lg:grid-cols-[1fr_190px_190px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/30 py-4 pl-11 pr-4 text-sm text-white outline-none transition focus:border-brand-red/50"
            placeholder="İsim, e-posta, görev alanı veya notlarda ara"
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-brand-red/50"
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option} className="bg-zinc-950 text-white">
              {option}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TeamApplicationStatus | 'all')}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-brand-red/50"
        >
          <option value="all" className="bg-zinc-950 text-white">Tüm durumlar</option>
          {statusOptions.map((status) => (
            <option key={status} value={status} className="bg-zinc-950 text-white">
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSkeleton type="list" count={8} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && (
        <div className="space-y-5">
          {filteredApplications.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-brand-dark p-16 text-center">
              <ClipboardCheck className="mx-auto h-10 w-10 text-gray-700" />
              <p className="mt-5 text-sm font-black uppercase tracking-widest text-gray-500">Eşleşen ekip başvurusu yok</p>
            </div>
          ) : (
            filteredApplications.map((app) => (
              <article key={app.id} className="rounded-[2rem] border border-white/10 bg-brand-dark p-6 shadow-2xl">
                <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{app.display_name}</h2>
                      <span className="rounded-full border border-brand-red/30 bg-brand-red/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-brand-red">
                        {statusLabels[app.status]}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                        {app.user_id ? 'Üye' : 'Misafir'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                      <a href={`mailto:${app.email}`} className="inline-flex items-center gap-2 hover:text-brand-red">
                        <Mail className="h-3.5 w-3.5" />
                        {app.email}
                      </a>
                      {app.discord_or_social && <span>{app.discord_or_social}</span>}
                      {(app.profiles?.username || app.site_username) && <span>Site kullanıcısı: {app.profiles?.username || app.site_username}</span>}
                    </div>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{formatDate(app.created_at)}</p>
                    {app.page_url && (
                      <a
                        href={app.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-red hover:text-brand-redHover"
                      >
                        Form sayfası
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {app.role_interests.map((interest) => (
                    <span key={interest} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-300">
                      {interest}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {[
                    ['Haftalık müsaitlik', app.weekly_availability],
                    ['Yetkinlikler', app.skills_text],
                    ['Önceki deneyim', app.previous_experience || '-'],
                    ['İlk katkı planı', app.contribution_plan],
                    ['Operasyon senaryosu', app.operations_scenario],
                    ['Admin onayı cevabı', app.review_process_answer],
                    ['Deneme görevi tercihi', app.trial_task_preference],
                    ['Deneme görevi planı', app.trial_task_answer],
                    ['Ekip davranışı', app.conflict_scenario],
                    ['Motivasyon', app.motivation_text],
                  ].map(([title, body]) => (
                    <section key={`${app.id}-${title}`} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</h3>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{body}</p>
                    </section>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 rounded-2xl border border-brand-red/20 bg-brand-red/[0.04] p-5 lg:grid-cols-[180px_1fr_120px_auto]">
                  <div>
                    <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-gray-500">Durum</label>
                    <select
                      value={getDraftValue(app, 'status')}
                      onChange={(e) => setDraft(app.id, { status: e.target.value as TeamApplicationStatus })}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-xs font-bold text-white outline-none"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status} className="bg-zinc-950 text-white">
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-gray-500">Deneme görevi / sonraki aksiyon</label>
                    <textarea
                      value={getDraftValue(app, 'trial_task_assigned') || ''}
                      onChange={(e) => setDraft(app.id, { trial_task_assigned: e.target.value })}
                      className={`${textAreaClass} min-h-[92px] resize-y`}
                      placeholder="Örn. 10 anime katalog kontrolü verildi, cuma gününe kadar dönüş bekleniyor."
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-gray-500">Puan</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={getDraftValue(app, 'trial_score') ?? ''}
                      onChange={(e) => setDraft(app.id, { trial_score: e.target.value === '' ? null : Number(e.target.value) })}
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-xs font-bold text-white outline-none"
                      placeholder="0-100"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={savingId === app.id}
                      onClick={() => saveReview(app)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-red px-5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-brand-redHover disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Kaydet
                    </button>
                  </div>
                  <div className="lg:col-span-4">
                    <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-gray-500">Admin notu</label>
                    <textarea
                      value={getDraftValue(app, 'admin_notes') || ''}
                      onChange={(e) => setDraft(app.id, { admin_notes: e.target.value })}
                      className={`${textAreaClass} min-h-[110px] resize-y`}
                      placeholder="Adayla ilgili iç notlar, iletişim durumu, güçlü/zayıf taraflar..."
                    />
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTeamApplications;
