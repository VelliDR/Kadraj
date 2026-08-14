// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // <-- GITHUB PAGES İÇİN EN KRİTİK SATIR (Yol kopukluklarını çözer)
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto', // HTML içine Service Worker kodunu otomatik gömer
      manifest: {
        name: 'Kadraj Sanatsal Mizanpaj',
        short_name: 'Kadraj',
        description: 'Kültür Sanat Dergisi Mizanpaj ve Şekilli Kırpma Aracı',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});