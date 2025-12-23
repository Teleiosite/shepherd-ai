import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel injects environment variables into process.env
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  // Vite automatically exposes VITE_* env vars from process.env
  // No need to manually define them
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
