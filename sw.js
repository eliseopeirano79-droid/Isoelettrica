/* Isoelettrica — service worker
   Strategia: codice e pagine sempre dalla rete saltando la cache HTTP (è quella
   che teneva bloccata l'app installata sul Dock), immagini dalla cache perché
   non cambiano mai. Offline si ricade sull'ultima copia salvata. */
const VERSION = '38';
const CACHE = 'isoelettrica-v' + VERSION;
const Q = '?v=' + VERSION;
const CORE = ['./', './index.html', './anatomia.html',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png', './manifest.webmanifest' + Q]
  .concat(['app.js', 'engine.js', 'ipertrofie.js', 'data.js', 'atlante-digitale.js', 'three.min.js', 'cuore3d.js', 'coronarie.js']
    .map(f => './' + f + Q));
/* I tracciati reali di PTB-XL si comportano come le immagini: non cambiano mai
   e sono troppi per stare nella cache iniziale. Li conserviamo man mano che li
   apri, così dalla seconda volta ci sono anche senza rete. */
const IMMUTABILE = /\.(jpg|jpeg|png|gif|webp|svg|woff2?|ttf)$|atlante-reale\//i;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(u =>
      fetch(u, { cache: 'reload' }).then(r => { if (r && r.ok) return c.put(u, r); }).catch(() => {})
    ));
    // niente skipWaiting automatico: la pagina chiede conferma prima di ricaricare
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'skipWaiting') self.skipWaiting();
  if (d.type === 'version' && e.source) e.source.postMessage({ type: 'version', version: VERSION });
  if (d.type === 'purge') {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))));
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  if (IMMUTABILE.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    })));
    return;
  }

  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-store' });
      if (res && res.ok) { const cp = res.clone(); (await caches.open(CACHE)).put(req, cp); }
      return res;
    } catch (err) {
      return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
    }
  })());
});
