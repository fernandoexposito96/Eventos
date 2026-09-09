if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/Eventos/sw.js', { scope: '/Eventos/' }).catch(() => {});
  });
}

// Corrección de etiqueta visible: siempre mostrar "Hucha" en la interfaz.
function normalizeHuchaLabels(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.includes('Ucha')) {
      node.nodeValue = node.nodeValue.replace(/Ucha/g, 'Hucha');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  normalizeHuchaLabels();
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const node = mutation.target;
        if (node.nodeValue && node.nodeValue.includes('Ucha')) {
          node.nodeValue = node.nodeValue.replace(/Ucha/g, 'Hucha');
        }
        continue;
      }
      mutation.addedNodes.forEach(added => {
        if (added.nodeType === Node.TEXT_NODE) {
          if (added.nodeValue && added.nodeValue.includes('Ucha')) {
            added.nodeValue = added.nodeValue.replace(/Ucha/g, 'Hucha');
          }
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          normalizeHuchaLabels(added);
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
});
