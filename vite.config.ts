import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
    port: 3340,
    proxy: {
      '/api': {
        target: 'http://localhost:3342',
        changeOrigin: true,
      },
    },
  },
});
