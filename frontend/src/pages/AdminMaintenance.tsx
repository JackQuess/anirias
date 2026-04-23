import React, { useState, useEffect } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { showToast } from '@/components/ToastProvider';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';

export type MaintenanceSetting = {
  enabled: boolean;
  message: string;
  endsAt: string;
};

const DEFAULT_MAINTENANCE: MaintenanceSetting = {
  enabled: false,
  message: '',
  endsAt: '',
};

const toDatetimeLocalValue = (value?: string): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromDatetimeLocalValue = (value: string): string => {
  if (!value.trim()) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
};

const AdminMaintenance: React.FC = () => {
  const { data: settingsData, loading, error, reload } = useLoad(() => db.getSiteSetting('maintenance'));
  const [settings, setSettings] = useState<MaintenanceSetting>(DEFAULT_MAINTENANCE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsData && typeof settingsData === 'object') {
      setSettings({
        enabled: Boolean((settingsData as MaintenanceSetting).enabled),
        message: typeof (settingsData as MaintenanceSetting).message === 'string'
          ? (settingsData as MaintenanceSetting).message
          : '',
        endsAt: typeof (settingsData as { endsAt?: unknown }).endsAt === 'string'
          ? toDatetimeLocalValue((settingsData as { endsAt?: string }).endsAt)
          : '',
      });
    }
  }, [settingsData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedEndsAt = fromDatetimeLocalValue(settings.endsAt);
      const success = await db.updateSiteSetting('maintenance', {
        enabled: settings.enabled,
        message: settings.message.trim(),
        endsAt: parsedEndsAt || null,
      });
      if (success) {
        showToast(
          settings.enabled
            ? 'Bakım modu açıldı — ziyaretçiler bakım sayfasını görür'
            : 'Bakım modu kapatıldı — site normal şekilde açılır',
          'success',
        );
        reload();
      } else {
        showToast('Ayarlar kaydedilirken bir hata oluştu', 'error');
      }
    } catch (err) {
      showToast('Beklenmedik bir hata oluştu', 'error');
      if (import.meta.env.DEV) console.error('[AdminMaintenance] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Bakım <span className="text-brand-red">Modu</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Genel siteyi geçici olarak kapatın
          </p>
        </div>
        <LoadingSkeleton type="card" count={2} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Bakım <span className="text-brand-red">Modu</span>
          </h1>
        </div>
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Bakım <span className="text-brand-red">Modu</span>
        </h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
          Ziyaretçiler ana sayfa ve içerik sayfalarında bakım ekranı görür. Yönetim paneli ve giriş sayfaları çalışmaya devam eder.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 space-y-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-white font-black uppercase tracking-widest text-sm">Bakım modu</p>
            <p className="text-gray-500 text-xs mt-1">
              Açıkken genel site tek bir bakım sayfasına yönlendirilir.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            className={`relative w-16 h-9 rounded-full transition-colors shrink-0 ${
              settings.enabled ? 'bg-brand-red' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform ${
                settings.enabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div>
          <label htmlFor="maintenance-message" className="block text-white font-black uppercase tracking-widest text-xs mb-2">
            Bakım mesajı (isteğe bağlı)
          </label>
          <textarea
            id="maintenance-message"
            rows={4}
            value={settings.message}
            onChange={(e) => setSettings((s) => ({ ...s, message: e.target.value }))}
            placeholder="Örn: Sunucu güncellemesi yapıyoruz, birkaç saat içinde döneceğiz."
            className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-brand-red/50 focus:outline-none resize-y min-h-[100px]"
          />
        </div>

        <div>
          <label htmlFor="maintenance-end-time" className="block text-white font-black uppercase tracking-widest text-xs mb-2">
            Açılış zamanı (isteğe bağlı)
          </label>
          <input
            id="maintenance-end-time"
            type="datetime-local"
            value={settings.endsAt}
            onChange={(e) => setSettings((s) => ({ ...s, endsAt: e.target.value }))}
            className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-brand-red/50 focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
            Tarih/saat girersen bakım ekranında canlı geri sayım görünür
            (<span className="text-gray-400">3 gün 4 saat 2 dk 8 sn kaldı</span> gibi).
          </p>
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

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-amber-200/90 text-xs leading-relaxed">
        <p className="font-black uppercase tracking-widest text-amber-400 mb-2">Not</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>Admin paneli (<code className="text-gray-500">/admin</code>) ve giriş / kayıt sayfaları bakımdan etkilenmez.</li>
          <li>Bakımı kapatmak için bu sayfadan giriş yapıp anahtarı kapatmanız yeterlidir.</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminMaintenance;
