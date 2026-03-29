import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/services/auth';
import { ANDROID_APP_ACTIVATION_URL, DESKTOP_DOWNLOAD_ENDPOINT } from '@/config/desktop';
import { supabase } from '@/services/supabaseClient';

const DesktopAccess: React.FC = () => {
  const { user, status, activePlan } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (status === 'LOADING') {
    return (
      <div className="min-h-screen bg-background font-inter flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isProMax = activePlan === 'pro_max';

  const handleProtectedDownload = async () => {
    if (!supabase || downloading) return;
    setDownloading(true);
    setDownloadError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setDownloadError('Oturum bulunamadi. Lutfen tekrar giris yap.');
        return;
      }

      const res = await fetch(DESKTOP_DOWNLOAD_ENDPOINT, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.status === 403) {
        setDownloadError('Desktop erisimi yalnizca aktif PRO MAX uyeler icin aciktir.');
        return;
      }

      if (!res.ok) {
        setDownloadError('Indirme baglantisi olusturulamadi. Lutfen tekrar dene.');
        return;
      }

      if (res.redirected && res.url) {
        window.location.href = res.url;
        return;
      }

      const payload = await res.json().catch(() => null) as any;
      const redirectUrl = payload?.redirectUrl || payload?.url || payload?.downloadUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      setDownloadError('Indirme baglantisi hazir degil.');
    } catch (_err) {
      setDownloadError('Indirme sirasinda hata olustu. Lutfen tekrar dene.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-inter px-4 md:px-8 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tight">
            Desktop <span className="text-primary">Access</span>
          </h1>
          <p className="text-gray-400 mt-3 text-sm">
            Mac veya Windows icin masaustu uygulamasini indir ve 6 haneli kod ile hesabini eslestir.
          </p>
        </div>

        <div className="bg-surface-elevated border border-white/10 rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em]">Aktif Plan</p>
            <span
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                isProMax ? 'bg-primary text-white' : 'bg-white/10 text-gray-300'
              }`}
            >
              {isProMax ? 'PRO MAX' : activePlan.toUpperCase()}
            </span>
          </div>

          {isProMax ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={handleProtectedDownload}
                disabled={downloading}
                className="inline-flex items-center justify-center px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.18em] transition-all bg-primary text-white hover:opacity-90 disabled:opacity-60"
              >
                {downloading ? 'Baglanti Hazirlaniyor...' : 'Desktop Uygulamasini Indir'}
              </button>

              {downloadError && <p className="text-amber-400 text-xs">{downloadError}</p>}

              <div className="bg-black/20 border border-white/5 rounded-2xl p-5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Kurulum Adimlari</p>
                <ol className="space-y-2 text-sm text-gray-200 list-decimal list-inside">
                  <li>Uygulamayi indir</li>
                  <li>Desktop uygulamasini ac</li>
                  <li>Ekranda 6 haneli kodu gor</li>
                  <li>Mobil veya site uzerinden eslestir</li>
                </ol>
              </div>

              <Link
                to="/profile"
                className="inline-block text-xs font-black uppercase tracking-[0.15em] text-primary hover:text-white"
              >
                Cihaz yonetimi icin profile git
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-white font-black uppercase tracking-wider mb-2">Desktop erisimi kilitli</p>
                <p className="text-gray-400 text-sm">Bu ozellik yalnizca PRO MAX uyeler icin kullanilabilir.</p>
                <p className="text-gray-500 text-sm mt-2">PRO MAX uyeligini Android uygulamadan etkinlestirebilirsin.</p>
                <p className="text-gray-600 text-xs mt-2">Satin alma islemi su anda yalnizca Android uygulamada destekleniyor.</p>
                <p className="text-gray-600 text-xs mt-2">Android uygulamada PRO MAX uyelik aldiktan sonra bu sayfa otomatik olarak aktif olur.</p>
              </div>
              <a
                href={ANDROID_APP_ACTIVATION_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.18em] hover:opacity-90 transition-all"
              >
                Android uygulamada etkinlestir
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopAccess;

