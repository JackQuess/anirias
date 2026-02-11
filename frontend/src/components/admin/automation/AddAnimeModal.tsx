import React, { useState } from 'react';
import { automationClient } from '@/lib/automationClient';
import { showToast } from '@/components/ToastProvider';

interface AddAnimeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAnimeModal: React.FC<AddAnimeModalProps> = ({ open, onClose, onSuccess }) => {
  const [query, setQuery] = useState('');
  const [anilistId, setAnilistId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !anilistId.trim()) {
      showToast('Query veya AniList ID gerekli', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload: { query?: string; anilistId?: number } = {};
      if (query.trim()) payload.query = query.trim();
      if (anilistId.trim()) payload.anilistId = parseInt(anilistId, 10);
      await automationClient.addAnime(payload);
      showToast('Add Anime tetiklendi', 'success');
      onSuccess();
      onClose();
      setQuery('');
      setAnilistId('');
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
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-6">Add Anime</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Query</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Anime adı veya arama terimi"
                className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:border-brand-red outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">AniList ID</label>
              <input
                type="number"
                value={anilistId}
                onChange={(e) => setAnilistId(e.target.value)}
                placeholder="12345"
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
