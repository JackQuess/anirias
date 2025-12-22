export const normalizeHlsUrl = (input: string | null | undefined, base?: string): string | null => {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  let baseToUse = (base || import.meta.env.VITE_BUNNY_HLS_BASE || '').trim();
  if (!baseToUse) {
    const legacy = (import.meta.env.VITE_BUNNY_STREAM_BASE || '').trim();
    if (legacy && /b-cdn\.net/i.test(legacy)) {
      baseToUse = legacy;
    }
  }

  const cleanDoubleM3u8 = (url: string) => url.replace(/\.m3u8\.m3u8$/i, '.m3u8');

  const stripNestedPlayPrefix = (url: string) => {
    const playPrefix = /^https?:\/\/video\.bunnycdn\.com\/play\//i;
    if (playPrefix.test(url)) {
      const withoutPrefix = url.replace(playPrefix, '');
      if (/^https?:\/\//i.test(withoutPrefix)) return withoutPrefix;
    }
    return url;
  };

  const isHttp = /^https?:\/\//i.test(trimmed);
  if (isHttp) {
    const cleaned = cleanDoubleM3u8(stripNestedPlayPrefix(trimmed));
    return cleanDoubleM3u8(cleaned);
  }

  const normalizedBase = baseToUse.replace(/\/+$/, '');
  if (!normalizedBase) return null;
  return `${normalizedBase}/${trimmed}/playlist.m3u8`;
};
