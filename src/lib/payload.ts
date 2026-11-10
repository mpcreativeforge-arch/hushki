// Obsah vzkazu. Celý se šifruje, server nevidí ani typ (text/fotka/samolepka), ani na co se odpovídá.
import { backend } from './backend';
import { decryptBytes, decryptText, encryptBytes, encryptText } from './crypto';

export interface PhotoRef { path: string; iv: string; w: number; h: number; mime: string }
export interface ReplyRef { id: string; preview: string }

export interface Payload {
  v: 1;
  t: 'text' | 'photo' | 'sticker';
  text?: string;
  sticker?: string;
  photo?: PhotoRef;
  reply?: ReplyRef;
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
  if (p.t === 'photo') return p.text ? `📷 ${p.text}` : '📷 Fotka';
  if (p.t === 'sticker') return '✨ Samolepka';
  return (p.text ?? '').slice(0, 90);
}

/** Zmenší fotku (max 1600 px), převede na JPEG, zašifruje a nahraje. */
export async function uploadPhoto(key: CryptoKey, pairId: string, file: File, maxSide = 1600): Promise<PhotoRef> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.82));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const enc = await encryptBytes(key, bytes);
  const path = await backend.uploadPhoto(pairId, enc.data);
  return { path, iv: enc.iv, w, h, mime: 'image/jpeg' };
}

const cache = new Map<string, string>();

/** Stáhne a rozšifruje fotku, vrátí object URL (v paměti, nikde se neukládá). */
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
