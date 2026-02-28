import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { setupErrorHandlers } from './services/errorReporter';
import { hasSupabaseEnv } from './services/supabaseClient';

// Boot log: yapılandırma özeti (konsoldan takip için)
const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
if (typeof window !== 'undefined') {
  console.log('[Anirias] Boot env', {
    hasSupabaseEnv,
    hasViteApiBaseUrl: !!(apiBase && String(apiBase).trim()),
    apiBasePrefix: apiBase ? String(apiBase).slice(0, 50) + '...' : undefined,
  });
}

// Setup global error handlers
const cleanup = setupErrorHandlers();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element 'root' bulunamadı.");

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Cleanup on unmount (though this rarely happens in SPAs)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanup();
  });
}