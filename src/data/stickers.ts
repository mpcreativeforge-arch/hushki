// Samolepky Hushki (verze 7). Obrázky patří do public/stickers/<id>.png.
// Dokud obrázek chybí, zobrazí se náhradní emoji.
//
// Prefixy: m/f = původní sada kluk/holka, o/r = Ocenění, s/t = Small talk,
// d/e = Domluva, g = Dárky, p = Hushki pikant (číslo = pořadí, pNN → NN).
import type { Gender } from '../lib/backend';

export interface Sticker { id: string; label: string; fallback: string }
export type TabId = 'oceneni' | 'smalltalk' | 'domluva' | 'darky' | 'pikant';
export interface StickerTab { id: TabId; title: string; stickers: Sticker[] }

const s = (id: string, label: string, fallback: string): Sticker => ({ id, label, fallback });
const series = (prefix: string, labels: [string, string][]) => labels.map(([l, f], i) => s(prefix + String(i + 1).padStart(2, '0'), l, f));

const OCENENI: [string, string][] = [
  ['Thank you', '🙏'], ["You're the best", '🏆'], ['Well done', '👏'], ['Wow', '😍'], ['Proud of you', '🥇'],
  ['Looking good', '✨'], ['Love you', '😘'], ['Hug', '🤗'], ['Sorry', '🥺'], ['Srdíčko z tlapek', '🫶'],
  ['Růže', '🌹'], ['Poklona', '🙇'], ['For you', '☕'], ['So sweet', '🥰'], ['My hero', '👑'],
];
const SMALLTALK: [string, string][] = [
  ['Hi', '👋'], ['Good morning', '☀️'], ['Good night', '🌙'], ['How are you?', '🙂'], ['Busy', '💻'],
  ['Tired', '🥱'], ['Hungry', '🍽️'], ['Coffee?', '☕'], ['LOL', '😂'], ['OMG', '😱'],
  ['Shy', '🙈'], ['Bored', '😑'], ['Cold', '🥶'], ['Hmm', '🤔'], ['OK', '👍'],
];
const DOMLUVA: [string, string][] = [
  ['Today', '📅'], ['Tomorrow', '➡️'], ['Tonight', '🌙'], ['Deal', '🤝'], ['Agree', '👍'],
  ['Why not', '🤷'], ['Good idea', '💡'], ['Maybe', '🤔'], ['Not today', '🙅'], ['Later', '⏰'],
  ['On my way', '🏃'], ['Call me', '📞'], ['Where are you?', '👀'], ['Waiting', '⏳'], ['Miss you', '💞'],
];
const KLUK: [string, string][] = [
  ['Psst', '🤫'], ['Zamilovaný', '😍'], ['Pusa', '😘'], ['Růže', '🌹'], ['Srdce', '❤️'],
  ['Úšklebek', '😏'], ['Kousnutí do rtu', '😈'], ['Horko', '🥵'], ['Plamen', '🔥'], ['Dopis', '💌'],
  ['Dnes večer?', '⌚'], ['Prosím', '🥺'], ['Obejmutí', '🤗'], ['Smích', '😂'], ['Dobrou noc', '😴'],
];
const HOLKA: [string, string][] = [
  ['Psst', '🤫'], ['Zamilovaná', '😍'], ['Pusa', '😘'], ['Srdíčko z tlapek', '🫶'], ['Stydlivá', '🙈'],
  ['Ale no tak', '🙄'], ['Kousnutí do rtu', '😏'], ['Horko', '🥵'], ['Šátek', '🎀'], ['Pojď sem', '👉'],
  ['Trucuju', '😤'], ['Ano!', '👍'], ['Polštář', '🥰'], ['Smích', '😂'], ['Dobrou noc', '😴'],
];
const DARKY: [string, string][] = [
  ['Dáreček', '🎁'], ['Hromada dárků', '🎁'], ['Kytice', '💐'], ['Růže', '🌹'], ['Bonboniéra', '🍫'],
  ['Dort', '🎂'], ['Cupcake', '🧁'], ['Přípitek', '🥂'], ['Koktejl', '🍸'], ['Šampaňské', '🍾'],
  ['Balónky', '🎈'], ['Konfety', '🎉'], ['Dopis', '💌'], ['Hushki v dárku', '🎁'], ['Všechno nej', '🥳'],
];
const PIKANT: [string, string][] = [
  ['Šátek', '🎀'], ['Svíčky', '🕯️'], ['Pomalu', '🛏️'], ['Koupel', '🛁'], ['Pravidla hry', '📜'],
  ['Bez slov', '🤐'], ['Dárek', '🎁'], ['Masáž', '💆'], ['Tři přání', '🪔'], ['Kostky', '🎲'],
  ['Hádanka', '🎭'], ['Rande doma', '🍷'], ['Tvoje košile', '👔'], ['Čekám', '🛏️'], ['Krajka', '🖤'],
];

const kluk = series('m', KLUK);
const holka = series('f', HOLKA);
const all = [
  ...series('o', OCENENI), ...series('r', OCENENI), ...series('s', SMALLTALK), ...series('t', SMALLTALK),
  ...series('d', DOMLUVA), ...series('e', DOMLUVA), ...kluk, ...holka, ...series('g', DARKY), ...series('p', PIKANT),
];
export const STICKERS = new Map(all.map((x) => [x.id, x] as const));
const pick = (ids: string[]) => ids.map((id) => STICKERS.get(id)!);
const range = (prefix: string, n = 15) => Array.from({ length: n }, (_, i) => prefix + String(i + 1).padStart(2, '0'));

/** Univerzální ikony s textem (vlastní sloty). Dvě na pohlaví. */
export const SLOT_ICONS: Record<'muz' | 'zena', [string, string]> = { muz: ['m01', 'm10'], zena: ['f01', 'f10'] };

/** Kolik vlastních textů má uživatel zdarma. Další se budou dokupovat. */
export const FREE_SLOTS = 2;

/** Systémové texty u univerzálních ikon. Vlastní text se mezi nimi neliší. */
export const SLOT_TEXTS: [string[], string[]] = [
  ['Mám tajemství. Řeknu ti ho večer.', 'Celý den na tebe myslím.', 'Dnes večer mám pro tebe překvapení.', 'Mám ti něco pošeptat do ouška.'],
  ['Pojď ke mně, až budeš mít chvilku.', 'Mám na tebe chuť.', 'Nemůžu se dočkat večera.', 'Dneska tě nepustím.'],
];

export const sexOf = (g: Gender): 'muz' | 'zena' => (g === 'zena' ? 'zena' : 'muz');

/** Záložky podle pohlaví. Kdo pohlaví neuvedl, dostane mužskou sadu. */
export function tabsFor(gender: Gender): StickerTab[] {
  const f = sexOf(gender) === 'zena';
  const old = (f ? holka : kluk).filter((x) => !SLOT_ICONS[f ? 'zena' : 'muz'].includes(x.id));
  return [
    { id: 'oceneni', title: 'Ocenění', stickers: [...pick(range(f ? 'r' : 'o')), ...old] },
    { id: 'smalltalk', title: 'Small talk', stickers: pick(range(f ? 't' : 's')) },
    { id: 'domluva', title: 'Domluva', stickers: [...pick(SLOT_ICONS[f ? 'zena' : 'muz']), ...pick(range(f ? 'e' : 'd'))] },
    { id: 'darky', title: 'Dárky', stickers: pick(range('g')) },
    { id: 'pikant', title: 'Hushki pikant', stickers: pick(range('p')) },
  ];
}

/** Číslo pikantní samolepky (p08 → 8), jinak null. */
export const pikantNumber = (id: string) => (/^p\d+$/.test(id) ? Number(id.slice(1)) : null);
export const pikantId = (n: number) => 'p' + String(n).padStart(2, '0');
export const PIKANT_COUNT = PIKANT.length;

/** Index slotu (0/1), pokud je samolepka univerzální ikona. */
export const slotIndex = (id: string) => {
  for (const g of ['muz', 'zena'] as const) { const i = SLOT_ICONS[g].indexOf(id); if (i >= 0) return i; }
  return -1;
};

export const stickerSrc = (id: string) => `${import.meta.env.BASE_URL}stickers/${id}.png`;
