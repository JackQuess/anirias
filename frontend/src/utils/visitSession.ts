const STORAGE_KEY = 'anirias_visit_session';

/** Tarayıcı oturumu boyunca sabit anonim anahtar (benzersiz ziyaretçi kabaca). */
export function getOrCreateVisitSessionKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    let k = sessionStorage.getItem(STORAGE_KEY);
    if (!k) {
      k =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
      sessionStorage.setItem(STORAGE_KEY, k);
    }
    return k;
  } catch {
    return '';
  }
}
