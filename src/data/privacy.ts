// Zásady ochrany osobních údajů (česky i anglicky). Při podstatné změně textu zvyš PRIVACY_VERSION,
// uživatelé pak souhlas uvidí znovu.
// Text je návrh, před spuštěním ho má zkontrolovat právník. Údaje v [hranatých závorkách] ještě chybí.
import { isEn } from '../lib/i18n';

export const PRIVACY_VERSION = 3;
const UPDATED = { cs: '15. 11. 2026', en: 15 + ' November 2026' };

/** Kontakty provozovatele. */
export const INFO_EMAIL = 'info@hushki.cz';
export const SUPPORT_EMAIL = 'support@hushki.cz';

export const OPERATOR = {
  name: 'Mgr.\u00a0Petr Baťa',
  id: '19629966',
  address: { cs: 'Podsedky 15, 625 00 Brno, Česká republika', en: 'Podsedky 15, 625 00 Brno, Czech Republic' },
  email: INFO_EMAIL,
};
export const operatorAddress = () => (isEn() ? OPERATOR.address.en : OPERATOR.address.cs);
/** Rok pro © v aplikaci. */
export const COPYRIGHT_YEAR = 2026;
export const APP_VERSION = '7.3';

export interface PrivacySection { title: string; body: string[] }

export const privacyUpdated = () => (isEn() ? UPDATED.en : UPDATED.cs);

const SUMMARY_CS = [
  'Vzkazy a samolepky šifrujeme přímo v telefonu. Nikdo jiný než vy dva je nepřečte, ani my.',
  'Ukládáme jen to, co aplikace nutně potřebuje: e-mail, přezdívku, pohlaví a technické údaje o místnostech. Zprávy se samy mažou 48 hodin po té poslední.',
  'Údaje neprodáváme a nepoužíváme k reklamě. V Nastavení si je můžeš kdykoli stáhnout nebo smazat celý účet.',
];
const SUMMARY_EN = [
  'Messages and stickers are encrypted on your phone. Nobody but the two of you can read them, not even us.',
  'We only store what the app strictly needs: e-mail, nickname, gender and technical room data. Messages delete themselves 48 hours after the last one.',
  'We never sell your data or use it for advertising. In Settings you can download it or delete your whole account at any time.',
];

const SECTIONS_CS: PrivacySection[] = [
  {
    title: '1. Kdo údaje zpracovává',
    body: [
      `Správcem osobních údajů a provozovatelem aplikace Hushki je ${OPERATOR.name}, IČO ${OPERATOR.id}, se sídlem ${OPERATOR.address.cs} (dále „my“). S čímkoli ohledně soukromí nám napiš na ${INFO_EMAIL}. S technickými potížemi pomůže ${SUPPORT_EMAIL}.`,
      'Aplikace Hushki je určena jen osobám starším 18 let.',
    ],
  },
  {
    title: '2. Jaké údaje zpracováváme',
    body: [
      'Účet: e-mail, heslo (ukládá se jen v zahashované podobě), přezdívka, pohlaví, pokud ho uvedeš, a datum souhlasu se zásadami.',
      'Místnosti: kdo je s kým spojený a kdy byla místnost založena.',
      'Vzkazy: obsah vzkazů, samolepek, popisků a hesel k pikantním číslům je zašifrovaný v tvém zařízení klíčem, který znáte jen vy dva (vzniká z párovacího kódu). Na serveru je uložen jen jako nečitelná šifrovaná data. Vidíme pouze technická metadata: čas odeslání, odesílatele a zda byl vzkaz přečten.',
      'Upozornění: pokud je zapneš, ukládáme technickou adresu pro doručení push upozornění. Upozornění neobsahuje žádný obsah ani jméno.',
      'V zařízení: zamčený klíč (chráněný tvým PINem), vlastní texty k samolepkám, odemčená čísla Legendy, heslo k Legendě této místnosti, jazyk a nastavení zvuků a vibrací. Tyto údaje zůstávají jen v tvém telefonu.',
    ],
  },
  {
    title: '3. Proč a na jakém základě',
    body: [
      'Abychom ti mohli poskytovat aplikaci, tedy plnit smlouvu (čl. 6 odst. 1 písm. b) GDPR): účet, místnosti, doručování vzkazů a upozornění.',
      'Obsah vzkazů se může týkat intimního života. Takový obsah nikdy nevidíme v čitelné podobě. Přesto ho zpracováváme jen na základě tvého výslovného souhlasu (čl. 9 odst. 2 písm. a) GDPR), který dáváš při registraci a můžeš ho kdykoli odvolat smazáním účtu.',
      'Ochrana a zabezpečení služby, oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR): základní technické záznamy nutné k provozu a odhalení zneužití.',
      'Nepoužíváme reklamní ani analytické nástroje třetích stran a údaje neprodáváme.',
    ],
  },
  {
    title: '4. Kdo další k údajům přistupuje',
    body: [
      'Supabase Inc.: databáze, přihlášení a úložiště (servery v EU, Irsko). Ukládá i šifrovaná data vzkazů, která nedokáže přečíst.',
      'Stripe Payments Europe, Ltd. (Irsko): platby za Hushki Premium. Údaje o kartě zadáváš přímo Stripe, my je nevidíme; od Stripe dostáváme jen e-mail, stav a dobu předplatného.',
      'Poskytovatel hostingu webové aplikace (Webglobe, s.r.o., Česká republika).',
      'Služby push upozornění Apple, Google nebo Mozilla: doručují jen obecné upozornění bez obsahu.',
      'Při předání mimo EU používáme standardní smluvní doložky schválené Evropskou komisí.',
    ],
  },
  {
    title: '5. Jak dlouho údaje uchováváme',
    body: [
      'Vzkazy: 48 hodin po posledním vzkazu v místnosti se všechny vzkazy v ní automaticky smažou.',
      'Místnost do doby, než ji jeden z vás zruší.',
      'Účet a profil do doby, než účet smažeš.',
      'Ze záloh se smazaná data odstraní nejpozději do [30] dnů.',
    ],
  },
  {
    title: '6. Zabezpečení',
    body: [
      'Vzkazy šifrujeme algoritmem AES-256-GCM. Klíč místnosti se odvozuje z párovacího kódu a v telefonu je zamčený tvým PINem. Spojení se serverem je šifrované (HTTPS).',
      'Párovací kód ani PIN neznáme a nedokážeme je obnovit. Když o kód přijdeš, staré vzkazy na novém zařízení už neotevřeš.',
    ],
  },
  {
    title: '7. Tvoje práva a jak je uplatnit',
    body: [
      'Máš právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku. Souhlas můžeš kdykoli odvolat.',
      'Přímo v aplikaci (Nastavení → Soukromí a moje údaje): opravíš přezdívku a pohlaví, stáhneš si kopii svých údajů (přístup a přenositelnost) a smažeš účet se všemi daty (výmaz a odvolání souhlasu).',
      `Ostatní žádosti posílej na ${INFO_EMAIL}, vyřídíme je do 30 dnů.`,
      'Pokud se domníváš, že s údaji nakládáme špatně, můžeš podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).',
    ],
  },
  {
    title: '8. Změny zásad',
    body: ['Když zásady podstatně změníme, aplikace ti nové znění ukáže a požádá o potvrzení.'],
  },
];

const SECTIONS_EN: PrivacySection[] = [
  {
    title: '1. Who processes your data',
    body: [
      `The data controller and operator of the Hushki app is ${OPERATOR.name}, company ID (IČO) ${OPERATOR.id}, registered at ${OPERATOR.address.en} (“we”). For anything about privacy write to ${INFO_EMAIL}. For technical problems contact ${SUPPORT_EMAIL}.`,
      'Hushki is intended only for people aged 18 and over.',
    ],
  },
  {
    title: '2. What data we process',
    body: [
      'Account: e-mail, password (stored only as a hash), nickname, gender if you provide it, and the date you accepted this policy.',
      'Rooms: who is connected with whom and when the room was created.',
      'Messages: the content of messages, stickers, captions and passwords for spicy numbers is encrypted on your device with a key only the two of you know (derived from the pairing code). The server stores it only as unreadable encrypted data. We only see technical metadata: time sent, sender and whether it was read.',
      'Notifications: if you turn them on, we store a technical address to deliver push notifications. A notification contains no content and no name.',
      'On your device: the locked key (protected by your PIN), your own sticker captions, unlocked Legend numbers, the Legend password for the room, language and sound and vibration settings. These stay on your phone only.',
    ],
  },
  {
    title: '3. Why and on what legal basis',
    body: [
      'To provide the app, i.e. to perform our contract with you (Art. 6(1)(b) GDPR): account, rooms, delivery of messages and notifications.',
      'Message content may relate to your intimate life. We never see it in readable form. Even so, we process it only with your explicit consent (Art. 9(2)(a) GDPR), given at sign-up, which you can withdraw at any time by deleting your account.',
      'Security of the service, legitimate interest (Art. 6(1)(f) GDPR): basic technical logs needed to run the service and detect abuse.',
      'We use no third-party advertising or analytics tools and we do not sell data.',
    ],
  },
  {
    title: '4. Who else has access',
    body: [
      'Supabase Inc.: database, sign-in and storage (servers in the EU, Ireland). It also stores encrypted message data it cannot read.',
      'Stripe Payments Europe, Ltd. (Ireland): payments for Hushki Premium. You enter card details directly with Stripe and we never see them; Stripe only tells us your e-mail and the status and term of your subscription.',
      'The web hosting provider (Webglobe, s.r.o., Czech Republic).',
      'Apple, Google or Mozilla push services: they deliver only a generic notification without content.',
      'For transfers outside the EU we use the European Commission’s standard contractual clauses.',
    ],
  },
  {
    title: '5. How long we keep data',
    body: [
      'Messages: 48 hours after the last message in a room, all its messages are deleted automatically.',
      'A room until one of you closes it.',
      'Account and profile until you delete your account.',
      'Deleted data is removed from backups within [30] days at the latest.',
    ],
  },
  {
    title: '6. Security',
    body: [
      'Messages are encrypted with AES-256-GCM. The room key is derived from the pairing code and locked on your phone with your PIN. The connection to the server is encrypted (HTTPS).',
      'We do not know your pairing code or PIN and cannot recover them. If you lose the code, you cannot open old messages on a new device.',
    ],
  },
  {
    title: '7. Your rights and how to use them',
    body: [
      'You have the right to access, rectify and erase your data, to restrict processing, to data portability and to object. You can withdraw consent at any time.',
      'Directly in the app (Settings → Privacy and my data): correct your nickname and gender, download a copy of your data (access and portability) and delete your account with all data (erasure and withdrawal of consent).',
      `Send any other request to ${INFO_EMAIL}; we will handle it within 30 days.`,
      'If you believe we handle your data incorrectly, you can complain to the Czech Office for Personal Data Protection (www.uoou.cz) or your local supervisory authority.',
    ],
  },
  {
    title: '8. Changes to this policy',
    body: ['If we change this policy substantially, the app will show you the new version and ask you to confirm it.'],
  },
];

export const privacySummary = () => (isEn() ? SUMMARY_EN : SUMMARY_CS);
export const privacySections = () => (isEn() ? SECTIONS_EN : SECTIONS_CS);
