// Hushki service worker: hláška bez spojení + diskrétní push upozornění.
const CACHE = 'hushki-v5';
const SCOPE = self.registration.scope;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE + 'manifest.webmanifest', SCOPE + 'hushki-logo.png'])).catch(() => {}));
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
    // Stránka jde vždy ze sítě. Bez spojení ukážeme hlášku místo staré uložené verze aplikace.
    e.respondWith(fetch(req).catch(() => (req.mode === 'navigate' ? offlinePage() : caches.match(req))));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});

function offlinePage() {
  const cs = /^(cs|sk)/i.test(self.navigator.language || '');
  const t = cs
    ? ['Spojení se serverem není k dispozici', 'Omlouváme se za potíže. Zkontroluj připojení k internetu a zkus to prosím později.', 'Zkusit znovu']
    : ['The server is not available', 'Sorry for the trouble. Check your internet connection and please try again later.', 'Try again'];
  const html = `<!doctype html><html lang="${cs ? 'cs' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hushki</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1e1736;color:#f6eadb;font-family:system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
img{width:88px;height:88px}h1{font-size:22px;margin:16px 0 8px}p{color:#b8a9d9;max-width:320px;margin:0 auto 24px;line-height:1.5}
button{background:#f6eadb;color:#1e1736;border:0;border-radius:999px;padding:14px 28px;font-size:16px;font-weight:600}</style></head>
<body><div><img src="${SCOPE}hushki-logo.png" alt="" onerror="this.remove()"><h1>${t[0]}</h1><p>${t[1]}</p><button onclick="location.reload()">${t[2]}</button></div></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

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
