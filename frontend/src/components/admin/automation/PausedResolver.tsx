import React, { useState } from 'react';
import { automationClient } from '@/lib/automationClient';
import { showToast } from '@/components/ToastProvider';

const SOURCE_IDS = ['seicode', 'animecix'] as const;

interface PausedResolverProps {
  onResolved: () => void;
}

export const PausedResolver: React.FC<PausedResolverProps> = ({ onResolved }) => {
  const [jobId, setJobId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [sourceId, setSourceId] = useState<string>('seicode');
  const [sourceSlug, setSourceSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId.trim() || !seasonId.trim() || !sourceSlug.trim()) {
      showToast('jobId, seasonId ve sourceSlug gerekli', 'error');
      return;
    }
    setLoading(true);
    try {
      await automationClient.replyPaused({
        jobId: jobId.trim(),
        season_id: seasonId.trim(),
        source_id: sourceId,
        source_slug: sourceSlug.trim(),
      });
      showToast('Slug kaydedildi, job devam ediyor', 'success');
      onResolved();
      setJobId('');
      setSeasonId('');
      setSourceSlug('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'İşlem başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-brand-dark border border-brand-border rounded-2xl p-6">
      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Paused Resolver</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">jobId</label>
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="Job ID"
            className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white font-mono text-sm placeholder-gray-500 focus:border-brand-red outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">seasonId</label>
          <input
            type="text"
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            placeholder="Season UUID"
            className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white font-mono text-sm placeholder-gray-500 focus:border-brand-red outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">sourceId</label>
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
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">sourceSlug</label>
          <input
            type="text"
            value={sourceSlug}
            onChange={(e) => setSourceSlug(e.target.value)}
            placeholder="one-piece"
            required
            className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:border-brand-red outline-none"
          />
        </div>
        <div className="md:col-span-2 lg:col-span-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-brand-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-redHover disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor…' : 'Submit & Resume'}
          </button>
        </div>
      </form>
    </div>
  );
};
