import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Standard output directory for Cloudflare Pages
  },
  define: {
    // Correctly expose API_KEY if set in Cloudflare dashboard
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // Prevent crash on other process.env usage in client-side code
    'process.env': {} 
  }
});