import React, { useState } from 'react';
import { automationClient } from '@/lib/automationClient';
import { showToast } from '@/components/ToastProvider';

const SOURCE_IDS = ['seicode', 'animecix'] as const;

interface ManualImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualImportModal: React.FC<ManualImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [animeSlug, setAnimeSlug] = useState('');
  const [seasonNumber, setSeasonNumber] = useState('1');
  const [sourceId, setSourceId] = useState<string>('seicode');
  const [sourceSlug, setSourceSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animeSlug.trim() || !sourceSlug.trim()) {
      showToast('animeSlug ve sourceSlug gerekli', 'error');
      return;
    }
    const sn = parseInt(seasonNumber, 10);
    if (isNaN(sn) || sn < 1) {
      showToast('Geçerli sezon numarası girin', 'error');
      return;
    }
    setLoading(true);
    try {
      await automationClient.manualImport({
        animeSlug: animeSlug.trim(),
        seasonNumber: sn,
        sourceId,
        sourceSlug: sourceSlug.trim(),
      });
      showToast('Manual Import tetiklendi', 'success');
      onSuccess();
      onClose();
      setAnimeSlug('');
      setSeasonNumber('1');
      setSourceSlug('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Başarısız', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div
          className="w-full max-w-md bg-brand-dark border border-brand-border rounded-2xl p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-6">Manual Import</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">animeSlug</label>
              <input
                type="text"
                value={animeSlug}
                onChange={(e) => setAnimeSlug(e.target.value)}
                placeholder="one-piece"
                required
                className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:border-brand-red outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">seasonNumber</label>
              <input
                type="number"
                min="1"
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(e.target.value)}
                className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white focus:border-brand-red outline-none"
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
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 bg-white/5 text-gray-400 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest">
                İptal
              </button>
              <button type="submit" disabled={loading} className="flex-1 bg-brand-red text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest disabled:opacity-50">
                {loading ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
