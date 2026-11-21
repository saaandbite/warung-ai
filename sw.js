// Service Worker Warung AI — network-first untuk app shell,
// cache hanya sebagai cadangan saat offline.
// Data toko (produk, penjualan) tinggal di IndexedDB (js/db.js),
// bukan di cache ini.
//
// Kenapa network-first, bukan cache-first: cache-first pernah membuat
// satu sesi mencampur file lama dan baru (sync.js baru vs db.js lama
// dari cache) sehingga impor modul gagal. Network-first memastikan
// semua file dalam satu sesi berasal dari deployment yang sama saat
// online; cache dipakai hanya bila tidak ada internet.

const CACHE_NAME = 'warung-ai-v5';
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/ai.js',
  './js/sync.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani request GET same-origin (app shell & aset lokal).
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first: saat online selalu ambil versi terbaru dari server
  // (satu sesi = satu deployment yang konsisten). Saat offline, pakai
  // cache sebagai cadangan supaya aplikasi tetap bisa dibuka.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
