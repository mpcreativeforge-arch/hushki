// Vlastní Legenda místnosti. Oba z dvojice mohou upravit název, popis a ikonu kteréhokoli z 20 čísel.
// Úpravy se šifrují klíčem místnosti, server je nepřečte.
import { createContext, useContext } from 'react';
import { backend } from './backend';
import { decryptText, encryptText } from './crypto';
import { type LegendItem } from '../data/legend';

export interface LegendEdit { title?: string; body?: string; emoji?: string; sticker?: string }
export type RoomLegend = Record<number, LegendEdit>;

export const TITLE_MAX = 40;
export const BODY_MAX = 300;

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

/** Položka Legendy po úpravách místnosti. Vlastní popis platí pro oba (nezávisí na pohlaví). */
export function applyEdit(item: LegendItem, e?: LegendEdit): LegendItem {
  if (!e) return item;
  return { ...item, title: e.title ?? item.title, body: e.body ?? item.body, body_zena: e.body ? undefined : item.body_zena };
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
