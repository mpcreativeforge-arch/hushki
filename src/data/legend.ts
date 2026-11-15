// Legenda pikantních čísel. Číslo = pořadí samolepky pNN.
// body = text, když ho posílá muž; body_zena = když žena (jinak se použije body).
import { isEn } from '../lib/i18n';

export interface LegendItem { n: number; title: string; body: string; body_zena?: string }

export const LEGEND: LegendItem[] = [
  { n: 1, title: 'Šátek', body: 'Dnes večer si vezmu šátek a zavážu ti oči. Ty se jen posadíš na postel a o zbytek se postarám já.', body_zena: 'Dnes večer si vezmu šátek a zavážu ti oči. Ty si jen lehneš a o zbytek se postarám já.' },
  { n: 2, title: 'Svíčky', body: 'Až přijdeš domů, bude zhasnuto a budou hořet jen svíčky. Nic neplánuj, večer patří nám dvěma.' },
  { n: 3, title: 'Pomalu', body: 'Mám chuť na večer, kdy nikam nespěcháme. Jen ty, já a spousta času.' },
  { n: 4, title: 'Koupel', body: 'Napustím nám vanu. Ty doneseš sebe, o všechno ostatní je postaráno.' },
  { n: 5, title: 'Pravidla hry', body: 'Dnes večer platí jedno pravidlo: ty rozhoduješ a já poslouchám. Promysli si, co si přeješ.' },
  { n: 6, title: 'Bez slov', body: 'Celý večer spolu nepromluvíme ani slovo. Uvidíme, jak dlouho to vydržíš.' },
  { n: 7, title: 'Dárek', body: 'Na posteli tě bude čekat malý dárek. Otevři ho, až budu u tebe.' },
  { n: 8, title: 'Masáž', body: 'Dnes večer tě čeká masáž. Začnu u ramen a uvidíme, kam se dostanu.', body_zena: 'Dnes večer tě čeká masáž. Začnu u zad a uvidíme, kam se dostanu.' },
  { n: 9, title: 'Tři přání', body: 'Dnes večer máš tři přání. Napiš mi to první, až budeš mít chvilku.' },
  { n: 10, title: 'Kostky', body: 'Mám pro nás hru s kostkami. Pravidla ti vysvětlím až večer, prozradím jen, že prohrát se nedá.' },
  { n: 11, title: 'Hádanka', body: 'Mám na sobě něco, co jsi na mně ještě neviděla. Večer zjistíš co.', body_zena: 'Mám na sobě něco, co jsi na mně ještě neviděl. Večer zjistíš co.' },
  { n: 12, title: 'Rande doma', body: 'Dnes máme rande. Obleč si něco hezkého, uvařím a zbytek večera nech na mně.', body_zena: 'Dnes máme rande. Vezmi si tu košili, co mám ráda. Uvařím a zbytek večera nech na mně.' },
  { n: 13, title: 'Tvoje košile', body: 'Dnes večer chci, aby sis na sebe vzala jen moji košili. Nic víc.', body_zena: 'Dnes večer na sobě budu mít jen tvoji košili. Nic víc.' },
  { n: 14, title: 'Čekám', body: 'Čekám na tebe v posteli. Pospěš si, nebo začnu bez tebe.' },
  { n: 15, title: 'Krajka', body: 'Koupil jsem ti něco z krajky. Večer si to pro mě oblečeš?', body_zena: 'Koupila jsem si něco nového z krajky. Chceš to vidět, ještě než to ze mě sundáš?' },
  { n: 16, title: 'Polibky', body: 'Dnes večer tě budu líbat tak dlouho, dokud mě sama nezastavíš. Začnu na krku.', body_zena: 'Dnes večer tě budu líbat tak dlouho, dokud mě sám nezastavíš. Začnu na krku.' },
  { n: 17, title: 'Pomalý tanec', body: 'Pustím naši písničku a ztlumím světla. Jeden pomalý tanec a pak uvidíme, kam nás to zavede.' },
  { n: 18, title: 'Snídaně do postele', body: 'Zítra ráno nikam nevstávej. Snídani ti přinesu do postele a dezert budu já.' },
  { n: 19, title: 'Pod hvězdami', body: 'Vezmi deku a teplou mikinu. Dnes večer jdeme ven pod hvězdy, jen my dva a nikde nikdo.' },
  { n: 20, title: 'Jackpot', body: 'Padla dvacítka! Dnes večer ti splním jedno přání, ať je jakékoli. Stačí mi ho pošeptat.' },
];

const LEGEND_EN: LegendItem[] = [
  { n: 1, title: 'Blindfold', body: 'Tonight I’ll take a scarf and blindfold you. You just sit on the bed and I’ll take care of the rest.', body_zena: 'Tonight I’ll take a scarf and blindfold you. You just lie down and I’ll take care of the rest.' },
  { n: 2, title: 'Candles', body: 'When you get home, the lights will be off and only candles will be burning. Don’t plan anything, tonight belongs to us.' },
  { n: 3, title: 'Slowly', body: 'I’m in the mood for an evening with no rush. Just you, me and lots of time.' },
  { n: 4, title: 'Bath', body: 'I’ll run us a bath. You bring yourself, everything else is taken care of.' },
  { n: 5, title: 'Rules of the game', body: 'Tonight there is one rule: you decide and I obey. Think about what you wish for.' },
  { n: 6, title: 'No words', body: 'We won’t say a single word all evening. Let’s see how long you can last.' },
  { n: 7, title: 'Gift', body: 'A small gift will be waiting for you on the bed. Open it when I’m with you.' },
  { n: 8, title: 'Massage', body: 'Tonight you’re getting a massage. I’ll start at your shoulders and we’ll see how far I get.', body_zena: 'Tonight you’re getting a massage. I’ll start at your back and we’ll see how far I get.' },
  { n: 9, title: 'Three wishes', body: 'Tonight you have three wishes. Text me the first one when you have a moment.' },
  { n: 10, title: 'Dice', body: 'I have a dice game for us. I’ll explain the rules tonight, all I’ll say is that nobody can lose.' },
  { n: 11, title: 'Riddle', body: 'I’m wearing something you’ve never seen on me. You’ll find out what tonight.' },
  { n: 12, title: 'Date at home', body: 'We have a date tonight. Wear something nice, I’ll cook and leave the rest of the evening to me.', body_zena: 'We have a date tonight. Wear that shirt I love. I’ll cook and leave the rest of the evening to me.' },
  { n: 13, title: 'Your shirt', body: 'Tonight I want you to wear nothing but my shirt. Nothing else.', body_zena: 'Tonight I’ll be wearing nothing but your shirt. Nothing else.' },
  { n: 14, title: 'Waiting', body: 'I’m waiting for you in bed. Hurry up, or I’ll start without you.' },
  { n: 15, title: 'Lace', body: 'I bought you something lacy. Will you wear it for me tonight?', body_zena: 'I bought myself something new and lacy. Want to see it before you take it off me?' },
  { n: 16, title: 'Kisses', body: 'Tonight I’ll kiss you until you stop me yourself. I’ll start with your neck.' },
  { n: 17, title: 'Slow dance', body: 'I’ll put on our song and dim the lights. One slow dance and then we’ll see where it takes us.' },
  { n: 18, title: 'Breakfast in bed', body: 'Don’t get up tomorrow morning. I’ll bring you breakfast in bed, and I’ll be dessert.' },
  { n: 19, title: 'Under the stars', body: 'Grab a blanket and a warm hoodie. Tonight we’re going out under the stars, just the two of us and nobody else.' },
  { n: 20, title: 'Jackpot', body: 'You rolled a twenty! Tonight I’ll grant you one wish, whatever it is. Just whisper it to me.' },
];

/** Legenda v aktuálním jazyce. */
export const legend = () => (isEn() ? LEGEND_EN : LEGEND);

export const legendText = (item: LegendItem, senderFemale: boolean) => (senderFemale && item.body_zena) || item.body;
