// Hushki Premium: co je placené a jestli ho uživatel má.
import type { User } from './backend';

/** Ceny jen pro zobrazení. Skutečnou cenu určuje Stripe (ceny STRIPE_PRICE_MONTH a STRIPE_PRICE_YEAR). */
export const PRICE_MONTH = '79 Kč';
export const PRICE_YEAR = '590 Kč';

export const isPremium = (u: Pick<User, 'premiumUntil'> | null | undefined) =>
  !!u?.premiumUntil && new Date(u.premiumUntil).getTime() > Date.now();

/** Prémiové archy: 31–45 v Pokeci, Domluvě, Ocenění a Dárcích, pikant 21–35. */
export function isPremiumSticker(id: string) {
  const m = /^([a-z])(\d+)$/.exec(id);
  if (!m) return false;
  const n = Number(m[2]);
  if (m[1] === 'p') return n >= 21;
  return 'orstdeg'.includes(m[1]) && n >= 31 && n <= 45;
}

/** Kostka bez Premium hází jen čísla 1–20. */
export const FREE_DICE_MAX = 20;
