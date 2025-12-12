// public/sw.js - service worker básico para Ganados

const CACHE_NAME = 'ganados-cache-v1';
const URLS_TO_CACHE = [
  './',              // equivale a /ganados/
  'login.html',
  'dashboard.html',
  'ingreso',
  'salida',
  'modificaciones',
  'tw-config.js',
  'dashboard.js',
  'ingreso.js',
  'salida.js',
  'modificaciones.js'
];

// Instalar SW y cachear recursos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Activar SW y limpiar caches viejos
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
      if (resp) return resp;
      return fetch(event.request).catch(() =>
        caches.match('./') // fallback al inicio de la app (/ganados/)
      );
    })
  );
});
