import React, { useState, useCallback } from 'react';
import { showToast } from '@/components/ToastProvider';
import type {
  AutomationAction,
  AutomationProvider,
  AutomationRunPayload,
} from '@/utils/automationTypes';
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_PROVIDERS,
  LIMIT_MIN,
  LIMIT_MAX,
  LIMIT_DEFAULT,
} from '@/utils/automationTypes';

const ACTION_LABELS: Record<AutomationAction, string> = {
  DISCOVER_NEW_ANIME: 'Discover New Anime',
  SCAN_NEW_EPISODES: 'Scan New Episodes',
  SCAN_MISSING_EPISODES: 'Scan Missing Episodes',
  SCAN_MISSING_METADATA: 'Scan Missing Metadata',
};

const ACTION_DESCRIPTIONS: Record<AutomationAction, string> = {
  DISCOVER_NEW_ANIME: 'Yeni anime keşfet ve kataloğa ekle.',
  SCAN_NEW_EPISODES: 'Mevcut animelerde yeni bölümleri tara.',
  SCAN_MISSING_EPISODES: 'Eksik bölümleri tespit et ve kuyruğa al.',
  SCAN_MISSING_METADATA: 'Eksik metadata (AniList/MAL) alanlarını doldur.',
};

function getApiBase(): string | undefined {
  return (import.meta as any).env?.VITE_API_BASE_URL;
}

export default function AdminAutomation() {
  const [selectedAction, setSelectedAction] = useState<AutomationAction | null>(null);
  const [providers, setProviders] = useState<AutomationProvider[]>([]);
  const [limit, setLimit] = useState(LIMIT_DEFAULT);
  const [onlyExisting, setOnlyExisting] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleProvider = useCallback((p: AutomationProvider) => {
    setProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }, []);

  const buildPayload = useCallback((): AutomationRunPayload => {
    const action = selectedAction!;
    const payload: AutomationRunPayload = { action };
    if (providers.length > 0) payload.providers = [...providers];
    if (limit >= LIMIT_MIN && limit <= LIMIT_MAX) payload.limit = limit;
    if (action === 'SCAN_MISSING_METADATA') payload.only_existing = onlyExisting;
    return payload;
  }, [selectedAction, providers, limit, onlyExisting]);

  const runWorkflow = async () => {
    if (!selectedAction) {
      showToast('Lütfen bir işlem seçin.', 'error');
      return;
    }
    const apiBase = getApiBase();
    if (!apiBase) {
      showToast('VITE_API_BASE_URL tanımlı değil.', 'error');
      return;
    }
    const limitNum = Number(limit);
    if (Number.isNaN(limitNum) || limitNum < LIMIT_MIN || limitNum > LIMIT_MAX) {
      showToast(`Limit ${LIMIT_MIN}-${LIMIT_MAX} arasında olmalı.`, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/automation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data && typeof data.error === 'string') ? data.error : `HTTP ${res.status}`;
        showToast(msg, 'error');
        return;
      }
      showToast('Workflow was started', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'İstek başarısız.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="pb-4 border-b border-white/5">
        <h1 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter">
          Otomasyon
        </h1>
        <p className="text-[10px] lg:text-xs text-gray-500 uppercase tracking-widest mt-1">
          n8n iş akışlarını tek tıkla çalıştır
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AUTOMATION_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setSelectedAction(action)}
            disabled={loading}
            className={`text-left p-5 rounded-2xl border transition-all ${
              selectedAction === action
                ? 'bg-brand-red/10 border-brand-red text-white'
                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
            } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className="text-xs font-black uppercase tracking-widest text-brand-red">
              {action.replace(/_/g, ' ')}
            </span>
            <h3 className="mt-2 text-sm font-bold text-white">
              {ACTION_LABELS[action]}
            </h3>
            <p className="mt-1 text-[10px] text-gray-500">
              {ACTION_DESCRIPTIONS[action]}
            </p>
          </button>
        ))}
      </div>

      {selectedAction && (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 max-w-xl">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">
            Parametreler — {ACTION_LABELS[selectedAction]}
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Providers (opsiyonel)
              </p>
              <div className="flex gap-4">
                {AUTOMATION_PROVIDERS.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 cursor-pointer text-sm text-white"
                  >
                    <input
                      type="checkbox"
                      checked={providers.includes(p)}
                      onChange={() => toggleProvider(p)}
                      className="rounded border-white/30 bg-white/5 text-brand-red focus:ring-brand-red"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                Limit (1–{LIMIT_MAX})
              </label>
              <input
                type="number"
                min={LIMIT_MIN}
                max={LIMIT_MAX}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || LIMIT_DEFAULT)}
                className="w-24 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:border-brand-red outline-none"
              />
            </div>

            {selectedAction === 'SCAN_MISSING_METADATA' && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                  <input
                    type="checkbox"
                    checked={onlyExisting}
                    onChange={(e) => setOnlyExisting(e.target.checked)}
                    className="rounded border-white/30 bg-white/5 text-brand-red focus:ring-brand-red"
                  />
                  <span className="text-[10px] uppercase tracking-wider">
                    Only existing (sadece mevcut kayıtlar)
                  </span>
                </label>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={runWorkflow}
            disabled={loading}
            className="mt-6 px-6 py-3 rounded-xl bg-brand-red text-white text-xs font-black uppercase tracking-widest hover:bg-brand-red/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Çalışıyor…' : 'Run'}
          </button>
        </div>
      )}
    </div>
  );
}
