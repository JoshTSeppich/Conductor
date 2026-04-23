import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// See packages/dispatch-web/TICKETS.md §6 for the CORS rationale: dev
// proxy + same-origin production serve means no CORS allowlist is
// needed on the daemon side.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/v2': {
        target: 'http://localhost:7878',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
