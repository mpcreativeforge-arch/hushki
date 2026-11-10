// Uložení zamčeného klíče páru v zařízení.
import type { LockedKey } from './crypto';

interface Stored { pairId: string; locked: LockedKey }
const k = (userId: string) => `hushki-lock-${userId}`;

export function loadLocked(userId: string): Stored | null {
  try {
    const raw = localStorage.getItem(k(userId));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

export function saveLocked(userId: string, value: Stored) {
  localStorage.setItem(k(userId), JSON.stringify(value));
}

export function clearLocked(userId: string) {
  try { localStorage.removeItem(k(userId)); } catch { /* nic */ }
}
