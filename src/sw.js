// Service Worker der SPD-Soltau-App: macht die Seite installierbar, hält Grundgerüst und zuletzt
// besuchte Seiten offline vor und zeigt Push-Benachrichtigungen an. Vorstands-Anfragen (Registrierung,
// Buchung) werden zusätzlich im „Eingang“ (IndexedDB) abgelegt, damit sie im Mitgliederbereich bearbeitet werden können.
const VERSION = '__BUILD__';
const CACHE = 'spd-soltau-' + VERSION;
const SCOPE = self.registration.scope;
const PRECACHE = ['./', './index.html', './mitglieder/', './assets/styles.css', './assets/fonts.css', './assets/site.js', './assets/render.mjs', './assets/mitglieder.js', './assets/images/logo-spd-soltau-weiss.png', './offline.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('spd-soltau-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Seiten: Netz zuerst, sonst Cache, sonst Offline-Seite. Eigene Dateien: Cache zuerst, im Hintergrund aktualisieren.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Wix-Bilder, Video, APIs: unangetastet
  if (/\.(mp4|webm|m4a|mp3)$/.test(url.pathname) || req.headers.has('range')) return; // Hilfevideos: direkt vom Netz (Bereichsanfragen, groß)
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./offline.html'))));
    return;
  }
  // Skripte, Styles, Manifest: Netz zuerst (damit Änderungen sofort ankommen), sonst Cache
  if (/\.(js|mjs|css|webmanifest)$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match(req)));
    return;
  }
  // Bilder, Schriften, Icons: Cache zuerst, im Hintergrund auffrischen
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

// ---------- Push ----------
function idbPut(item) {
  return new Promise(res => {
    try {
      const r = indexedDB.open('spd-app', 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('inbox')) db.createObjectStore('inbox', { keyPath: 'id' }); };
      r.onsuccess = () => { const t = r.result.transaction('inbox', 'readwrite'); t.objectStore('inbox').put(item); t.oncomplete = res; t.onerror = res; };
      r.onerror = res;
    } catch (e) { res(); }
  });
}
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { title: 'SPD Soltau', body: e.data ? e.data.text() : '' }; }
  const title = p.title || 'SPD Soltau';
  const opts = {
    body: p.body || '', icon: new URL('./assets/icons/icon-192.png', SCOPE).href, badge: new URL('./assets/icons/badge-96.png', SCOPE).href,
    tag: p.tag || undefined, renotify: !!p.tag, data: { url: p.url || './', typ: p.data?.typ || '' }, lang: 'de',
  };
  const work = [self.registration.showNotification(title, opts)];
  if (p.data && (p.data.typ === 'registrierung' || p.data.typ === 'buchung')) {
    work.push(idbPut({ id: p.data.id || (p.tag || 'x') + '-' + Date.now(), title, body: p.body || '', data: p.data, receivedAt: Date.now(), done: '' }));
  }
  e.waitUntil(Promise.all(work));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './', SCOPE).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const same = list.find(c => c.url.split('#')[0] === target.split('#')[0]);
    if (same) { same.navigate(target).catch(() => {}); return same.focus(); }
    return self.clients.openWindow(target);
  }));
});
