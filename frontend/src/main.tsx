import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { setupErrorHandlers } from './services/errorReporter';

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