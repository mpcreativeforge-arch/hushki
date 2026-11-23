// Legenda pikantních čísel (tajná přání). Číslo = pořadí samolepky pNN.
// Muž a žena mají každý vlastní sadu přání. Ženská sada je přeházená: na žádném čísle nemá stejné
// přání ani stejnou ikonu jako mužská, takže partner podle čísla a obrázku nepozná, co je z nabídky.
// Partner čte jen čísla, která mu přišla.
import { isEn } from '../lib/i18n';

export interface LegendItem { n: number; title: string; body: string; /** samolepka ikony, když se liší od pNN */ icon?: string }
export type Sex = 'muz' | 'zena';

const HE_CS: LegendItem[] = [
  { n: 1, title: 'Šátek', body: 'Dnes večer si vezmu šátek a zavážu ti oči. Ty se jen posadíš na postel a o zbytek se postarám já.' },
  { n: 2, title: 'Svíčky', body: 'Až přijdeš domů, bude zhasnuto a budou hořet jen svíčky. Nic neplánuj, večer patří nám dvěma.' },
  { n: 3, title: 'Pomalu', body: 'Mám chuť na večer, kdy nikam nespěcháme. Jen ty, já a spousta času.' },
  { n: 4, title: 'Koupel', body: 'Napustím nám vanu. Ty doneseš sebe, o všechno ostatní je postaráno.' },
  { n: 5, title: 'Pravidla hry', body: 'Dnes večer platí jedno pravidlo: ty rozhoduješ a já poslouchám. Promysli si, co si přeješ.' },
  { n: 6, title: 'Bez slov', body: 'Celý večer spolu nepromluvíme ani slovo. Uvidíme, jak dlouho to vydržíš.' },
  { n: 7, title: 'Dárek', body: 'Na posteli tě bude čekat malý dárek. Otevři ho, až budu u tebe.' },
  { n: 8, title: 'Masáž', body: 'Dnes večer tě čeká masáž. Začnu u ramen a uvidíme, kam se dostanu.' },
  { n: 9, title: 'Tři přání', body: 'Dnes večer máš tři přání. Napiš mi to první, až budeš mít chvilku.' },
  { n: 10, title: 'Kostky', body: 'Mám pro nás hru s kostkami. Pravidla ti vysvětlím až večer, prozradím jen, že prohrát se nedá.' },
  { n: 11, title: 'Hádanka', body: 'Mám na sobě něco, co jsi na mně ještě neviděla. Večer zjistíš co.' },
  { n: 12, title: 'Rande doma', body: 'Dnes máme rande. Obleč si něco hezkého, uvařím a zbytek večera nech na mně.' },
  { n: 13, title: 'Tvoje košile', body: 'Dnes večer chci, aby sis na sebe vzala jen moji košili. Nic víc.' },
  { n: 14, title: 'Čekám', body: 'Čekám na tebe v posteli. Pospěš si, nebo začnu bez tebe.' },
  { n: 15, title: 'Krajka', body: 'Koupil jsem ti něco z krajky. Večer si to pro mě oblečeš?' },
  { n: 16, title: 'Polibky', body: 'Dnes večer tě budu líbat tak dlouho, dokud mě sama nezastavíš. Začnu na krku.' },
  { n: 17, title: 'Pomalý tanec', body: 'Pustím naši písničku a ztlumím světla. Jeden pomalý tanec a pak uvidíme, kam nás to zavede.' },
  { n: 18, title: 'Snídaně do postele', body: 'Zítra ráno nikam nevstávej. Snídani ti přinesu do postele a dezert budu já.' },
  { n: 19, title: 'Pod hvězdami', body: 'Vezmi deku a teplou mikinu. Dnes večer jdeme ven pod hvězdy, jen my dva a nikde nikdo.' },
  { n: 20, title: 'Jackpot', body: 'Padla dvacítka! Dnes večer ti splním jedno přání, ať je jakékoli. Stačí mi ho pošeptat.' },
  { n: 21, title: 'Šlehačka a jahody', body: 'Mám doma jahody a šlehačku. Dnes večer je budeme ochutnávat spolu, pomalu a bez spěchu.' },
  { n: 22, title: 'Šampaňské', body: 'Dnes večer otevřu šampaňské jen pro nás dva. Připijeme si na nás a uvidíme, kam nás večer zavede.' },
  { n: 23, title: 'Pírko', body: 'Mám pírko a spoustu trpělivosti. Zavřeš oči a necháš mě hádat, kde jsi nejvíc lechtivý.' },
  { n: 24, title: 'Led', body: 'Dnes bude horko, tak si připravím kostky ledu. Ochladím tě tam, kde to budeš nejvíc potřebovat.' },
  { n: 25, title: 'Nerušit', body: 'Dnes večer vypínáme telefony a zamykáme dveře. Celý večer patří jen nám dvěma.' },
  { n: 26, title: 'Zámek a klíč', body: 'Schovám pro tebe malý klíček. Až ho najdeš, odemkneš mi jedno tajné přání.' },
  { n: 27, title: 'Sprcha', body: 'Večer si dáme společnou sprchu. Teplá voda, vůně a žádný spěch.' },
  { n: 28, title: 'Čokoláda', body: 'Mám rozpuštěnou čokoládu a chuť na sladké. Dnes večer budeš můj dezert.' },
  { n: 29, title: 'Podpatky', body: 'Dnes večer se pro tebe obleču tak, jak to máš nejradši. Ty jen sedni a dívej se.' },
  { n: 30, title: 'Rtěnka na zrcadle', body: 'Nechám ti vzkaz rtěnkou na zrcadle. Najdi ho a udělej přesně to, co v něm stojí.' },
  { n: 31, title: 'Naše písnička', body: 'Pustím naši písničku a ztlumím světla. Pak už se uvidí, co bude dál.' },
  { n: 32, title: 'Celá noc', body: 'Dnes nikam nespěcháme. Máme celou noc a nehodlám z ní promarnit ani minutu.' },
  { n: 33, title: 'Maska', body: 'Dnes večer si nasadíme masky a budeme si hrát na cizince, kteří se právě potkali.' },
  { n: 34, title: 'Hotel', body: 'Sbal si kartáček a něco hezkého na sebe. Jedna noc v hotelu, jen ty a já.' },
  { n: 35, title: 'Třešně', body: 'Mám misku třešní a jeden úkol: kdo udělá uzel ze stopky jazykem, vybírá, co bude dál.' },
];

const HE_EN: LegendItem[] = [
  { n: 1, title: 'Blindfold', body: 'Tonight I’ll take a scarf and blindfold you. You just sit on the bed and I’ll take care of the rest.' },
  { n: 2, title: 'Candles', body: 'When you get home, the lights will be off and only candles will be burning. Don’t plan anything, tonight belongs to us.' },
  { n: 3, title: 'Slowly', body: 'I’m in the mood for an evening with no rush. Just you, me and lots of time.' },
  { n: 4, title: 'Bath', body: 'I’ll run us a bath. You bring yourself, everything else is taken care of.' },
  { n: 5, title: 'Rules of the game', body: 'Tonight there is one rule: you decide and I obey. Think about what you wish for.' },
  { n: 6, title: 'No words', body: 'We won’t say a single word all evening. Let’s see how long you can last.' },
  { n: 7, title: 'Gift', body: 'A small gift will be waiting for you on the bed. Open it when I’m with you.' },
  { n: 8, title: 'Massage', body: 'Tonight you’re getting a massage. I’ll start at your shoulders and we’ll see how far I get.' },
  { n: 9, title: 'Three wishes', body: 'Tonight you have three wishes. Text me the first one when you have a moment.' },
  { n: 10, title: 'Dice', body: 'I have a dice game for us. I’ll explain the rules tonight, all I’ll say is that nobody can lose.' },
  { n: 11, title: 'Riddle', body: 'I’m wearing something you’ve never seen on me. You’ll find out what tonight.' },
  { n: 12, title: 'Date at home', body: 'We have a date tonight. Wear something nice, I’ll cook and leave the rest of the evening to me.' },
  { n: 13, title: 'Your shirt', body: 'Tonight I want you to wear nothing but my shirt. Nothing else.' },
  { n: 14, title: 'Waiting', body: 'I’m waiting for you in bed. Hurry up, or I’ll start without you.' },
  { n: 15, title: 'Lace', body: 'I bought you something lacy. Will you wear it for me tonight?' },
  { n: 16, title: 'Kisses', body: 'Tonight I’ll kiss you until you stop me yourself. I’ll start with your neck.' },
  { n: 17, title: 'Slow dance', body: 'I’ll put on our song and dim the lights. One slow dance and then we’ll see where it takes us.' },
  { n: 18, title: 'Breakfast in bed', body: 'Don’t get up tomorrow morning. I’ll bring you breakfast in bed, and I’ll be dessert.' },
  { n: 19, title: 'Under the stars', body: 'Grab a blanket and a warm hoodie. Tonight we’re going out under the stars, just the two of us and nobody else.' },
  { n: 20, title: 'Jackpot', body: 'You rolled a twenty! Tonight I’ll grant you one wish, whatever it is. Just whisper it to me.' },
  { n: 21, title: 'Whipped cream & strawberries', body: 'I have strawberries and whipped cream at home. Tonight we’ll taste them together, slowly and without hurry.' },
  { n: 22, title: 'Champagne', body: 'Tonight I’m opening champagne just for the two of us. A toast to us, and we’ll see where the night takes us.' },
  { n: 23, title: 'Feather', body: 'I have a feather and plenty of patience. Close your eyes and let me find where you’re most ticklish.' },
  { n: 24, title: 'Ice', body: 'It’s going to get hot tonight, so I’m getting some ice ready. I’ll cool you down exactly where you need it.' },
  { n: 25, title: 'Do not disturb', body: 'Tonight the phones go off and the door gets locked. The whole evening belongs to just the two of us.' },
  { n: 26, title: 'Lock & key', body: 'I’ll hide a little key for you. When you find it, it unlocks one of my secret wishes.' },
  { n: 27, title: 'Shower', body: 'Tonight we’re showering together. Warm water, nice scents and no rush.' },
  { n: 28, title: 'Chocolate', body: 'I have melted chocolate and a sweet tooth. Tonight you’re my dessert.' },
  { n: 29, title: 'Heels', body: 'Tonight I’ll dress up for you exactly the way you like it best. You just sit back and watch.' },
  { n: 30, title: 'Lipstick on the mirror', body: 'I’ll leave you a lipstick note on the mirror. Find it and do exactly what it says.' },
  { n: 31, title: 'Our song', body: 'I’ll put on our song and dim the lights. Then we’ll see what happens next.' },
  { n: 32, title: 'All night', body: 'No rush tonight. We have the whole night and I don’t plan to waste a minute of it.' },
  { n: 33, title: 'Mask', body: 'Tonight we put on masks and play strangers who have just met.' },
  { n: 34, title: 'Hotel', body: 'Pack a toothbrush and something nice to wear. One night in a hotel, just you and me.' },
  { n: 35, title: 'Cherries', body: 'I have a bowl of cherries and one challenge: whoever ties a stem in a knot with their tongue picks what happens next.' },
];

/** Sada přání pro ženu: stejné obrázky, vlastní přání. Muž je nikde neuvidí, dokud mu je nepošle. */
const SHE_CS: LegendItem[] = [
  { n: 1, title: 'Zavázané oči', body: 'Dnes večer ti zavážu oči a budeš jen hádat, kde se tě zrovna dotknu. Žádné podvádění.' },
  { n: 2, title: 'Při svíčkách', body: 'Zapálím svíčky a zhasnu všechno ostatní. Přijď, až budeš mít chuť zapomenout na celý den.' },
  { n: 3, title: 'Mazlení', body: 'Chci večer jen tak ležet v tvém náručí a nechat se hladit. Kam to dojde, nechám na tobě.' },
  { n: 4, title: 'Vana pro dva', body: 'Napustím vanu s pěnou a vezmu dvě skleničky. Místo vedle mě je jen pro tebe.' },
  { n: 5, title: 'Moje pravidla', body: 'Dnes večer se hraje podle mých pravidel. Prozradím ti je jedno po druhém, když budeš hodný.' },
  { n: 6, title: 'Psst', body: 'Dnes večer mluví jen ruce. Kdo první promluví, plní tomu druhému jedno přání.' },
  { n: 7, title: 'Překvapení', body: 'Schovala jsem pro tebe malé překvapení. Najdeš ho, až tě k němu sama dovedu.' },
  { n: 8, title: 'Vonný olej', body: 'Mám nový masážní olej s vůní, která se ti bude líbit. Lehni si na břicho a nech mě pracovat.' },
  { n: 9, title: 'Džin z lampy', body: 'Dnes jsem tvůj džin a plním tři přání. Jen pozor, to třetí si vyberu já.' },
  { n: 10, title: 'Hod kostkou', body: 'Hodíme si kostkou: sudé číslo vybírám já, liché ty. Hraje se, dokud nás to bude bavit.' },
  { n: 11, title: 'Tajemství', body: 'Mám pod šaty jedno tajemství. Celý den na něj budeš myslet, rozbalit ho můžeš až večer.' },
  { n: 12, title: 'Večeře u nás', body: 'Dnes vařím já, ty otevřeš víno. A na dezert se přesuneme do ložnice.' },
  { n: 13, title: 'Ranní košile', body: 'Ráno si půjčím tvoji košili a nic pod ní. Jestli ji chceš zpátky, musíš si pro ni přijít.' },
  { n: 14, title: 'Studené peřiny', body: 'Už ležím v posteli a je mi bez tebe zima. Přijď mě zahřát, čekám.' },
  { n: 15, title: 'Nové prádlo', body: 'Koupila jsem si nové prádlo a ještě ho nikdo neviděl. Večer ti udělám soukromou přehlídku.' },
  { n: 16, title: 'Pusy', body: 'Dnes ti vrátím všechny pusy, které jsi mi za celý týden dlužil. Začnu u krku a půjdu níž.' },
  { n: 17, title: 'Tanec pro tebe', body: 'Pustím hudbu a zatancuju ti. Ty sedíš, díváš se a ruce necháš u sebe, dokud neřeknu.' },
  { n: 18, title: 'Líné ráno', body: 'Zítra ráno se nikam nespěchá. Přines kafe do postele a pak už z ní nevylézej.' },
  { n: 19, title: 'Noční výlet', body: 'Vezmi deku a pojedeme někam, kde nejsou lidi, jen hvězdy. Zbytek vymyslíme na místě.' },
  { n: 20, title: 'Královna', body: 'Dnes jsem tvoje královna. Celý večer mi budeš plnit přání a já si jich vymyslím hodně.' },
  { n: 21, title: 'Jahody', body: 'Koupila jsem jahody a šlehačku. Tentokrát je nebudeme jíst z talíře.' },
  { n: 22, title: 'Bublinky', body: 'Vychladila jsem šampaňské. Jedna sklenička pro tebe, jedna pro mě a zbytek se uvidí.' },
  { n: 23, title: 'Lehký dotek', body: 'Mám pírko a chci zjistit, kde jsi nejvíc lechtivý. Zavři oči a nehýbej se.' },
  { n: 24, title: 'Ledové kostky', body: 'Připravila jsem led. Budu ho pomalu přejíždět po tvé kůži a uvidíme, jak dlouho vydržíš.' },
  { n: 25, title: 'Jen my', body: 'Telefony dnes večer zůstanou v šuplíku. Zamkni dveře, chci tě mít celého jen pro sebe.' },
  { n: 26, title: 'Klíček', body: 'Někde doma jsem schovala klíček. Kdo ho najde, ten dnes večer velí.' },
  { n: 27, title: 'Pootevřené dveře', body: 'Až půjdu do sprchy, nechám dveře pootevřené. Ber to jako pozvánku.' },
  { n: 28, title: 'Sladká tečka', body: 'Mám rozpuštěnou čokoládu a štětec. Dnes večer budeš moje plátno.' },
  { n: 29, title: 'Jen podpatky', body: 'Večer na sobě budu mít jen podpatky a úsměv. Zbytek nech na své fantazii.' },
  { n: 30, title: 'Vzkaz v koupelně', body: 'Na zrcadle v koupelně tě bude čekat vzkaz rtěnkou. Splň, co v něm stojí, a já splním to tvoje.' },
  { n: 31, title: 'Ploužák', body: 'Pustím naši písničku a chci se k tobě přitulit tak blízko, jak to jen jde.' },
  { n: 32, title: 'Do rána', body: 'Dnes se nespí. Mám pro tebe plán až do rána a jsem zvědavá, jestli mi stačíš.' },
  { n: 33, title: 'Neznámá', body: 'Dnes večer budu někdo jiný. Potkáme se jako dva cizinci a ty mě budeš muset sbalit.' },
  { n: 34, title: 'Útěk', body: 'Sbal si věci na jednu noc. Zamluvila jsem hotel a kde je, se dozvíš až cestou.' },
  { n: 35, title: 'Třešňová výzva', body: 'Mám misku třešní. Když zvládneš udělat uzel ze stopky jazykem, dostaneš odměnu, jakou si vybereš.' },
];

const SHE_EN: LegendItem[] = [
  { n: 1, title: 'Eyes closed', body: 'Tonight I’ll blindfold you and you’ll just have to guess where I’ll touch you next. No cheating.' },
  { n: 2, title: 'By candlelight', body: 'I’ll light the candles and turn everything else off. Come over when you feel like forgetting the whole day.' },
  { n: 3, title: 'Cuddles', body: 'Tonight I just want to lie in your arms and be stroked. Where it goes from there is up to you.' },
  { n: 4, title: 'Bath for two', body: 'I’ll run a bubble bath and bring two glasses. The spot next to me is yours only.' },
  { n: 5, title: 'My rules', body: 'Tonight we play by my rules. I’ll reveal them one by one, if you behave.' },
  { n: 6, title: 'Shh', body: 'Tonight only hands do the talking. Whoever speaks first grants the other one wish.' },
  { n: 7, title: 'Surprise', body: 'I’ve hidden a little surprise for you. You’ll find it when I lead you to it myself.' },
  { n: 8, title: 'Scented oil', body: 'I have a new massage oil with a scent you’ll love. Lie on your stomach and let me work.' },
  { n: 9, title: 'Genie in a lamp', body: 'Tonight I’m your genie and I grant three wishes. Careful though, I pick the third one.' },
  { n: 10, title: 'Roll the dice', body: 'Let’s roll a die: even numbers I choose, odd ones you do. We play as long as it’s fun.' },
  { n: 11, title: 'Secret', body: 'I’m hiding a secret under my dress. You’ll think about it all day, and you can unwrap it tonight.' },
  { n: 12, title: 'Dinner at ours', body: 'Tonight I’m cooking and you open the wine. Dessert will be served in the bedroom.' },
  { n: 13, title: 'Morning shirt', body: 'In the morning I’ll borrow your shirt with nothing underneath. If you want it back, come and get it.' },
  { n: 14, title: 'Cold sheets', body: 'I’m already in bed and it’s cold without you. Come and warm me up, I’m waiting.' },
  { n: 15, title: 'New lingerie', body: 'I bought new lingerie and nobody has seen it yet. Tonight you get a private fashion show.' },
  { n: 16, title: 'Kisses', body: 'Tonight I’m paying back all the kisses you owe me from this week. I’ll start at your neck and work my way down.' },
  { n: 17, title: 'A dance for you', body: 'I’ll put on some music and dance for you. You sit, watch and keep your hands to yourself until I say so.' },
  { n: 18, title: 'Lazy morning', body: 'No rush tomorrow morning. Bring coffee to bed and then don’t get out of it.' },
  { n: 19, title: 'Night trip', body: 'Grab a blanket and let’s drive somewhere with no people, just stars. We’ll figure out the rest there.' },
  { n: 20, title: 'Queen', body: 'Tonight I’m your queen. You’ll grant my wishes all evening, and I’ll think of plenty.' },
  { n: 21, title: 'Strawberries', body: 'I bought strawberries and whipped cream. This time we won’t be eating them off a plate.' },
  { n: 22, title: 'Bubbles', body: 'I’ve chilled the champagne. One glass for you, one for me, and we’ll see about the rest.' },
  { n: 23, title: 'Light touch', body: 'I have a feather and I want to find out where you’re most ticklish. Close your eyes and don’t move.' },
  { n: 24, title: 'Ice cubes', body: 'I’ve got the ice ready. I’ll slowly glide it over your skin and we’ll see how long you last.' },
  { n: 25, title: 'Just us', body: 'Tonight the phones stay in the drawer. Lock the door, I want you all to myself.' },
  { n: 26, title: 'Little key', body: 'I’ve hidden a little key somewhere at home. Whoever finds it is in charge tonight.' },
  { n: 27, title: 'Door ajar', body: 'When I take a shower, I’ll leave the door ajar. Take it as an invitation.' },
  { n: 28, title: 'Sweet finish', body: 'I have melted chocolate and a brush. Tonight you’re my canvas.' },
  { n: 29, title: 'Just heels', body: 'Tonight I’ll be wearing nothing but heels and a smile. Let your imagination do the rest.' },
  { n: 30, title: 'Bathroom note', body: 'A lipstick note will be waiting for you on the bathroom mirror. Do what it says and I’ll do what you want.' },
  { n: 31, title: 'Slow one', body: 'I’ll put on our song and I want to snuggle up to you as close as I can.' },
  { n: 32, title: 'Till morning', body: 'No sleeping tonight. I have plans for you until morning and I’m curious whether you can keep up.' },
  { n: 33, title: 'Stranger', body: 'Tonight I’ll be someone else. We’ll meet like two strangers and you’ll have to win me over.' },
  { n: 34, title: 'Escape', body: 'Pack for one night. I’ve booked a hotel and you’ll find out where on the way.' },
  { n: 35, title: 'Cherry challenge', body: 'I have a bowl of cherries. If you can tie a stem in a knot with your tongue, you get any reward you choose.' },
];

/**
 * Kam se ženské přání (a jeho obrázek pNN) přesune: 1–20 zůstávají v 1–20, 21–35 v 21–35 (Premium),
 * ale žádné číslo nezůstane na svém místě, takže se ženská a mužská sada nikde neshodují.
 */
const sheNumber = (k: number) => (k <= 20 ? ((k - 1) * 7 + 3) % 20 + 1 : 21 + ((k - 21) * 4 + 5) % 15);
const shuffled = (list: LegendItem[]) =>
  list.map((x) => ({ ...x, n: sheNumber(x.n), icon: 'p' + String(x.n).padStart(2, '0') })).sort((a, b) => a.n - b.n);
const SHE_CS_N = shuffled(SHE_CS);
const SHE_EN_N = shuffled(SHE_EN);

/** Sada přání podle pohlaví toho, kdo je posílá, v aktuálním jazyce. */
export const legend = (sex: Sex) => (sex === 'zena' ? (isEn() ? SHE_EN_N : SHE_CS_N) : (isEn() ? HE_EN : HE_CS));

/** Ikona čísla v nabídce dané sady (u ženy jiný obrázek než pNN), jinak undefined. */
export const nativeIcon = (sex: Sex, n: number) => (sex === 'zena' ? SHE_CS_N.find((x) => x.n === n)?.icon : undefined);
