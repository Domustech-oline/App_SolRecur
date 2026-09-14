const CACHE_NAME = 'utep-norte-v2';
const ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const aceitaHtml = req.headers.get('accept') && req.headers.get('accept').includes('text/html');

  // Para a página do app (HTML): sempre tenta buscar a versão mais nova na rede.
  // Só usa o cache se estiver sem internet.
  if (req.mode === 'navigate' || aceitaHtml) {
    event.respondWith(
      fetch(req).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return response;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Para os demais arquivos (ex.: biblioteca do PDF): cache primeiro, com fallback de rede.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
