/**
 * CORS Utility Functions
 * 
 * Normalizes origin values to prevent trailing slash issues
 */

/**
 * Normalize origin by removing trailing slash
 * 
 * Example:
 * - "https://anirias.com/" -> "https://anirias.com"
 * - "https://anirias.com" -> "https://anirias.com"
 * - "*" -> "*"
 */
export function normalizeOrigin(origin: string | undefined): string {
  if (!origin || origin === '*') {
    return origin || '*';
  }
  
  // Remove trailing slash
  return origin.replace(/\/$/, '');
}

/**
 * Get normalized CORS origin from environment
 */
export function getCorsOrigin(): string {
  const origin = process.env.CORS_ORIGIN || '*';
  return normalizeOrigin(origin);
}

/**
 * Set CORS headers with normalized origin
 */
export function setCorsHeaders(res: any, origin?: string): void {
  const normalizedOrigin = origin ? normalizeOrigin(origin) : getCorsOrigin();
  
  res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ADMIN-TOKEN, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

