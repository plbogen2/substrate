import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es'
  },
  test: {
    exclude: ['e2e/**', 'node_modules/**']
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'koota'],
          three: ['three']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
