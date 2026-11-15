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
