import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Read the repo-root .env too, so the dev proxy follows PALS_API_PORT.
  const env = { ...loadEnv(mode, path.resolve(__dirname, '..'), ''), ...process.env };
  const backend = env.VITE_GLY_BASE_URL || `http://localhost:${env.PALS_API_PORT || env.GLY_PORT || 8787}`;
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    server: {
      port: Number(env.PALS_FRONTEND_PORT || 3000),
      fs: {
        allow: ['..'],
      },
      // The browser talks to the dev server; these go to the PALS server (npm start in the repo root).
      proxy: {
        '/chat': { target: backend, ws: true, changeOrigin: true },
        '/healthz': { target: backend, changeOrigin: true },
        '/paypal': { target: backend, changeOrigin: true },
      },
    },
  };
});
