// public/g-sw.js

// ✅ Cambia esta versión cuando despliegues cambios importantes
const VERSION = "2026-01-09-01";

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
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // ✅ 1) NO tocar esquemas raros (chrome-extension://, moz-extension://, etc.)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // ✅ 2) NO interceptar ni cachear recursos que NO sean same-origin
  // (evita fallos con extensiones / cdn / etc. y deja que el navegador maneje eso)
  if (url.origin !== self.location.origin) return;

  // ✅ 3) No interceptar requests a la API
  if (url.pathname.startsWith("/api/")) return;

  // 1) Navegaciones (HTML): NETWORK FIRST
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, STATIC_CACHE));
    return;
  }

  // 2) JS/CSS: NETWORK FIRST (evita dashboard.js viejo pegado)
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

  // 4) Default: stale-while-revalidate suave
  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

// ----------------- estrategias -----------------

function isCacheableResponse(res) {
  // ✅ NO cachear 500/404/etc.
  return res && res.ok;
}

async function safePut(cache, req, res) {
  // ✅ Evita que un put tumbe el SW si algo raro pasa
  try {
    await cache.put(req, res);
  } catch (_) {
    // ignorar errores de cache.put
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);

    // ✅ cachear solo respuestas OK
    if (isCacheableResponse(fresh)) {
      await safePut(cache, req, fresh.clone());
    }

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

  // ✅ cachear solo respuestas OK
  if (isCacheableResponse(fresh)) {
    await safePut(cache, req, fresh.clone());
  }

  return fresh;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then(async (fresh) => {
      if (isCacheableResponse(fresh)) {
        await safePut(cache, req, fresh.clone());
      }
      return fresh;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
