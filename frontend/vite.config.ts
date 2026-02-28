import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('@supabase')) return 'vendor-supabase';
            return 'vendor';
          }
          if (id.includes('/pages/Admin') || id.includes('/components/Admin')) return 'admin';
          if (id.includes('/pages/Watch') || id.includes('/pages/WatchSlug')) return 'watch';
        },
      },
    },
  },
});
