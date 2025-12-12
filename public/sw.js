// sw.js - service worker básico

const CACHE_NAME = 'ganados-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/ingreso',
  '/salida',
  '/modificaciones',
  '/tw-config.js',
  '/login.js',
  '/dashboard.js',
  '/ingreso.js',
  '/salida.js',
  '/modificaciones.js'
];

// Instalar SW y cachear recursos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Activar SW
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return (
        resp ||
        fetch(event.request).catch(() =>
          caches.match('/') // fallback al root si no hay red
        )
      );
    })
  );
});
