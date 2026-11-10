// Šifrování vzkazů (Web Crypto, AES-GCM 256).
// Párovací kód -> PBKDF2 -> klíč páru. Server zná jen SHA-256 kódu a otisk klíče.
// Klíč páru je v zařízení uložen zašifrovaný klíčem odvozeným z PINu.

const enc = new TextEncoder();
const dec = new TextDecoder();
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; // bez 0/O, 1/I/L, U

export function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256(text: string): Promise<string> {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

/** 16 znaků (~78 bitů), formát XXXX-XXXX-XXXX-XXXX */
export function generatePairCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return chars.match(/.{4}/g)!.join('-');
}

export function normalizeCode(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.match(/.{1,4}/g)?.join('-') ?? '';
}

export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

export async function inviteHash(code: string): Promise<string> {
  return sha256('hushki-invite:' + code);
}

async function pbkdf2(secret: string, salt: Uint8Array<ArrayBuffer>, iterations: number, extractable: boolean) {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );
}

/** Klíč páru odvozený z párovacího kódu (stejný na obou telefonech). */
export async function derivePairKey(code: string): Promise<CryptoKey> {
  return pbkdf2(code, enc.encode('hushki-pair-key-v1'), 310_000, true);
}

/** Otisk klíče, aby šlo ověřit správnost kódu bez prozrazení klíče. */
export async function keyCheck(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return sha256('hushki-check:' + b64(raw));
}

export async function encryptText(key: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { ciphertext: b64(ct), iv: b64(iv) };
}

export async function decryptText(key: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ciphertext));
  return dec.decode(pt);
}

// --- Zámek PINem ------------------------------------------------------------

export interface LockedKey {
  v: 1;
  salt: string;
  iv: string;
  wrapped: string;
  iterations: number;
}

export async function lockKey(pairKey: CryptoKey, pin: string): Promise<LockedKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 600_000;
  const kek = await pbkdf2(pin, salt, iterations, false);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey('raw', pairKey, kek, { name: 'AES-GCM', iv });
  return { v: 1, salt: b64(salt), iv: b64(iv), wrapped: b64(wrapped), iterations };
}

/** Vrátí klíč páru, nebo vyhodí chybu při špatném PINu. */
export async function unlockKey(locked: LockedKey, pin: string): Promise<CryptoKey> {
  const kek = await pbkdf2(pin, unb64(locked.salt), locked.iterations, false);
  return crypto.subtle.unwrapKey(
    'raw',
    unb64(locked.wrapped),
    kek,
    { name: 'AES-GCM', iv: unb64(locked.iv) },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
