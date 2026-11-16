// Samolepky Hushki (verze 7.1). Obrázky patří do public/stickers/<id>.webp (256 × 256 px).
// Další sady (16–45) se v nabídce ukážou, až bude obrázek nahraný; do té doby je skrytá.
// Pikantní čísla bez obrázku ukazují náhradní emoji s číslem.
//
// Prefixy: m/f = původní sada kluk/holka, u/v = univerzální kluk/holka, o/r = Ocenění, s/t = Pokec,
// d/e = Domluva, g = Dárky, p = Hushki pikant (číslo = pořadí, pNN → NN, 1–20 jako kostka D20).
import type { Gender } from '../lib/backend';
import { isEn } from '../lib/i18n';

export interface Sticker { id: string; label: string; fallback: string }
export type TabId = 'pokec' | 'domluva' | 'oceneni' | 'darky' | 'pikant';
export interface StickerTab { id: TabId; title: string; stickers: Sticker[] }

const s = (id: string, label: string, fallback: string): Sticker => ({ id, label, fallback });
const series = (prefix: string, labels: [string, string][], from = 1) => labels.map(([l, f], i) => s(prefix + String(i + from).padStart(2, '0'), l, f));

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
// Druhá sada (16–30), obrázky dodá zákazník.
const OCENENI_2: [string, string][] = [
  ['Amazing', '🤩'], ['Perfect', '💯'], ['Bravo', '🎉'], ['Genius', '🧠'], ['Beautiful', '🌸'],
  ['Cutie', '🥹'], ['Respect', '🫡'], ['Thanks a lot', '💐'], ['Love it', '💜'], ['Sweetheart', '💗'],
  ['Kiss', '💋'], ['You rock', '🎸'], ['High five', '🙌'], ['Forgive me', '🥀'], ['Best day', '🌈'],
];
const SMALLTALK_2: [string, string][] = [
  ['Hey you', '😉'], ["What's up?", '😎'], ['Sleepy', '😴'], ['Happy', '😊'], ['Sad', '😢'],
  ['Grumpy', '😠'], ['At work', '💼'], ['Home', '🏠'], ['Lunch', '🥪'], ['Rainy day', '🌧️'],
  ['Thinking of you', '💭'], ['Yes', '✅'], ['No', '❌'], ['BRB', '⏱️'], ['Bye', '👋'],
];
const DOMLUVA_2: [string, string][] = [
  ['Now?', '❗'], ['Soon', '🔜'], ['Weekend', '🎉'], ['Dinner?', '🍝'], ['Movie night', '🍿'],
  ['Walk?', '🚶'], ['Your place', '🏡'], ['My place', '🛋️'], ['Pick me up', '🚗'], ['Running late', '⌛'],
  ['Almost there', '📍'], ["I'm here", '🙋'], ['Text me', '💬'], ["Can't wait", '🤩'], ['See you', '😘'],
];
const DARKY_2: [string, string][] = [
  ['Plyšák', '🧸'], ['Prsten', '💍'], ['Parfém', '🌸'], ['Šperk', '💎'], ['Jahody', '🍓'],
  ['Zmrzlina', '🍦'], ['Kafe s sebou', '☕'], ['Lístky do kina', '🎟️'], ['Kniha', '📖'], ['Svíčka', '🕯️'],
  ['Hvězda z nebe', '⭐'], ['Srdce v krabičce', '💝'], ['Polibek', '💋'], ['Výlet', '✈️'], ['Poukaz na masáž', '💆'],
];
// Třetí sada (31–45).
const OCENENI_3: [string, string][] = [
  ['Yesterday I liked it', '😉'], ['Last night was amazing', '🌙'], ['Thank you for last night', '💜'], ['Still smiling', '😊'], ['Again?', '🔁'],
  ['You made my day', '☀️'], ['Best night ever', '🌟'], ["You're hot", '🔥'], ['Crazy about you', '😵‍💫'], ['Lucky me', '🍀'],
  ['Number one', '🥇'], ["You're the one", '💘'], ['Nailed it', '🎯'], ['Grateful', '🙏'], ['All yours', '💝'],
];
const SMALLTALK_3: [string, string][] = [
  ['?', '❓'], ['!', '❗'], ['?!', '⁉️'], ['Really?', '🤨'], ['No way', '😲'],
  ['Me too', '🙋'], ['Oops', '🙊'], ['Please', '🥺'], ['Wait', '✋'], ['Yay', '🎉'],
  ['I know', '😌'], ['Good luck', '🍀'], ['Feel better', '🩹'], ['Too hot', '🥵'], ['Hello?', '📢'],
];
const DOMLUVA_3: [string, string][] = [
  ['When?', '📅'], ['Where?', '📍'], ['What time?', '🕗'], ['Shopping?', '🛍️'], ['Wine?', '🍷'],
  ['Bath?', '🛁'], ['Trip?', '🧳'], ['Gym?', '🏋️'], ["I'll cook", '🍳'], ['Pizza?', '🍕'],
  ['Stay in?', '🛋️'], ['Going out?', '🌃'], ['Get ready', '💄'], ["I'm home", '🏠'], ['Wait for me', '⏳'],
];
const DARKY_3: [string, string][] = [
  ['Tulipány', '🌷'], ['Slunečnice', '🌻'], ['Lilie', '🤍'], ['Pivoňky', '🌸'], ['Kopretiny', '🌼'],
  ['Levandule', '💜'], ['Orchidej', '🪻'], ['Pomněnky', '💙'], ['Sakura', '🌸'], ['Luční kytice', '💐'],
  ['Růže pod zvonem', '🌹'], ['Věneček', '🌺'], ['Box růží', '🌹'], ['Sukulent', '🪴'], ['Velká kytice', '💐'],
];
/** Univerzální ikony bez textu (pro vlastní pikantní vzkazy i běžné posílání). */
const UNI: [string, string][] = [['Šeptání', '🤫'], ['Vzdušný polibek', '😘'], ['Pod peřinou', '🛏️'], ['Zlatý klíček', '🗝️'], ['Žhavý pohled', '🔥']];
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
  ['Polibky', '💋'], ['Pomalý tanec', '💃'], ['Snídaně do postele', '🥐'], ['Pod hvězdami', '🌌'], ['Jackpot', '👑'],
  ['Šlehačka a jahody', '🍓'], ['Šampaňské', '🍾'], ['Pírko', '🪶'], ['Led', '🧊'], ['Nerušit', '🚪'],
  ['Zámek a klíč', '🔐'], ['Sprcha', '🚿'], ['Čokoláda', '🍫'], ['Podpatky', '👠'], ['Rtěnka na zrcadle', '💄'],
  ['Naše písnička', '🎶'], ['Celá noc', '🌙'], ['Maska', '🎭'], ['Hotel', '🏨'], ['Třešně', '🍒'],
];

const kluk = series('m', KLUK);
const holka = series('f', HOLKA);
const both = (prefix: string, a: [string, string][], b: [string, string][], c: [string, string][]) => [...series(prefix, a), ...series(prefix, b, 16), ...series(prefix, c, 31)];
const all = [
  ...both('o', OCENENI, OCENENI_2, OCENENI_3), ...both('r', OCENENI, OCENENI_2, OCENENI_3), ...both('s', SMALLTALK, SMALLTALK_2, SMALLTALK_3), ...both('t', SMALLTALK, SMALLTALK_2, SMALLTALK_3),
  ...both('d', DOMLUVA, DOMLUVA_2, DOMLUVA_3), ...both('e', DOMLUVA, DOMLUVA_2, DOMLUVA_3), ...kluk, ...holka, ...both('g', DARKY, DARKY_2, DARKY_3), ...series('p', PIKANT),
  ...series('u', UNI), ...series('v', UNI),
];
export const STICKERS = new Map(all.map((x) => [x.id, x] as const));
const pick = (ids: string[]) => ids.map((id) => STICKERS.get(id)!);
const range = (prefix: string, n = 45) => Array.from({ length: n }, (_, i) => prefix + String(i + 1).padStart(2, '0'));

/** Názvy záložek (pořadí podle používanosti). */
const TAB_TITLES: Record<TabId, [string, string]> = {
  pokec: ['Pokec', 'Chat'], domluva: ['Domluva', 'Plans'], oceneni: ['Ocenění', 'Praise'], darky: ['Dárky', 'Gifts'], pikant: ['Hushki pikant', 'Hushki spicy'],
};
export const tabTitle = (id: TabId) => TAB_TITLES[id][isEn() ? 1 : 0];

export const sexOf = (g: Gender): 'muz' | 'zena' => (g === 'zena' ? 'zena' : 'muz');

/** Záložky podle pohlaví, seřazené od nejpoužívanějších. Kdo pohlaví neuvedl, dostane mužskou sadu. */
export function tabsFor(gender: Gender): StickerTab[] {
  const f = sexOf(gender) === 'zena';
  const old = f ? holka : kluk;
  const pokec = range(f ? 't' : 's');
  return [
    { id: 'pokec', title: 'Pokec', stickers: [...pick(pokec.slice(30, 33)), ...pick(range(f ? 'v' : 'u', 5)), ...pick([...pokec.slice(0, 30), ...pokec.slice(33)])] },
    { id: 'domluva', title: 'Domluva', stickers: pick(range(f ? 'e' : 'd')) },
    { id: 'oceneni', title: 'Ocenění', stickers: [...pick(range(f ? 'r' : 'o')), ...old] },
    { id: 'darky', title: 'Dárky', stickers: pick(range('g')) },
    { id: 'pikant', title: 'Hushki pikant', stickers: pick(range('p', PIKANT.length)) },
  ];
}

/** Číslo pikantní samolepky (p08 → 8), jinak null. */
export const pikantNumber = (id: string) => (/^p\d+$/.test(id) ? Number(id.slice(1)) : null);
export const pikantId = (n: number) => 'p' + String(n).padStart(2, '0');
export const PIKANT_COUNT = PIKANT.length;
/** Kostka zůstává D20 (1–20); vyšší čísla se posílají z nabídky. */
export const DICE_MAX = 20;
/** Univerzální ikony bez textu podle pohlaví (u = kluk, v = holka). */
export const UNI_IDS = [...range('u', 5), ...range('v', 5)];


export const stickerSrc = (id: string) => `${import.meta.env.BASE_URL}stickers/${id}.webp`;
