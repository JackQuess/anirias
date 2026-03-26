export const DESKTOP_ACCESS_PAGE = '/desktop-access';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const DESKTOP_DOWNLOAD_ENDPOINT = API_BASE
  ? `${API_BASE}/api/desktop/download`
  : '/api/desktop/download';

export const ANDROID_APP_ACTIVATION_URL =
  import.meta.env.VITE_ANDROID_APP_URL ||
  'https://play.google.com/store';

