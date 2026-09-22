/* Isoelettrica: shell coerente per versione e archivio offline separato. */
'use strict';
const VERSION = '42.0';
const PREFIX = 'isoelettrica-', CACHE = PREFIX + 'v' + VERSION, ASSETS = PREFIX + 'assets-v1';
const BASE = new URL('./', self.location.href);
const Q = '?v=' + VERSION;
const CORE = ['./', './index.html', './anatomia.html', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './manifest.webmanifest' + Q]
  .concat(['app.js', 'engine.js', 'quiz.js', 'ipertrofie.js', 'data.js', 'atlante-digitale.js', 'ptbxl.js', 'three.min.js', 'cuore3d.js', 'coronarie.js'].map(f => './' + f + Q));
const absolute = u => new URL(u, BASE).href;
const own = u => u.origin === BASE.origin && u.pathname.startsWith(BASE.pathname);
const asset = u => /\.(jpg|jpeg|png|gif|webp|svg|woff2?|ttf)$/i.test(u.pathname) || u.pathname.includes('/atlante-reale/');
const coreURLs = new Set(CORE.map(absolute));
const reply = (e, data) => { if (e.ports && e.ports[0]) e.ports[0].postMessage(data); else if (e.source) e.source.postMessage(data); };
async function network(req) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
  try { return await fetch(req, { cache: 'no-store', signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
async function remember(cacheName, key, res) {
  if (res && res.ok) { try { await (await caches.open(cacheName)).put(key, res.clone()); } catch (_) { /* Online remains usable when storage is full. */ } }
}
self.addEventListener('install', e => e.waitUntil((async () => {
  // Download every required resource before touching the new cache.
  const responses = await Promise.all(CORE.map(async u => {
    const r = await network(absolute(u)); if (!r.ok) throw new Error('Risorsa indispensabile non disponibile: ' + u); return r;
  }));
  const existed = (await caches.keys()).includes(CACHE);
  try {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map((u, i) => c.put(absolute(u), responses[i])));
  } catch (error) { if (!existed) await caches.delete(CACHE); throw error; }
  // Activation remains explicit; a failed install leaves the previous worker active.
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  const keys = await caches.keys(), media = await caches.open(ASSETS);
  for (const key of keys.filter(k => k.startsWith(PREFIX + 'v') && k !== CACHE)) {
    const old = await caches.open(key); let migrated = true;
    for (const req of await old.keys()) {
      if (asset(new URL(req.url)) && !(await media.match(req))) {
        const response = await old.match(req);
        if (response) { try { await media.put(req, response); } catch (_) { migrated = false; break; } }
      }
    }
    if (migrated) await caches.delete(key);
  }
  await self.clients.claim();
})()));
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'skipWaiting') self.skipWaiting();
  if (d.type === 'version') reply(e, { type: 'version', version: VERSION });
  if (d.type === 'purge') e.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(k => k.startsWith(PREFIX)).map(k => caches.delete(k)));
    reply(e, { type: 'purged', ok: true });
  })());
  if (d.type === 'offline-status' || d.type === 'offline-save') e.waitUntil((async () => {
    const urls = [...new Set((Array.isArray(d.urls) ? d.urls : []).slice(0, 1000).map(absolute))]
      .filter(u => own(new URL(u)) && asset(new URL(u)));
    const c = await caches.open(ASSETS); let done = 0, failed = 0;
    for (const u of urls) {
      let hit = await c.match(u);
      if (!hit && d.type === 'offline-save') {
        try { const r = await network(u); if (!r.ok) throw new Error('HTTP ' + r.status); await c.put(u, r); hit = true; }
        catch (_) { failed++; }
      }
      if (hit) done++;
      if (d.type === 'offline-save') reply(e, { type: 'offline-progress', id: d.id, done, failed, total: urls.length, complete: false });
    }
    reply(e, { type: 'offline-progress', id: d.id, done, failed, total: urls.length, complete: true });
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url); if (!own(url)) return;
  e.respondWith((async () => {
    const shell = await caches.open(CACHE), media = await caches.open(ASSETS);
    const home = req.mode === 'navigate' && (url.pathname === BASE.pathname || url.pathname === BASE.pathname + 'index.html');
    const key = home ? absolute('./index.html') : req;
    const c = asset(url) ? media : shell;
    // Immutable versioned shell prevents mixed old/new modules during an update.
    const hit = (await c.match(key)) || (asset(url) ? await shell.match(key) : undefined);
    if (hit && (home || coreURLs.has(url.href) || asset(url))) return hit;
    try {
      const res = await network(req);
      if (!res.ok) return hit || res;
      await remember(asset(url) ? ASSETS : CACHE, key, res);
      return res;
    } catch (_) {
      // An absent script/JSON never receives an HTML page as a substitute.
      return hit || Response.error();
    }
  })());
});
