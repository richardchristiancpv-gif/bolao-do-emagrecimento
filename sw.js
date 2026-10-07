const CACHE_NAME = 'bolao-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=4.0',
  './app.js?v=4.0',
  './manifest.json',
  './icon.svg',
  './292a8f2a-ceeb-4b8f-818b-2cae53a78ff8.jfif'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First: Sempre tenta buscar a versão mais recente do Netlify
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
