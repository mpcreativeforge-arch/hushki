// Hushki service worker: offline shell + diskrétní push upozornění.
const CACHE = 'hushki-v5';
const SCOPE = self.registration.scope;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE, SCOPE + 'manifest.webmanifest'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !k.startsWith('hushki-stickers')).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase apod. nikdy necachovat
  if (req.mode === 'navigate' || url.pathname.endsWith('.webmanifest')) {
    // Síť má přednost. Čerstvou stránku uložíme, aby offline záloha nebyla stará verze aplikace.
    const key = req.mode === 'navigate' ? SCOPE : req;
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
      return res;
    }).catch(() => caches.match(key)));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});

self.addEventListener('push', (e) => {
  let data = { title: 'Hushki', body: /^(cs|sk)/i.test(self.navigator.language || '') ? 'Máš nový vzkaz' : 'You have a new message', tag: 'hushki-new' };
  try { data = { ...data, ...e.data.json() }; } catch {}
  // Číslo na ikoně aplikace (iOS 16.4+ na ploše, Android Chrome). Server posílá počet nepřečtených.
  const nav = self.navigator;
  const badge = typeof data.badge === 'number' && nav.setAppBadge
    ? (data.badge > 0 ? nav.setAppBadge(data.badge) : nav.clearAppBadge()).catch(() => {})
    : Promise.resolve();
  e.waitUntil(Promise.all([badge, self.registration.showNotification(data.title, {
    body: data.body,
    tag: data.tag,
    icon: SCOPE + 'app-icons/icon-192.png',
    badge: SCOPE + 'app-icons/icon-192.png',
  })]));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow(SCOPE);
    }),
  );
});
