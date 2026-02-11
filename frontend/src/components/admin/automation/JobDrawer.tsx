import React, { useState, useEffect } from 'react';
import { automationClient, type AutomationJob } from '@/lib/automationClient';
import { showToast } from '@/components/ToastProvider';

interface JobDrawerProps {
  open: boolean;
  onClose: () => void;
  job: AutomationJob | null;
  onRefresh: () => void;
}

export const JobDrawer: React.FC<JobDrawerProps> = ({ open, onClose, job, onRefresh }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !job?.id) return;
    setLoadingLogs(true);
    automationClient
      .getJobLogs(job.id, 200)
      .then((data) => {
        const arr = Array.isArray(data?.logs) ? data.logs : Array.isArray(data?.lines) ? data.lines : [];
        setLogs(arr);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoadingLogs(false));
  }, [open, job?.id]);

  const runAction = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    if (!job?.id) return;
    setActionLoading(key);
    try {
      await fn();
      showToast(msg, 'success');
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Başarısız', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (!open) return null;

  const payload = job ? { ...job } : null;
  delete (payload as any)?.id;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-brand-dark border-l border-brand-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-brand-border">
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Job Detay</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
            ✕
          </button>
        </div>

        {job && (
          <>
            <div className="p-6 border-b border-brand-border space-y-4">
              <div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ID</span>
                <p className="text-sm font-mono text-white">{job.id}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payload</span>
                <pre className="mt-1 p-4 bg-black/40 rounded-xl text-xs text-gray-300 overflow-auto max-h-40">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => runAction('run', () => automationClient.runJob(job.id), 'Run tetiklendi')}
                  disabled={!!actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-brand-red/20 text-brand-red text-[10px] font-black uppercase disabled:opacity-50"
                >
                  {actionLoading === 'run' ? '...' : 'Run'}
                </button>
                <button
                  onClick={() => runAction('resume', () => automationClient.resumeJob(job.id), 'Resume tetiklendi')}
                  disabled={!!actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase disabled:opacity-50"
                >
                  {actionLoading === 'resume' ? '...' : 'Resume'}
                </button>
                <button
                  onClick={() => runAction('cancel', () => automationClient.cancelJob(job.id), 'Cancel tetiklendi')}
                  disabled={!!actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black uppercase disabled:opacity-50"
                >
                  {actionLoading === 'cancel' ? '...' : 'Cancel'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-6">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Logs</h3>
              <div className="flex-1 overflow-y-auto bg-black/40 border border-brand-border rounded-xl p-4 font-mono text-xs text-gray-300">
                {loadingLogs ? (
                  <p className="text-gray-500">Yükleniyor...</p>
                ) : logs.length === 0 ? (
                  <p className="text-gray-500">Log yok</p>
                ) : (
                  logs.map((line, i) => (
                    <div key={i} className="py-0.5 border-b border-white/5 last:border-0">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
