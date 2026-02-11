import React, { useEffect } from 'react';
import { Episode } from '@/types';
import { StatusBadge } from './StatusBadge';
import { useLiveLogs } from './hooks/useLiveLogs';

interface EpisodeDrawerProps {
  open: boolean;
  onClose: () => void;
  episode: Episode | null;
  seasonNumber?: number;
  jobId: string | null;
}

export const EpisodeDrawer: React.FC<EpisodeDrawerProps> = ({
  open,
  onClose,
  episode,
  seasonNumber = 1,
  jobId,
}) => {
  const { lines, loading, reload } = useLiveLogs(jobId, { pollInterval: 2000 });

  useEffect(() => {
    if (open && jobId) reload();
  }, [open, jobId, reload]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-brand-dark border-l border-brand-border shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col animate-fade-in"
        role="dialog"
        aria-label="Bölüm detay"
      >
        <div className="flex items-center justify-between p-6 border-b border-brand-border">
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
              {episode ? 'Bölüm Detay' : 'Job Logs'}
            </h2>
            {episode && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  S{seasonNumber} E{episode.episode_number}
                </span>
                <StatusBadge status={episode.status} />
                {jobId && (
                  <span className="text-[10px] font-mono text-gray-400">Job: {jobId}</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {episode && (
          <div className="p-6 border-b border-brand-border space-y-2 text-sm text-gray-300">
            <div><span className="text-gray-500">Başlık:</span> {episode.title || '-'}</div>
            <div><span className="text-gray-500">Video URL:</span> {episode.video_url ? (
              <a href={episode.video_url} target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline truncate block max-w-full">
                {episode.video_url}
              </a>
            ) : '-'}</div>
            {episode.error_message && (
              <div className="text-red-400">
                <span className="text-gray-500">Hata:</span> {episode.error_message}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
              Live Logs
            </h3>
            {jobId ? (
              <button
                onClick={reload}
                disabled={loading}
                className="text-[10px] font-black text-brand-red uppercase tracking-widest hover:opacity-80 disabled:opacity-50"
              >
                {loading ? 'Yükleniyor...' : 'Yenile'}
              </button>
            ) : (
              <span className="text-[10px] text-gray-500">Job yok — log eşleştirme yapılamadı</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto bg-black/40 border border-brand-border rounded-xl p-4 font-mono text-xs text-gray-300">
            {!jobId ? (
              <p className="text-gray-500">Bu bölümle eşleşen job bulunamadı. Logs için job ID gerekli.</p>
            ) : lines.length === 0 && !loading ? (
              <p className="text-gray-500">Henüz log yok.</p>
            ) : (
              lines.map((line, i) => (
                <div key={i} className="py-0.5 border-b border-white/5 last:border-0">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};
