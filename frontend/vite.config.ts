import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@policy': resolve(__dirname, '../backend/src/policy'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-face': [
            '@mediapipe/tasks-vision',
            '@mediapipe/face_mesh',
            '@mediapipe/camera_utils',
            '@mediapipe/drawing_utils',
            '@vladmandic/face-api',
          ],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    // Windows host + Docker bind mount: native fs events don't cross the
    // boundary, so Vite never sees edits. Polling makes HMR work in-container.
    watch: {
      usePolling: true,
      interval: 150,
    },
    fs: {
      allow: [resolve(__dirname, '..')],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
