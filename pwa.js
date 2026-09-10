if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/Eventos/sw.js', { scope: '/Eventos/' }).catch(() => {});
  });
}
