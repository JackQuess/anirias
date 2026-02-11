import React from 'react';
import type { AutomationJob } from '@/lib/automationClient';

function statusColor(s: string | undefined): string {
  if (!s) return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  const l = s.toLowerCase();
  if (['done', 'completed', 'success'].includes(l)) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (['running', 'processing', 'pending'].includes(l)) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (['error', 'failed'].includes(l)) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (['paused'].includes(l)) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

interface JobsTableProps {
  jobs: AutomationJob[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (job: AutomationJob) => void;
}

export const JobsTable: React.FC<JobsTableProps> = ({ jobs, loading, selectedId, onSelect }) => {
  const list = Array.isArray(jobs) ? jobs.slice(0, 100) : [];

  return (
    <div className="bg-brand-dark border border-brand-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-brand-border">
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Jobs (son 100)</h3>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Yükleniyor...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Job yok</div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-brand-dark border-b border-brand-border">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">ID</th>
                <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Tip</th>
                <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Durum</th>
                <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Güncelleme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {list.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => onSelect(job)}
                  className={`cursor-pointer transition-colors hover:bg-white/[0.03] ${
                    selectedId === job.id ? 'bg-brand-red/10 border-l-2 border-brand-red' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{String(job.id).slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{job.type || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase border ${statusColor(job.status)}`}>
                      {job.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(job.updated_at as string)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
