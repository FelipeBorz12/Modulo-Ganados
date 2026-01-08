// public/g-sw.js

// ✅ Cambia esta versión cuando despliegues cambios importantes
// (puedes poner fecha/hora). Solo con cambiar esto ya rompe caché viejo.
const VERSION = "2026-01-08-01";

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

  // (si tienes css local agrégalo acá)
  // "/styles.css",
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

  // ✅ Guard: si la URL no se puede parsear, no tocamos nada
  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  // ✅ Guard CLAVE: no manejar esquemas raros (chrome-extension:, data:, file:, etc.)
  // Esto evita el error: "Request scheme 'chrome-extension' is unsupported"
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  // No interceptar requests a la API
  if (url.pathname.startsWith("/api/")) return;

  // 1) Navegaciones (HTML): NETWORK FIRST
  // (para que al volver al dashboard no te sirva HTML/JS viejos)
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

// ----------------- helpers -----------------
function isCacheableRequest(req) {
  try {
    const u = new URL(req.url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_) {
    return false;
  }
}

async function safePut(cache, req, res) {
  try {
    if (!cache || !req || !res) return;

    // No intentes cachear esquemas no soportados
    if (!isCacheableRequest(req)) return;

    // No cachear respuestas malas (opcional pero recomendado)
    // (si quieres cachear 404, quita esta condición)
    if (!res.ok && res.type !== "opaque") return;

    await cache.put(req, res);
  } catch (e) {
    // Nunca romper por cache
    // console.warn("[SW] safePut:", e);
  }
}

// ----------------- estrategias -----------------
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    // guarda copia (seguro)
    await safePut(cache, req, fresh.clone());
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
  await safePut(cache, req, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then(async (fresh) => {
      await safePut(cache, req, fresh.clone());
      return fresh;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
