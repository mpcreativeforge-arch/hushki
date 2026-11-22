// Obsah vzkazu. Celý se šifruje, server nevidí ani typ, ani text, ani heslo k Legendě.
import { backend } from './backend';
import { decryptBytes, decryptText, encryptText } from './crypto';
import { pikantNumber } from '../data/stickers';
import { t } from './i18n';

export interface PhotoRef { path: string; iv: string; w: number; h: number; mime: string }
export interface ReplyRef { id: string; preview: string }
/** Zámek pikantního čísla v Legendě: sůl a SHA-256 hesla. */
export interface LockRef { s: string; h: string }
/** Tajné přání odesílatele (text a ikona z jeho sady). Partner jinou cestou jeho sadu nevidí. */
export interface Wish { title: string; body: string; emoji?: string; sticker?: string }

export interface Payload {
  v: 1;
  /** text a photo jsou jen ve starých vzkazech (verze 6 a dřív). */
  t: 'text' | 'photo' | 'sticker';
  text?: string;
  sticker?: string;
  photo?: PhotoRef;
  reply?: ReplyRef;
  lock?: LockRef;
  /** Číslo vybrala kostka (ukáže se oběma). */
  dice?: boolean;
  /** U pikantního čísla: přání, jak ho odesílatel má ve své sadě. */
  wish?: Wish;
}

export async function encodePayload(key: CryptoKey, p: Omit<Payload, 'v'>) {
  return encryptText(key, JSON.stringify({ v: 1, ...p }));
}

export async function decodePayload(key: CryptoKey, ciphertext: string, iv: string): Promise<Payload> {
  const raw = await decryptText(key, ciphertext, iv);
  try {
    const p = JSON.parse(raw);
    if (p && p.v === 1 && typeof p.t === 'string') return p as Payload;
  } catch { /* starší vzkazy: čistý text */ }
  return { v: 1, t: 'text', text: raw };
}

export function previewOf(p: Payload): string {
  if (p.t === 'photo') return p.text ? `📷 ${p.text}` : '📷 ' + t('Fotka', 'Photo');
  if (p.t === 'sticker') {
    const n = pikantNumber(p.sticker ?? '');
    if (n) return `🌶 ${t('Číslo', 'Number')} ${n}`;
    return p.text ? `✨ ${p.text}`.slice(0, 90) : '✨ ' + t('Samolepka', 'Sticker');
  }
  return (p.text ?? '').slice(0, 90);
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

async function hashPin(salt: string, pin: string) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`hushki-legend:${salt}:${pin}`)));
}

export async function makeLock(pin: string): Promise<LockRef> {
  const s = hex(crypto.getRandomValues(new Uint8Array(12)).buffer);
  return { s, h: await hashPin(s, pin) };
}

export async function checkLock(lock: LockRef, pin: string) {
  return (await hashPin(lock.s, pin)) === lock.h;
}

const cache = new Map<string, string>();

/** Stáhne a rozšifruje fotku ze starého vzkazu, vrátí object URL (jen v paměti). */
export async function photoUrl(key: CryptoKey, ref: PhotoRef): Promise<string> {
  const hit = cache.get(ref.path);
  if (hit) return hit;
  const data = await backend.downloadPhoto(ref.path);
  const plain = await decryptBytes(key, data as Uint8Array<ArrayBuffer>, ref.iv);
  const url = URL.createObjectURL(new Blob([plain], { type: ref.mime }));
  cache.set(ref.path, url);
  return url;
}

export function clearPhotoCache() {
  cache.forEach((u) => URL.revokeObjectURL(u));
  cache.clear();
}
