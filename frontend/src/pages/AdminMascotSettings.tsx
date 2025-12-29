import React, { useState, useEffect } from 'react';
import { useLoad } from '@/services/useLoad';
import { db } from '@/services/db';
import { showToast } from '@/components/ToastProvider';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { MascotSettings } from '@/hooks/useMascotSettings';

const AdminMascotSettings: React.FC = () => {
  const { data: settingsData, loading, error, reload } = useLoad(() => db.getSiteSetting('mascots'));
  const [settings, setSettings] = useState<MascotSettings>({
    enabled: true,
    rias: true,
    lightning: true,
    light: true,
    angel: true,
  });
  const [saving, setSaving] = useState(false);

  // Initialize settings from fetched data
  useEffect(() => {
    if (settingsData && typeof settingsData === 'object') {
      setSettings({
        enabled: Boolean(settingsData.enabled ?? true),
        rias: Boolean(settingsData.rias ?? true),
        lightning: Boolean(settingsData.lightning ?? true),
        light: Boolean(settingsData.light ?? true),
        angel: Boolean(settingsData.angel ?? true),
      });
    }
  }, [settingsData]);

  const handleToggle = (key: keyof MascotSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await db.updateSiteSetting('mascots', settings);
      if (success) {
        showToast('Mascot ayarları başarıyla güncellendi', 'success');
        // Reload to refresh cache
        reload();
        // Force page reload to apply changes immediately
        window.location.reload();
      } else {
        showToast('Ayarlar kaydedilirken bir hata oluştu', 'error');
      }
    } catch (err) {
      showToast('Beklenmedik bir hata oluştu', 'error');
      if (import.meta.env.DEV) console.error('[AdminMascotSettings] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Mascot <span className="text-brand-red">Ayarları</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Dekoratif karakter görsellerini yönetin
          </p>
        </div>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Mascot <span className="text-brand-red">Ayarları</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
            Dekoratif karakter görsellerini yönetin
          </p>
        </div>
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Mascot <span className="text-brand-red">Ayarları</span>
        </h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
          Dekoratif karakter görsellerini yönetin
        </p>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 md:p-12 shadow-xl">
        {/* Global Toggle */}
        <div className="mb-12 pb-12 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
                Tüm <span className="text-brand-red">Mascot'lar</span>
              </h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                Tüm dekoratif karakterleri tek seferde açıp kapatın
              </p>
            </div>
            <button
              onClick={() => handleToggle('enabled')}
              disabled={saving}
              className={`
                relative w-16 h-8 rounded-full transition-all duration-300
                ${settings.enabled ? 'bg-brand-red' : 'bg-white/10'}
                ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div
                className={`
                  absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300
                  ${settings.enabled ? 'translate-x-8' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Individual Mascots */}
        <div className="space-y-8">
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-6">
            Bireysel <span className="text-brand-red">Mascot'lar</span>
          </h3>

          {[
            { key: 'rias' as const, label: 'Rias', description: 'Brand Mascot (Footer)' },
            { key: 'lightning' as const, label: 'Lightning Girl', description: 'Watch Page' },
            { key: 'light' as const, label: 'Light Girl', description: 'Home Page' },
            { key: 'angel' as const, label: 'Angel Boy', description: 'Auth Pages' },
          ].map((mascot) => (
            <div
              key={mascot.key}
              className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
            >
              <div>
                <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-1">
                  {mascot.label}
                </h4>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                  {mascot.description}
                </p>
              </div>
              <button
                onClick={() => handleToggle(mascot.key)}
                disabled={saving || !settings.enabled}
                className={`
                  relative w-16 h-8 rounded-full transition-all duration-300
                  ${settings[mascot.key] && settings.enabled ? 'bg-brand-red' : 'bg-white/10'}
                  ${saving || !settings.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div
                  className={`
                    absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300
                    ${settings[mascot.key] && settings.enabled ? 'translate-x-8' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs
              transition-all active:scale-95
              ${saving
                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                : 'bg-brand-red hover:bg-brand-redHover text-white shadow-lg shadow-brand-red/20'
              }
            `}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                KAYDEDİLİYOR...
              </span>
            ) : (
              'AYARLARI KAYDET'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminMascotSettings;

