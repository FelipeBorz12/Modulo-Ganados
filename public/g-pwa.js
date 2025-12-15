// public/g-pwa.js - PWA del Módulo Ganados

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/g-sw.js', { scope: '/' }) // 👈 scope raíz de :3002
      .then((reg) => {
        console.log('[Ganados] Service worker registrado:', reg.scope);
      })
      .catch((err) => {
        console.error('[Ganados] Error al registrar service worker', err);
      });
  });
}
