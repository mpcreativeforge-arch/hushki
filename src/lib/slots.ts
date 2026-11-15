// Vlastní texty u univerzálních ikon (sloty). Ukládají se jen v tomto telefonu.
import { FREE_SLOTS } from '../data/stickers';

const key = (userId: string) => `hushki.slots.${userId}`;

export function loadSlots(userId: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key(userId)) ?? '[]');
    return Array.isArray(v) ? v.slice(0, FREE_SLOTS).map((x) => (typeof x === 'string' ? x : '')) : [];
  } catch { return []; }
}

export function saveSlots(userId: string, slots: string[]) {
  try { localStorage.setItem(key(userId), JSON.stringify(slots.slice(0, FREE_SLOTS))); } catch { /* soukromé okno */ }
}

const legendKey = (pairId: string) => `hushki.legend.${pairId}`;

/** Čísla v Legendě, která má uživatel v této místnosti odemčená. */
export function loadUnlocked(pairId: string): number[] {
  try { const v = JSON.parse(localStorage.getItem(legendKey(pairId)) ?? '[]'); return Array.isArray(v) ? v.filter((n) => typeof n === 'number') : []; } catch { return []; }
}

export function saveUnlocked(pairId: string, nums: number[]) {
  try { localStorage.setItem(legendKey(pairId), JSON.stringify(Array.from(new Set(nums)))); } catch { /* soukromé okno */ }
}

// Heslo k Legendě platí pro celou místnost. Je to „herní“ zámek proti nahlédnutí,
// proto ho telefon (zamčený PINem aplikace) pamatuje, aby ho nebylo nutné zadávat u každého čísla.
const myPinKey = (pairId: string) => `hushki.legendpin.${pairId}`;
const theirPinKey = (pairId: string) => `hushki.legendkey.${pairId}`;

/** Heslo, kterým zamykám čísla, která v místnosti posílám já. */
export function loadRoomPin(pairId: string): string | null {
  try { const v = localStorage.getItem(myPinKey(pairId)); return v && /^\d{4}$/.test(v) ? v : null; } catch { return null; }
}
export function saveRoomPin(pairId: string, pin: string) {
  try { localStorage.setItem(myPinKey(pairId), pin); } catch { /* soukromé okno */ }
}

/** Poslední heslo od partnera, které platilo. Nová čísla se jím zkusí odemknout sama. */
export function loadPartnerPin(pairId: string): string | null {
  try { const v = localStorage.getItem(theirPinKey(pairId)); return v && /^\d{4}$/.test(v) ? v : null; } catch { return null; }
}
export function savePartnerPin(pairId: string, pin: string) {
  try { localStorage.setItem(theirPinKey(pairId), pin); } catch { /* soukromé okno */ }
}
