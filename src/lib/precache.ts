// Samolepky se po spuštění v klidu stáhnou do mezipaměti, takže se v chatu ukážou hned a fungují i offline.
const CACHE = 'hushki-stickers-v1';

export function precacheStickers() {
  if (!('caches' in window)) return;
  const run = async () => {
    try {
      const base = import.meta.env.BASE_URL;
      const list: string[] = await (await fetch(`${base}stickers/list.json`, { cache: 'no-cache' })).json();
      const cache = await caches.open(CACHE);
      for (const f of list) {
        const url = `${base}stickers/${f}`;
        if (!(await cache.match(url))) await cache.add(url).catch(() => undefined);
      }
    } catch { /* offline nebo bez seznamu: nic se neděje */ }
  };
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (idle) idle(() => { run(); }); else setTimeout(run, 4000);
}
