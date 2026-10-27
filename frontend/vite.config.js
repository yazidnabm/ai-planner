import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
    // Izinkan akses via tunnel Cloudflare (trycloudflare.com)
    allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
  },
});
