// public/g-pwa.js
(() => {
  const log = (...args) => console.log("[Ganados]", ...args);

  if (!("serviceWorker" in navigator)) {
    log("Service worker no soportado en este navegador.");
    return;
  }

  // Si NO quieres PWA en localhost, descomenta:
  // if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/g-sw.js");
      log("Service worker registrado:", reg.scope);

      // Si ya hay un SW esperando, lo activamos de una vez
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      // Cuando detecte una actualización
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          // Cuando el nuevo SW termina de instalarse
          if (newWorker.state === "installed") {
            // Si ya había un SW controlando la página, es update (no primera instalación)
            if (navigator.serviceWorker.controller) {
              log("Nueva versión del Service Worker lista. Activando...");
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          }
        });
      });

      // Cuando el SW activo cambia, recargamos para tomar assets nuevos (dashboard.js incluido)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        log("Service Worker actualizado. Recargando...");
        window.location.reload();
      });
    } catch (err) {
      console.warn("[Ganados] Error registrando SW:", err);
    }
  });
})();
