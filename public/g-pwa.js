// public/g-pwa.js
(() => {
  const log = (...args) => console.log("[Ganados]", ...args);

  if (!("serviceWorker" in navigator)) {
    log("Service worker no soportado en este navegador.");
    return;
  }

  function showUpdateToast(onUpdate) {
    // si ya existe, no duplicar
    if (document.getElementById("pwa-update-toast")) return;

    const toast = document.createElement("div");
    toast.id = "pwa-update-toast";
    toast.className =
      "fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[9999] " +
      "max-w-xl md:max-w-sm bg-white dark:bg-[#1e1d2b] border border-gray-200/70 dark:border-gray-800 " +
      "shadow-xl rounded-2xl p-4 flex items-start gap-3";

    toast.innerHTML = `
      <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined">system_update</span>
      </div>
      <div class="flex-1">
        <p class="font-extrabold text-gray-900 dark:text-white">Nueva versión disponible</p>
        <p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
          Actualiza para ver los últimos cambios.
        </p>
        <div class="mt-3 flex gap-2 justify-end">
          <button id="pwa-update-later"
            class="px-4 py-2 text-sm rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c2b3b] hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Luego
          </button>
          <button id="pwa-update-now"
            class="px-4 py-2 text-sm rounded-full bg-primary text-white font-extrabold hover:opacity-95 transition">
            Actualizar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    document.getElementById("pwa-update-later").addEventListener("click", () => {
      toast.remove();
    });
    document.getElementById("pwa-update-now").addEventListener("click", () => {
      toast.remove();
      onUpdate();
    });
  }

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/g-sw.js");
      log("Service worker registrado:", reg.scope);

      // si hay uno esperando, ofrecer actualizar
      if (reg.waiting) {
        showUpdateToast(() => reg.waiting.postMessage({ type: "SKIP_WAITING" }));
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            // si ya hay SW controlando, es update
            if (navigator.serviceWorker.controller) {
              log("Nueva versión lista (esperando activación).");
              showUpdateToast(() => newWorker.postMessage({ type: "SKIP_WAITING" }));
            }
          }
        });
      });

      // cuando el SW cambia, recargamos
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
