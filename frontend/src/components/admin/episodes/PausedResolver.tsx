import React, { useState } from 'react';
import { Episode } from '@/types';
import { automationClient } from '@/lib/automationClient';
import { showToast } from '@/components/ToastProvider';

interface PausedResolverProps {
  episode: Episode | null;
  seasonId: string;
  jobId: string | null;
  onResolved: () => void;
  onClose: () => void;
}

const SOURCE_IDS = ['seicode', 'animecix'] as const;

export const PausedResolver: React.FC<PausedResolverProps> = ({
  episode,
  seasonId,
  jobId,
  onResolved,
  onClose,
}) => {
  const [sourceId, setSourceId] = useState<string>('seicode');
  const [sourceSlug, setSourceSlug] = useState('');
  const [manualJobId, setManualJobId] = useState(jobId || '');
  const [loading, setLoading] = useState(false);

  const effectiveJobId = jobId || manualJobId.trim() || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveJobId || !sourceSlug.trim()) {
      showToast('Job ID ve source slug gerekli', 'error');
      return;
    }
    setLoading(true);
    try {
      await automationClient.replyPaused({
        jobId: effectiveJobId,
        season_id: seasonId,
        source_id: sourceId,
        source_slug: sourceSlug.trim(),
      });
      showToast('Slug kaydedildi, job devam ediyor', 'success');
      onResolved();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'İşlem başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!episode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg bg-brand-dark border border-brand-border rounded-2xl p-8 shadow-[0_0_60px_rgba(229,9,20,0.15)]">
        <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">
          Slug Çözümü
        </h2>
        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-6">
          Bölüm {episode.episode_number} — PAUSED_NEEDS_SLUG
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
              Job ID
            </label>
            <input
              type="text"
              value={jobId ? jobId : manualJobId}
              onChange={jobId ? undefined : (e) => setManualJobId(e.target.value)}
              readOnly={!!jobId}
              placeholder={jobId ? '' : 'Job ID yoksa buraya yazın'}
              className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white font-mono text-sm placeholder-gray-500 focus:border-brand-red outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
              Kaynak (source_id)
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white focus:border-brand-red outline-none"
            >
              {SOURCE_IDS.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
              Source Slug <span className="text-brand-red">*</span>
            </label>
            <input
              type="text"
              value={sourceSlug}
              onChange={(e) => setSourceSlug(e.target.value)}
              placeholder="Örn: one-piece"
              required
              className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:border-brand-red outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 text-gray-400 font-black py-3 rounded-xl uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-red text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px] hover:bg-brand-redHover disabled:opacity-50 transition-colors"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet & Devam Et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
