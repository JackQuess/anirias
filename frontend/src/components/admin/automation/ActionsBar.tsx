import React, { useState } from 'react';
import { automationClient } from '@/lib/automationClient';
import { showToast } from '@/components/ToastProvider';

interface ActionsBarProps {
  onRefresh: () => void;
  onAddAnime: () => void;
  onManualImport: () => void;
}

export const ActionsBar: React.FC<ActionsBarProps> = ({ onRefresh, onAddAnime, onManualImport }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setLoading(key);
    try {
      await fn();
      showToast(msg, 'success');
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'İşlem başarısız', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => run('scan', () => automationClient.createScanMissing({}), 'Scan Missing başlatıldı')}
        disabled={!!loading}
        className="px-4 py-2 rounded-xl bg-white/5 border border-brand-border text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-brand-red/40 disabled:opacity-50 transition-all"
      >
        {loading === 'scan' ? '...' : 'Scan Missing'}
      </button>
      <button
        onClick={() => run('import', () => automationClient.createImportMissing({}), 'Import Missing başlatıldı')}
        disabled={!!loading}
        className="px-4 py-2 rounded-xl bg-white/5 border border-brand-border text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-brand-red/40 disabled:opacity-50 transition-all"
      >
        {loading === 'import' ? '...' : 'Import Missing'}
      </button>
      <button
        onClick={() => run('metadata', () => automationClient.createMetadataPatch({}), 'Metadata Patch başlatıldı')}
        disabled={!!loading}
        className="px-4 py-2 rounded-xl bg-white/5 border border-brand-border text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-brand-red/40 disabled:opacity-50 transition-all"
      >
        {loading === 'metadata' ? '...' : 'Metadata Patch'}
      </button>
      <button
        onClick={() => run('watchStart', () => automationClient.watchStart(), 'Watch New başlatıldı')}
        disabled={!!loading}
        className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
      >
        {loading === 'watchStart' ? '...' : 'Watch New Start'}
      </button>
      <button
        onClick={() => run('watchStop', () => automationClient.watchStop(), 'Watch New durduruldu')}
        disabled={!!loading}
        className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-50 transition-all"
      >
        {loading === 'watchStop' ? '...' : 'Watch New Stop'}
      </button>
      <button
        onClick={onAddAnime}
        className="px-4 py-2 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-[10px] font-black uppercase tracking-widest hover:bg-brand-red/20 transition-all"
      >
        Add Anime
      </button>
      <button
        onClick={onManualImport}
        className="px-4 py-2 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-[10px] font-black uppercase tracking-widest hover:bg-brand-red/20 transition-all"
      >
        Manual Import
      </button>
      <button
        onClick={onRefresh}
        className="px-4 py-2 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-[10px] font-black uppercase tracking-widest hover:bg-brand-red/20 transition-all"
      >
        Refresh
      </button>
    </div>
  );
};
