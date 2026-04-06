/**
 * Uygulamalar sayfası indirme bağlantıları.
 * Üretimde .env ile tanımlayın: VITE_APP_PLAY_STORE_URL, VITE_APP_ANDROID_APK_URL, VITE_APP_TV_APK_URL
 */
const trim = (v: string | undefined) => (typeof v === 'string' ? v.trim() : '');

export const appDownloadLinks = {
  playStore: trim(import.meta.env.VITE_APP_PLAY_STORE_URL),
  androidApk: trim(import.meta.env.VITE_APP_ANDROID_APK_URL),
  tvApk: trim(import.meta.env.VITE_APP_TV_APK_URL),
};

export function hasAppUrl(url: string | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}
