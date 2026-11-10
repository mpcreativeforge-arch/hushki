// Odemčená relace přežije obnovení stránky (stažení prstem dolů) ve stejné záložce.
// Hlavní klíč se uloží do sessionStorage zabalený klíčem, který je v IndexedDB jako
// neexportovatelný CryptoKey. Relace vyprší po SESSION_MS bez aktivity a zmizí se zavřením záložky.

const KEY = 'hushki-session';
const SESSION_MS = 5 * 60_000;
/** Když byla aplikace na pozadí, platí stejný limit jako automatické zamčení. */
const HIDDEN_MS = 30_000;

interface Stored { userId: string; iv: string; wrapped: string; at: number; room?: string; hidden?: boolean }

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function idb<T>(fn: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('hushki', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('keys');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('keys', mode);
      const req = fn(tx.objectStore('keys'));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

async function sessionKey(create: boolean): Promise<CryptoKey | null> {
  const existing = await idb<CryptoKey | undefined>((s) => s.get('session'), 'readonly').catch(() => undefined);
  if (existing || !create) return existing ?? null;
  const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']);
  await idb((s) => s.put(k, 'session'), 'readwrite');
  return k;
}

const read = (): Stored | null => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); } catch { return null; } };
const write = (s: Stored) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* nic */ } };

export async function saveSession(userId: string, master: CryptoKey, room?: string) {
  try {
    const k = await sessionKey(true);
    if (!k) return;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = await crypto.subtle.wrapKey('raw', master, k, { name: 'AES-GCM', iv });
    write({ userId, iv: b64(iv), wrapped: b64(wrapped), at: Date.now(), room });
  } catch { /* bez relace se jen znovu zadá PIN */ }
}

/** Prodlouží relaci a zapamatuje si otevřenou místnost. */
export function touchSession(room?: string | null) {
  const s = read();
  if (s) write({ ...s, at: Date.now(), hidden: document.hidden, room: room === null ? undefined : room ?? s.room });
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => touchSession());

export function clearSession() {
  try { sessionStorage.removeItem(KEY); } catch { /* nic */ }
}

export async function loadSession(userId: string): Promise<{ master: CryptoKey; room?: string } | null> {
  const s = read();
  if (!s || s.userId !== userId || Date.now() - s.at > (s.hidden ? HIDDEN_MS : SESSION_MS)) { clearSession(); return null; }
  try {
    const k = await sessionKey(false);
    if (!k) return null;
    const master = await crypto.subtle.unwrapKey('raw', unb64(s.wrapped), k, { name: 'AES-GCM', iv: unb64(s.iv) },
      { name: 'AES-GCM', length: 256 }, true, ['wrapKey', 'unwrapKey']);
    return { master, room: s.room };
  } catch {
    clearSession();
    return null;
  }
}
