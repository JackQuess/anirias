const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

/**
 * Proxy image through weserv.nl
 * CRITICAL: weserv does NOT accept https:// protocol or encoded URLs
 * Format: https://images.weserv.nl/?url=hostname/path
 */
export const proxyImage = (url?: string | null): string => {
  if (!url) return transparentPixel;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.includes('images.weserv.nl/?url=')) return url;
  if (url.startsWith('/')) return url;
  
  try {
    // Parse URL to extract host and pathname (NO protocol, NO encoding)
    const urlObj = new URL(url);
    // weserv format: host + pathname (no https://, no encoding)
    const cleanUrl = `${urlObj.host}${urlObj.pathname}${urlObj.search || ''}`;
    return `https://images.weserv.nl/?url=${cleanUrl}`;
  } catch {
    // Fallback: strip protocol only, no encoding
    const stripped = url.replace(/^https?:\/\//, '').replace(/^\/\//, '');
    return `https://images.weserv.nl/?url=${stripped}`;
  }
};
