// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/stories': { target: 'http://localhost:8000', changeOrigin: true },
      '/progress': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
