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
        name: '健身日志',
        short_name: '健身日志',
        description: '私人健身训练日志与数据管理工具',
        theme_color: '#090b0a',
        background_color: '#090b0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2,txt}'],
        navigateFallback: '/index.html',
        runtimeCaching: [{
          urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/exercise-media/'),
          handler: 'CacheFirst',
          options: { cacheName: 'fitness-exercise-media-v1', expiration: { maxEntries: 96, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true }, cacheableResponse: { statuses: [200] } },
        }],
      },
    }),
  ],
});
