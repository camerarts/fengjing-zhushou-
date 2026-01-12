import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Proxy /api requests to the Wrangler local dev server default port
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    // Replaces process.env.API_KEY with the actual string value during build
    // If not set, defaults to empty string to prevent "process is not defined" error in browser
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});