self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Sin fetch handler: la app usa siempre la red, pero el service worker
// permanece registrado para que iOS la trate como web app instalable.
