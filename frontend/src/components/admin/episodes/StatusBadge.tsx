import React from 'react';

export type EpisodeStatusDisplay =
  | 'READY'
  | 'DOWNLOADING'
  | 'ERROR'
  | 'NOT_ADDED'
  | 'PAUSED_NEEDS_SLUG'
  | 'METADATA_MISSING'
  | string;

const STATUS_STYLES: Record<string, string> = {
  READY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ready: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  patched: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  DOWNLOADING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  downloading: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  uploading: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending_download: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ERROR: 'bg-red-500/20 text-red-400 border-red-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  source_missing: 'bg-red-500/20 text-red-400 border-red-500/30',
  NOT_ADDED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  missing: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  PAUSED_NEEDS_SLUG: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  METADATA_MISSING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  READY: 'Hazır',
  ready: 'Hazır',
  patched: 'Hazır',
  done: 'Hazır',
  DOWNLOADING: 'İndiriliyor',
  downloading: 'İndiriliyor',
  uploading: 'Yükleniyor',
  pending: 'Bekliyor',
  pending_download: 'İndirilecek',
  ERROR: 'Hata',
  error: 'Hata',
  source_missing: 'Kaynak Yok',
  NOT_ADDED: 'Eklenmemiş',
  missing: 'Eklenmemiş',
  PAUSED_NEEDS_SLUG: 'Slug Gerekli',
  paused: 'Beklemede',
  METADATA_MISSING: 'Metadata Eksik',
};

interface StatusBadgeProps {
  status: EpisodeStatusDisplay | null | undefined;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const s = (status || 'NOT_ADDED').toString();
  const style = STATUS_STYLES[s] || STATUS_STYLES.NOT_ADDED || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  const label = STATUS_LABELS[s] || s;
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${style} ${className}`}
    >
      {label}
    </span>
  );
};
