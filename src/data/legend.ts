// Legenda pikantních čísel. Číslo = pořadí samolepky pNN.
// body = text, když ho posílá muž; body_zena = když žena (jinak se použije body).
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
];

export const legendText = (item: LegendItem, senderFemale: boolean) => (senderFemale && item.body_zena) || item.body;
