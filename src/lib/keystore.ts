// Trezor klíčů v zařízení: hlavní klíč zamčený PINem + obalené klíče místností.
import type { LockedKey, WrappedRoom } from './crypto';

export interface Vault { v: 2; master: LockedKey; rooms: Record<string, WrappedRoom>; /** délka PINu */ len: number }
/** Starý formát (jeden pár, klíč zamčený přímo PINem). */
export interface LegacyVault { v?: undefined; pairId: string; locked: LockedKey }

const k = (userId: string) => `hushki-lock-${userId}`;

export function loadVault(userId: string): Vault | LegacyVault | null {
  try {
    const raw = localStorage.getItem(k(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveVault(userId: string, value: Vault) {
  localStorage.setItem(k(userId), JSON.stringify(value));
}

export function clearVault(userId: string) {
  try { localStorage.removeItem(k(userId)); } catch { /* nic */ }
}

/** Délka PINu uloženého v zařízení (starší verze měla 6 číslic). */
export function pinLength(userId: string, fallback: number): number {
  const v = loadVault(userId);
  if (!v) return fallback;
  return v.v === 2 ? v.len ?? 6 : 6;
}
