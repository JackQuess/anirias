const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

/**
 * Image URL helper - returns URLs directly without proxy
 * REMOVED: images.weserv.nl proxy (returns 400 for AniList URLs)
 * 
 * AniList CDN URLs are used directly:
 * - s4.anilist.co
 * - anilist.co
 * 
 * Other URLs are also returned directly (no proxy)
 */
export const proxyImage = (url?: string | null): string => {
  if (!url) return transparentPixel;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/')) return url;
  
  // Return all URLs directly - no proxy
  // AniList CDN and other image URLs work fine without proxy
  return url;
};
