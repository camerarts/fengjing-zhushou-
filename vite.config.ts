import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Allows process.env to work in client-side code (for API_KEY fallback if needed)
    'process.env': process.env
  }
});