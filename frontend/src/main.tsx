import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element 'root' bulunamadı.");

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 🔴 ENV DEBUG – BUNU EKLE
console.log('ENV TEST → VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('ENV TEST → ALL ENV:', import.meta.env);
console.log(
  "BUNNY BASE:",
  import.meta.env.VITE_BUNNY_HLS_BASE
);