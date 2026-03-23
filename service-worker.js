const CACHE_NAME = 'listr-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './db.js',
  './components/shopping.js',
  './components/frequent.js',
  './components/history.js',
  './components/settings.js',
  './components/picker-modal.js',
  './components/toast.js',
  './utils/csv.js',
  './utils/drag-drop.js',
  './utils/swipe.js',
  './utils/theme.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Install: pre-cache all app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // For navigation requests (directory URLs like /listr/), also try index.html
      // This handles the GitHub Pages subpath case where the cached key is ./index.html
      if (event.request.mode === 'navigate') {
        const indexMatch = caches.match('./index.html');
        if (indexMatch) return indexMatch;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache any new successful responses for app assets
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
