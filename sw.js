// Fa funzionare la demo anche senza rete: al primo avvio con internet copia tutti i file
// nell'iPad, poi li prende sempre da li'. La versione cambia da sola quando cambia la demo.
const VERSIONE = 'gf-demo-982530b5cc';
const FILE = ["./", "./index.html", "./manifest.webmanifest", "./styles.css", "./dati.js", "./icone.js", "./app.js", "./viste-1.js", "./viste-2.js", "./viste-3.js", "./viste-4.js", "./apple-touch-icon.png", "./icona-192.png", "./icona-512.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSIONE)
      .then((c) => c.addAll(FILE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then((r) => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
