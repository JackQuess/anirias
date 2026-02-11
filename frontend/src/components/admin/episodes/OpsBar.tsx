import React, { useState } from 'react';
import { automationClient } from '@/lib/automationClient';
import { showToast } from '@/components/ToastProvider';

export type FilterChip = 'READY' | 'DOWNLOADING' | 'ERROR' | 'NOT_ADDED' | 'PAUSED_NEEDS_SLUG' | 'METADATA_MISSING';

interface OpsBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeFilters: FilterChip[];
  onFilterToggle: (f: FilterChip) => void;
  onRefresh: () => void;
  payload?: { animeId?: string; seasonId?: string; seasonNumber?: number };
}

export const OpsBar: React.FC<OpsBarProps> = ({
  search,
  onSearchChange,
  activeFilters,
  onFilterToggle,
  onRefresh,
  payload = {},
}) => {
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, successMsg: string) => {
    setLoading(key);
    try {
      await fn();
      showToast(successMsg, 'success');
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'İşlem başarısız', 'error');
    } finally {
      setLoading(null);
    }
  };

  const chips: FilterChip[] = ['READY', 'DOWNLOADING', 'ERROR', 'NOT_ADDED', 'PAUSED_NEEDS_SLUG', 'METADATA_MISSING'];
  const chipLabels: Record<FilterChip, string> = {
    READY: 'Hazır',
    DOWNLOADING: 'İndiriliyor',
    ERROR: 'Hata',
    NOT_ADDED: 'Eklenmemiş',
    PAUSED_NEEDS_SLUG: 'Slug Gerekli',
    METADATA_MISSING: 'Metadata Eksik',
  };

  return (
    <div className="sticky top-0 z-10 bg-brand-dark/95 backdrop-blur border-b border-brand-border rounded-b-2xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Bölüm no / status / job id / slug ara..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-brand-border rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-brand-red focus:ring-1 focus:ring-brand-red/30 outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => {
              const active = activeFilters.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => onFilterToggle(c)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                    active
                      ? 'bg-brand-red/20 border-brand-red text-brand-red'
                      : 'bg-white/5 border-brand-border text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {chipLabels[c]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() =>
              run(
                'scan',
                () => automationClient.createScanMissing(payload),
                'Scan Missing başlatıldı'
              )
            }
            disabled={!!loading}
            className="px-4 py-2 rounded-xl bg-white/5 border border-brand-border text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-brand-red/40 disabled:opacity-50 transition-all"
          >
            {loading === 'scan' ? '...' : 'Scan Missing'}
          </button>
          <button
            onClick={() =>
              run(
                'import',
                () => automationClient.createImportMissing(payload),
                'Import Missing başlatıldı'
              )
            }
            disabled={!!loading}
            className="px-4 py-2 rounded-xl bg-white/5 border border-brand-border text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-brand-red/40 disabled:opacity-50 transition-all"
          >
            {loading === 'import' ? '...' : 'Import Missing'}
          </button>
          <button
            onClick={() =>
              run(
                'metadata',
                () => automationClient.createMetadataPatch(payload),
                'Metadata Patch başlatıldı'
              )
            }
            disabled={!!loading}
            className="px-4 py-2 rounded-xl bg-white/5 border border-brand-border text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-brand-red/40 disabled:opacity-50 transition-all"
          >
            {loading === 'metadata' ? '...' : 'Metadata Patch'}
          </button>
          <button
            onClick={() =>
              run(
                'watchStart',
                () => automationClient.watchStart(),
                'Watch New başlatıldı'
              )
            }
            disabled={!!loading}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
          >
            {loading === 'watchStart' ? '...' : 'Watch New: Start'}
          </button>
          <button
            onClick={() =>
              run(
                'watchStop',
                () => automationClient.watchStop(),
                'Watch New durduruldu'
              )
            }
            disabled={!!loading}
            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-50 transition-all"
          >
            {loading === 'watchStop' ? '...' : 'Watch New: Stop'}
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-[10px] font-black uppercase tracking-widest hover:bg-brand-red/20 transition-all"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
