import React, { useState, useEffect } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { showToast } from '@/components/ToastProvider';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';
import type { TopAnnouncementSetting } from '@/components/TopAnnouncementBarHost';

const AdminTopAnnouncement: React.FC = () => {
  const { data, loading, error, reload } = useLoad(() => db.getSiteSetting('top_announcement'));
  const [enabled, setEnabled] = useState(true);
  const [label, setLabel] = useState('DUYURU');
  const [messagesText, setMessagesText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && typeof data === 'object') {
      const s = data as TopAnnouncementSetting;
      setEnabled(s.enabled !== false);
      setLabel(typeof s.label === 'string' && s.label.trim() ? s.label.trim() : 'DUYURU');
      const lines = Array.isArray(s.messages) ? s.messages.map((m) => String(m).trim()).filter(Boolean) : [];
      setMessagesText(lines.length ? lines.join('\n') : '');
    }
  }, [data]);

  const handleSave = async () => {
    const messages = messagesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      const payload: TopAnnouncementSetting = {
        enabled,
        label: label.trim() || 'DUYURU',
        messages: enabled ? messages : [],
      };
      const ok = await db.updateSiteSetting('top_announcement', payload);
      if (ok) {
        showToast('Üst duyuru şeridi kaydedildi', 'success');
        reload();
      } else {
        showToast('Kaydedilemedi', 'error');
      }
    } catch (e) {
      showToast('Beklenmedik hata', 'error');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Üst <span className="text-brand-red">Duyuru Şeridi</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Ana sayfa — navbar ile hero arası ince kaydırmalı şerit
          </p>
        </div>
        <LoadingSkeleton type="card" count={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10">
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Üst <span className="text-brand-red">Duyuru Şeridi</span>
        </h1>
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Üst <span className="text-brand-red">Duyuru Şeridi</span>
        </h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
          Kayıt yokken sitede varsayılan metinler görünür. Kaydettiğinde bu ayarlar kullanılır. Kapatırsan şerit tamamen gizlenir.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 space-y-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-white font-black uppercase tracking-widest text-sm">Şerit görünsün</p>
            <p className="text-gray-500 text-xs mt-1">Kapalıyken ana sayfada üst şerit render edilmez.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((e) => !e)}
            className={`relative w-16 h-9 rounded-full transition-colors shrink-0 ${
              enabled ? 'bg-brand-red' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div>
          <label htmlFor="top-ann-label" className="block text-white font-black uppercase tracking-widest text-xs mb-2">
            Sol etiket
          </label>
          <input
            id="top-ann-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={24}
            disabled={!enabled}
            placeholder="DUYURU"
            className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-brand-red/50 focus:outline-none disabled:opacity-40"
          />
        </div>

        <div>
          <label htmlFor="top-ann-messages" className="block text-white font-black uppercase tracking-widest text-xs mb-2">
            Duyurular (her satır bir chip)
          </label>
          <textarea
            id="top-ann-messages"
            rows={8}
            value={messagesText}
            onChange={(e) => setMessagesText(e.target.value)}
            disabled={!enabled}
            placeholder={'4K Yakında\nYeni özellik...\nTakvim geliyor'}
            className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-brand-red/50 focus:outline-none resize-y min-h-[160px] disabled:opacity-40 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-brand-red text-white text-xs font-black uppercase tracking-widest hover:bg-brand-red/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
};

export default AdminTopAnnouncement;
