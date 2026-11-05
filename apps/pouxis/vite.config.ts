import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri expects a fixed port and must not clear its own terminal output.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: 'es2022',
    sourcemap: true,
    rolldownOptions: {
      treeshake: {
        // `@pouxis/core` is a pure engine imported through its namespace barrel. Without this,
        // every engine module the barrel re-exports counts as having side effects and lands in
        // the initial chunk, even when only a lazy view uses it (docs/performance/UI.md).
        moduleSideEffects: [{ test: /[\\/]packages[\\/]core[\\/]src[\\/]/, sideEffects: false }],
      },
    },
  },
});
