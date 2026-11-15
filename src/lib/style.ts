// Sada samolepek (kluk / holka). Výchozí podle pohlaví, jde změnit v Nastavení. Jen v tomto zařízení.
import { useSyncExternalStore } from 'react';
import { type Gender } from './backend';
import { sexOf } from '../data/stickers';

type Sex = 'muz' | 'zena';
const KEY = (uid: string) => 'hushki.style.' + uid;
const subs = new Set<() => void>();

function read(uid: string): Sex | null {
  try { const v = localStorage.getItem(KEY(uid)); return v === 'muz' || v === 'zena' ? v : null; } catch { return null; }
}

export function stickerSex(uid: string, gender: Gender): Sex { return read(uid) ?? sexOf(gender); }

export function setStickerSex(uid: string, v: Sex) {
  try { localStorage.setItem(KEY(uid), v); } catch { /* */ }
  subs.forEach((f) => f());
}

export function useStickerSex(uid: string, gender: Gender): Sex {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => stickerSex(uid, gender));
}
