
const CACHE_NAME = 'kadraj v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/main.js',
  './src/style.css',
  './sw.js',
  './manifest.json',
  // Görselde belirtilen ikonlar
  './icon-192.png',
  './icon-512.png',
  // MediaPipe kütüphaneleri (Opsiyonel ama hızlı yükleme için önerilir)
  'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation_solution_simd_wasm_bin.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation_solution_simd_wasm_bin.wasm'
];

// 1. Install Olayı (Önbellekleme)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Önbellekleme başladı.');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Fetch Olayı (Ağ İsteğini Önce Önbellekten Sunma - Cache-First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Önbellekte varsa döndür, yoksa ağdan çek
      return cachedResponse || fetch(event.request);
    })
  );
});