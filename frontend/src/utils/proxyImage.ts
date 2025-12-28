const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export const proxyImage = (url?: string | null): string => {
  if (!url) return transparentPixel;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.includes('images.weserv.nl/?url=')) return url;
  if (url.startsWith('/')) return url;
  
  try {
    // Parse URL to extract host and pathname (no encoding needed)
    const urlObj = new URL(url);
    // Use host + pathname without encoding (weserv handles it)
    const cleanUrl = `${urlObj.host}${urlObj.pathname}${urlObj.search}`;
    return `https://images.weserv.nl/?url=${cleanUrl}`;
  } catch {
    // Fallback for invalid URLs - strip protocol only
    const stripped = url.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${stripped}`;
  }
};
