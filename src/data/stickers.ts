// Samolepky Hushki. Obrázky patří do public/stickers/<id>.png.
// Dokud obrázek chybí, zobrazí se náhradní emoji.
import type { Gender } from '../lib/backend';

export interface Sticker { id: string; label: string; fallback: string }
export interface StickerPack { id: 'kluk' | 'holka'; title: string; stickers: Sticker[] }

const s = (id: string, label: string, fallback: string): Sticker => ({ id, label, fallback });

export const PACKS: StickerPack[] = [
  {
    id: 'kluk',
    title: 'Hushki kluk',
    stickers: [
      s('m01', 'Psst', '🤫'), s('m02', 'Zamilovaný', '😍'), s('m03', 'Pusa', '😘'), s('m04', 'Růže', '🌹'), s('m05', 'Srdce', '❤️'),
      s('m06', 'Úšklebek', '😏'), s('m07', 'Kousnutí do rtu', '😈'), s('m08', 'Horko', '🥵'), s('m09', 'Plamen', '🔥'), s('m10', 'Dopis', '💌'),
      s('m11', 'Dnes večer?', '⌚'), s('m12', 'Prosím', '🥺'), s('m13', 'Obejmutí', '🤗'), s('m14', 'Smích', '😂'), s('m15', 'Dobrou noc', '😴'),
    ],
  },
  {
    id: 'holka',
    title: 'Hushki holka',
    stickers: [
      s('f01', 'Psst', '🤫'), s('f02', 'Zamilovaná', '😍'), s('f03', 'Pusa', '😘'), s('f04', 'Srdíčko z tlapek', '🫶'), s('f05', 'Stydlivá', '🙈'),
      s('f06', 'Ale no tak', '🙄'), s('f07', 'Kousnutí do rtu', '😏'), s('f08', 'Horko', '🥵'), s('f09', 'Šátek', '🎀'), s('f10', 'Pojď sem', '👉'),
      s('f11', 'Trucuju', '😤'), s('f12', 'Ano!', '👍'), s('f13', 'Polštář', '🥰'), s('f14', 'Smích', '😂'), s('f15', 'Dobrou noc', '😴'),
    ],
  },
];

export const STICKERS = new Map(PACKS.flatMap((p) => p.stickers.map((x) => [x.id, x] as const)));

/** Pořadí sad podle pohlaví: vlastní sada první. */
export function packsFor(gender: Gender): StickerPack[] {
  return gender === 'zena' ? [PACKS[1], PACKS[0]] : PACKS;
}

export const stickerSrc = (id: string) => `${import.meta.env.BASE_URL}stickers/${id}.png`;
