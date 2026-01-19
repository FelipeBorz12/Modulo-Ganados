// public/g-sw.js

// ✅ Cambia esta versión cuando despliegues cambios importantes
const VERSION = "2026-01-08-11";

const STATIC_CACHE = `ganados-static-${VERSION}`;
const RUNTIME_CACHE = `ganados-runtime-${VERSION}`;

// Cache mínimo (solo archivos “shell” reales)
const STATIC_ASSETS = [
  "/",
  "/g-manifest.webmanifest",
  "/g-pwa.js",
  "/tw-config.js",

  // ✅ tus JS principales (ajusta si cambian nombres/rutas)
  "/dashboard.js",
  "/ingreso.js",
  "/salida.js",
  "/modificaciones.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("ganados-") && ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Permite forzar activación desde g-pwa.js
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  // ✅ 1) NO tocar esquemas raros (chrome-extension:, file:, etc.)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // ✅ 2) NO tocar requests de terceros (CDNs, extensiones, etc.)
  // Esto evita el error de cache.put con chrome-extension y reduce ruido.
  if (url.origin !== self.location.origin) return;

  // No interceptar requests a la API
  if (url.pathname.startsWith("/api/")) return;

  // 1) Navegaciones (HTML): NETWORK FIRST
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, STATIC_CACHE));
    return;
  }

  // 2) JS/CSS: NETWORK FIRST
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // 3) Imágenes / fonts: CACHE FIRST
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico)$/i) ||
    url.pathname.match(/\.(woff|woff2|ttf|otf)$/i)
  ) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }

  // 4) Default
  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

// ----------------- estrategias -----------------
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);

    // ✅ evita reventar cache.put con respuestas raras
    try {
      if (fresh && fresh.ok) await cache.put(req, fresh.clone());
    } catch (_) {}

    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || Response.error();
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);

  try {
    if (fresh && fresh.ok) await cache.put(req, fresh.clone());
  } catch (_) {}

  return fresh;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then(async (fresh) => {
      try {
        if (fresh && fresh.ok) await cache.put(req, fresh.clone());
      } catch (_) {}
      return fresh;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
