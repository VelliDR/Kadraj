import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Kadraj Sanatsal Mizanpaj',
        short_name: 'Kadraj',
        description: 'Kültür Sanat Dergisi Mizanpaj ve Şekilli Kırpma Aracı',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#191c20',
        theme_color: '#191c20',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // @imgly CDN model ağırlıklarını ve WASM motorunu önbelleğe al
            urlPattern: /^https:\/\/(?:staticimgly\.com|static\.img\.ly)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'imgly-models-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 gün
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // WASM ve ONNX ikili dosyalarını çevrimdışı kullanım için sakla
            urlPattern: /\.(?:wasm|onnx)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ai-wasm-onnx-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});