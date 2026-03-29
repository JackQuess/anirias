import React, { useState } from 'react';
import { X } from 'lucide-react';
import { db } from '@/services/db';
import { showToast } from '@/components/ToastProvider';
import { cn } from '@/lib/utils';

const REASONS = [
  { value: 'Video oynatma veya kalite sorunu', label: 'Video / kalite sorunu' },
  { value: 'Altyazı hatası veya eksik altyazı', label: 'Altyazı' },
  { value: 'Uygunsuz içerik', label: 'Uygunsuz içerik' },
  { value: 'Yanlış bölüm veya başlık bilgisi', label: 'Yanlış bilgi' },
  { value: 'Diğer', label: 'Diğer' },
] as const;

export type ReportWatchContext = {
  userId: string | null;
  animeId: string;
  animeTitle: string;
  animeSlug?: string | null;
  seasonNumber: number;
  episodeNumber: number;
  episodeId?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  context: ReportWatchContext | null;
};

const ReportWatchModal: React.FC<Props> = ({ open, onClose, context }) => {
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open || !context) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.submitWatchContentReport({
        userId: context.userId,
        animeId: context.animeId,
        animeTitle: context.animeTitle,
        animeSlug: context.animeSlug,
        seasonNumber: context.seasonNumber,
        episodeNumber: context.episodeNumber,
        episodeId: context.episodeId,
        reason,
        details: details.trim() || undefined,
      });
      showToast('Bildirimin alındı. Teşekkürler.', 'success');
      setDetails('');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Gönderilemedi. Daha sonra dene.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-watch-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-md rounded-xl border border-white/10 bg-[#12121a] shadow-2xl p-6',
          'max-h-[90vh] overflow-y-auto'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="report-watch-title" className="text-lg font-bold text-white">
            İçerik bildir
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-white/50 mb-4">
          S{context.seasonNumber} B{context.episodeNumber} · {context.animeTitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">
              Neden
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#12121a]">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">
              Ek açıklama (isteğe bağlı)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Kısa açıklama yazabilirsin…"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 hover:bg-white/10 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportWatchModal;
