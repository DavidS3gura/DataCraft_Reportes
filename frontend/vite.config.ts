import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png'],
      manifest: {
        name: 'Reportes', short_name: 'Reportes', description: 'Reporta novedades de infraestructura rápidamente',
        theme_color: '#0d746a', background_color: '#f5f8f7', display: 'standalone', start_url: '/',
        icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
      },
    }),
  ],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
