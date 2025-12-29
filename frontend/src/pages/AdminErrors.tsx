import React, { useState } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { showToast } from '@/components/ToastProvider';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { ErrorLog } from '../types';

const AdminErrors: React.FC = () => {
  const { data: errorLogs, loading, error, reload } = useLoad(() => db.getErrorLogs(200));
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = async (errorId: string) => {
    setResolvingId(errorId);
    try {
      const success = await db.markErrorResolved(errorId);
      if (success) {
        showToast('Hata çözüldü olarak işaretlendi', 'success');
        reload();
      } else {
        showToast('Hata işaretlenirken bir sorun oluştu', 'error');
      }
    } catch (err) {
      showToast('Beklenmedik bir hata oluştu', 'error');
      if (import.meta.env.DEV) console.error('[AdminErrors] Resolve error:', err);
    } finally {
      setResolvingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Hata <span className="text-brand-red">Logları</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Sistem hatalarını görüntüleyin ve yönetin
          </p>
        </div>
        <LoadingSkeleton type="card" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Hata <span className="text-brand-red">Logları</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Sistem hatalarını görüntüleyin ve yönetin
          </p>
        </div>
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }

  const unresolvedCount = errorLogs?.filter((log: ErrorLog) => !log.is_resolved).length || 0;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Hata <span className="text-brand-red">Logları</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Sistem hatalarını görüntüleyin ve yönetin
          </p>
        </div>
        {unresolvedCount > 0 && (
          <div className="px-6 py-3 bg-brand-red/20 border border-brand-red/30 rounded-2xl">
            <span className="text-brand-red text-sm font-black uppercase tracking-widest">
              {unresolvedCount} ÇÖZÜLMEMİŞ
            </span>
          </div>
        )}
      </div>

      {!errorLogs || errorLogs.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-12 text-center">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
            Henüz hata logu yok
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {errorLogs.map((log: ErrorLog) => (
            <div
              key={log.id}
              className={`bg-brand-surface border rounded-[2rem] p-6 ${
                log.is_resolved
                  ? 'border-white/5 opacity-60'
                  : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-tighter truncate">
                      {truncateMessage(log.message)}
                    </h3>
                    {log.is_resolved && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex-shrink-0">
                        ÇÖZÜLDÜ
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">
                    {formatDate(log.created_at)}
                  </p>
                  <a
                    href={log.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-red text-xs font-bold uppercase tracking-widest hover:underline block truncate"
                  >
                    {log.page_url}
                  </a>
                  {log.profiles && (
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-2">
                      Kullanıcı: {log.profiles.username || 'Bilinmeyen'}
                    </p>
                  )}
                </div>
                {!log.is_resolved && (
                  <button
                    onClick={() => handleResolve(log.id)}
                    disabled={resolvingId === log.id}
                    className="px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    {resolvingId === log.id ? '...' : 'ÇÖZÜLDÜ İŞARETLE'}
                  </button>
                )}
              </div>
              
              {log.stack && (
                <details className="mt-4">
                  <summary className="text-gray-500 text-xs font-bold uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 p-4 bg-black/30 rounded-xl text-[10px] text-gray-400 overflow-x-auto font-mono">
                    {log.stack}
                  </pre>
                </details>
              )}
              
              {log.user_agent && (
                <details className="mt-2">
                  <summary className="text-gray-500 text-xs font-bold uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                    User Agent
                  </summary>
                  <p className="mt-2 p-4 bg-black/30 rounded-xl text-[10px] text-gray-400 font-mono break-all">
                    {log.user_agent}
                  </p>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminErrors;

