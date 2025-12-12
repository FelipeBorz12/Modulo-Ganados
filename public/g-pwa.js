// public/pwa.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js') // 👈 SIN / delante -> se vuelve /ganados/sw.js
      .then((reg) => {
        console.log('Service worker registrado:', reg.scope);
      })
      .catch((err) => {
        console.error('Error al registrar service worker', err);
      });
  });
}

