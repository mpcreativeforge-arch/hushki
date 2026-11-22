// Moje sada tajných přání v místnosti. Každý upravuje jen svou sadu (název, popis, ikonu),
// partner úpravy nevidí: přání dostane až ve vzkazu, stejně jako přání z nabídky.
// Úpravy se šifrují klíčem místnosti a server je nepřečte; řádek s nimi čte jen jejich autor.
import { createContext, useContext } from 'react';
import { backend } from './backend';
import { decryptText, encryptText } from './crypto';
import { type LegendItem } from '../data/legend';
import { type Wish } from './payload';

export interface LegendEdit { title?: string; body?: string; emoji?: string; sticker?: string }
export type RoomLegend = Record<number, LegendEdit>;

export const TITLE_MAX = 40;
export const BODY_MAX = 300;
/** Bez Premium jdou upravit 2 přání. */
export const FREE_EDITS = 2;

function clean(v: unknown): RoomLegend {
  const out: RoomLegend = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, e] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || n > 99 || !e || typeof e !== 'object') continue;
    const x = e as Record<string, unknown>;
    const str = (s: unknown, max: number) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : undefined);
    const edit: LegendEdit = { title: str(x.title, TITLE_MAX), body: str(x.body, BODY_MAX), emoji: str(x.emoji, 16), sticker: str(x.sticker, 8) };
    if (edit.title || edit.body || edit.emoji || edit.sticker) out[n] = edit;
  }
  return out;
}

export async function loadRoomLegend(key: CryptoKey, pairId: string): Promise<RoomLegend> {
  const enc = await backend.getRoomLegend(pairId).catch(() => null);
  if (!enc) return {};
  try { return clean(JSON.parse(await decryptText(key, enc.ciphertext, enc.iv))); } catch { return {}; }
}

export async function saveRoomLegend(key: CryptoKey, pairId: string, legend: RoomLegend) {
  const { ciphertext, iv } = await encryptText(key, JSON.stringify(clean(legend)));
  await backend.saveRoomLegend(pairId, ciphertext, iv);
}

/** Moje přání po mých úpravách. */
export function applyEdit(item: LegendItem, e?: LegendEdit): LegendItem {
  if (!e) return item;
  return { ...item, title: e.title ?? item.title, body: e.body ?? item.body };
}

/** Přání do vzkazu. Upravené i neupravené má stejný tvar, partner je nerozliší. */
export function wishOf(item: LegendItem, e?: LegendEdit): Wish {
  const x = applyEdit(item, e);
  return { title: x.title, body: x.body, ...(e?.emoji ? { emoji: e.emoji } : e?.sticker ? { sticker: e.sticker } : {}) };
}

export const LegendContext = createContext<RoomLegend>({});
export const useRoomLegend = () => useContext(LegendContext);

/** První „znak“ (i složené emoji jako 👩‍❤️‍👨). */
export function firstGrapheme(s: string) {
  const t = s.trim();
  if (!t) return '';
  try { const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' }); for (const g of seg.segment(t)) return g.segment; } catch { /* starší prohlížeč */ }
  return Array.from(t).slice(0, 2).join('');
}
