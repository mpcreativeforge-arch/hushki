// Jednoduché přepínání jazyka: texty se píšou přímo v kódu jako t('česky', 'English').
// Jazyk se pamatuje v prohlížeči. Výchozí je čeština, anglicky jen když telefon mluví anglicky a nic není uložené.
import { useSyncExternalStore } from 'react';

export type Lang = 'cs' | 'en';
const KEY = 'hushki.lang';

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'cs' || saved === 'en') return saved;
  } catch { /* */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'cs';
  return /^(cs|sk)/i.test(nav) ? 'cs' : 'en';
}

let lang: Lang = initial();
const listeners = new Set<() => void>();
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export const getLang = () => lang;
export const isEn = () => lang === 'en';

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* */ }
  document.documentElement.lang = next;
  listeners.forEach((l) => l());
}

/** Text v aktuálním jazyce. */
export const t = (cs: string, en: string) => (lang === 'en' ? en : cs);

/** Hook: komponenta se překreslí po změně jazyka. */
export function useLang(): Lang {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, getLang, getLang);
}

/** České skloňování podle počtu (1 / 2–4 / 5+), anglicky jednotné a množné číslo. */
export function plural(n: number, one: string, few: string, many: string, enOne: string, enMany: string) {
  if (lang === 'en') return n === 1 ? enOne : enMany;
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}
