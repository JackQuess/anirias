import React from 'react';
import { Episode } from '@/types';
import { StatusBadge } from './StatusBadge';
import type { FilterChip } from './OpsBar';

interface EpisodeRowProps {
  episode: Episode;
  seasonNumber?: number;
  search: string;
  activeFilters: FilterChip[];
  onLogs: (ep: Episode, jobId?: string) => void;
  onEdit: (ep: Episode) => void;
  onVideoPatch: (ep: Episode) => void;
  onRetry: (ep: Episode) => void;
  onDelete: (ep: Episode) => void;
  onPausedResolve: (ep: Episode) => void;
}

function matchesSearch(ep: Episode, search: string): boolean {
  if (!search.trim()) return true;
  const s = search.toLowerCase();
  const num = String(ep.episode_number);
  const status = (ep.status || '').toLowerCase();
  const video = (ep.video_url || '').toLowerCase();
  const title = (ep.title || '').toLowerCase();
  return num.includes(s) || status.includes(s) || video.includes(s) || title.includes(s);
}

function statusToFilter(s: string | null | undefined): FilterChip | null {
  const m: Record<string, FilterChip> = {
    ready: 'READY',
    patched: 'READY',
    done: 'READY',
    downloading: 'DOWNLOADING',
    uploading: 'DOWNLOADING',
    pending: 'DOWNLOADING',
    pending_download: 'DOWNLOADING',
    error: 'ERROR',
    source_missing: 'ERROR',
    missing: 'NOT_ADDED',
    paused: 'PAUSED_NEEDS_SLUG',
  };
  return (s && m[s]) || null;
}

function matchesFilter(ep: Episode, filters: FilterChip[]): boolean {
  if (filters.length === 0) return true;
  const f = statusToFilter(ep.status);
  return f ? filters.includes(f) : false;
}

export const EpisodeRow: React.FC<EpisodeRowProps> = ({
  episode,
  seasonNumber = 1,
  search,
  activeFilters,
  onLogs,
  onEdit,
  onVideoPatch,
  onRetry,
  onDelete,
  onPausedResolve,
}) => {
  if (!matchesSearch(episode, search) || !matchesFilter(episode, activeFilters)) return null;

  const isPaused = (episode.status || '').toLowerCase().includes('paused');
  const hasError = ['error', 'source_missing'].includes((episode.status || '').toLowerCase());
  const isDownloading = ['downloading', 'uploading', 'pending', 'pending_download'].includes(
    (episode.status || '').toLowerCase()
  );

  const domain = episode.video_url ? new URL(episode.video_url).hostname : null;

  return (
    <tr className="hover:bg-white/[0.03] transition-colors group">
      <td className="px-6 py-4 font-black text-brand-red italic text-xl">
        {episode.episode_number < 10 ? `0${episode.episode_number}` : episode.episode_number}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-brand-border">
            S{seasonNumber} E{episode.episode_number}
          </span>
          <StatusBadge status={episode.status} />
        </div>
        <p className="text-white font-black text-sm uppercase tracking-tight mt-1">
          {episode.title || `Bölüm ${episode.episode_number}`}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500">
          {domain && <span className="font-mono truncate max-w-[200px]">{domain}</span>}
          <span>{episode.updated_at ? new Date(episode.updated_at).toLocaleString('tr-TR') : ''}</span>
        </div>
        {isDownloading && (
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-blue-500/60 rounded-full animate-pulse"
              style={{ width: '40%' }}
            />
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-xs text-gray-500 font-bold">
        {episode.duration_seconds ? `${Math.floor(episode.duration_seconds / 60)} dk` : '-'}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={() => onEdit(episode)}
            className="text-[10px] font-black text-gray-400 hover:text-brand-red uppercase tracking-widest transition-colors"
          >
            Düzenle
          </button>
          <button
            onClick={() => onVideoPatch(episode)}
            className="text-[10px] font-black text-gray-400 hover:text-brand-red uppercase tracking-widest transition-colors"
          >
            Video Patch
          </button>
          {hasError && (
            <button
              onClick={() => onRetry(episode)}
              className="text-[10px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-widest transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => onLogs(episode)}
            className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
          >
            Logs
          </button>
          {isPaused && (
            <button
              onClick={() => onPausedResolve(episode)}
              className="text-[10px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-widest transition-colors"
            >
              Slug Ekle
            </button>
          )}
          <button
            onClick={() => onDelete(episode)}
            className="text-[10px] font-black text-red-400/80 hover:text-red-400 uppercase tracking-widest transition-colors"
          >
            Sil
          </button>
        </div>
      </td>
    </tr>
  );
};
