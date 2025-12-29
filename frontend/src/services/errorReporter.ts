import { db } from './db';

// Deduplication: Track recent errors to avoid spam
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW = 60000; // 1 minute

/**
 * Report error to database
 * Automatically deduplicates similar errors within time window
 */
export const reportError = async (
  error: Error | string,
  stack?: string,
  additionalInfo?: Record<string, any>
): Promise<void> => {
  try {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = stack || (typeof error === 'object' && error.stack) || undefined;

    // Create deduplication key
    const dedupKey = `${errorMessage}_${window.location.pathname}`;
    const now = Date.now();
    const lastReported = recentErrors.get(dedupKey);

    // Skip if same error was reported recently
    if (lastReported && now - lastReported < DEDUP_WINDOW) {
      if (import.meta.env.DEV) {
        console.log('[errorReporter] Skipping duplicate error:', errorMessage);
      }
      return;
    }

    // Update deduplication map
    recentErrors.set(dedupKey, now);

    // Clean old entries (older than 5 minutes)
    const fiveMinutesAgo = now - 300000;
    for (const [key, timestamp] of recentErrors.entries()) {
      if (timestamp < fiveMinutesAgo) {
        recentErrors.delete(key);
      }
    }

    // Log to database
    await db.logError({
      message: errorMessage,
      stack: errorStack,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      ...additionalInfo,
    });

    if (import.meta.env.DEV) {
      console.log('[errorReporter] Error logged:', errorMessage);
    }
  } catch (err) {
    // Silent fail - don't break app if error reporting fails
    if (import.meta.env.DEV) {
      console.error('[errorReporter] Failed to report error:', err);
    }
  }
};

/**
 * Setup global error handlers
 */
export const setupErrorHandlers = (): (() => void) => {
  // Global JavaScript error handler
  const handleGlobalError = (event: ErrorEvent) => {
    reportError(event.error || event.message, event.error?.stack);
  };

  // Unhandled promise rejection handler
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    reportError(error, error.stack);
  };

  // Add listeners
  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Return cleanup function
  return () => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

