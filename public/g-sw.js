// public/g-sw.js - Service worker del Módulo Ganados

const CACHE_NAME = 'ganados-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/tw-config.js',
  '/login.js',
  '/dashboard.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo manejamos GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((resp) => {
      if (resp) return resp;

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Sin conexión y recurso no cacheado', {
          status: 503,
          statusText: 'Offline'
        });
      });
    })
  );
});
