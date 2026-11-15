// Naposledy poslané samolepky (jen v tomto zařízení).
const KEY = (uid: string) => 'hushki.recent.' + uid;
const MAX = 10;

export function loadRecent(uid: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY(uid)) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}

export function pushRecent(uid: string, id: string): string[] {
  const next = [id, ...loadRecent(uid).filter((x) => x !== id)].slice(0, MAX);
  try { localStorage.setItem(KEY(uid), JSON.stringify(next)); } catch { /* bez úložiště */ }
  return next;
}
