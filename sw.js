const CACHE_NAME = 'kadraj-v1'; // Safari önbellek isimlerinde boşluk sevmez
const LOCAL_ASSETS = [
  './',
  './index.html',
  './src/main.js',
  './src/style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
  // MediaPipe kütüphanelerini buradan sildik. 
  // Safari dış bağlantıları (CORS) reddederse PWA hiç kurulmaz.
  // Bunlar internet varken ilk açılışta tarayıcının kendi cache'ine alınacak.
];

// 1. Install Olayı
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Service Worker'ı hemen aktifleştirmeye zorla
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Yerel dosyalar önbelleğe alınıyor.');
      return cache.addAll(LOCAL_ASSETS);
    })
  );
});

// 2. Activate Olayı (Eski cache'leri temizle ve kontrolü hemen al)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 3. Fetch Olayı (Ağ İsteğini Önce Önbellekten Sunma)
self.addEventListener('fetch', (event) => {
  // Sadece HTTP(S) isteklerini yakala (Safari'deki chrome-extension:// hatalarını önler)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Önbellekte varsa döndür, yoksa ağdan çek
      return cachedResponse || fetch(event.request);
    })
  );
});