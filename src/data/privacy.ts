// Zásady ochrany osobních údajů. Při podstatné změně textu zvyš PRIVACY_VERSION,
// uživatelé pak souhlas uvidí znovu.
// Údaje v [hranatých závorkách] doplní provozovatel. Text je návrh, před spuštěním ho má zkontrolovat právník.

export const PRIVACY_VERSION = 1;
export const PRIVACY_UPDATED = '10. 11. 2026';

export const OPERATOR = {
  name: '[Název provozovatele / jméno a příjmení]',
  id: '[IČO]',
  address: '[Sídlo / adresa]',
  email: '[kontaktní e-mail]',
};

export interface PrivacySection { title: string; body: string[] }

export const PRIVACY_SUMMARY = [
  'Vzkazy, fotky a samolepky šifrujeme přímo v telefonu. Nikdo jiný než vy dva je nepřečte, ani my.',
  'Ukládáme jen to, co aplikace nutně potřebuje: e-mail, přezdívku, pohlaví a technické údaje o místnostech.',
  'Údaje neprodáváme a nepoužíváme k reklamě. Účet i všechna data můžeš kdykoli smazat v Nastavení.',
];

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: '1. Kdo údaje zpracovává',
    body: [
      `Správcem osobních údajů je ${OPERATOR.name}, IČO ${OPERATOR.id}, ${OPERATOR.address} (dále „my“). S čímkoli ohledně soukromí nám napiš na ${OPERATOR.email}.`,
      'Aplikace Hushki je určena jen osobám starším 18 let.',
    ],
  },
  {
    title: '2. Jaké údaje zpracováváme',
    body: [
      'Účet: e-mail, heslo (ukládá se jen v zahashované podobě), přezdívka a pohlaví, pokud ho uvedeš.',
      'Místnosti: kdo je s kým spojený, kdy byla místnost založena a nastavení jejího automatického smazání.',
      'Vzkazy: obsah vzkazů, fotek, samolepek a vlastních nápadů je zašifrovaný v tvém zařízení klíčem, který známe jen vy dva (vzniká z párovacího kódu). Na serveru je uložen jen jako nečitelná šifrovaná data. Vidíme pouze technická metadata: čas odeslání, odesílatele a zda byl vzkaz přečten.',
      'Upozornění: pokud je zapneš, ukládáme technickou adresu pro doručení push upozornění. Upozornění neobsahuje žádný obsah ani jméno, jen „Máš nový vzkaz“.',
      'V zařízení: zamčený klíč (chráněný tvým PINem) a nastavení zvuků a vibrací. Tyto údaje zůstávají jen v tvém telefonu.',
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
      'Supabase Inc. — databáze, přihlášení a úložiště (servery v EU, [region doplnit]). Ukládá i šifrovaná data vzkazů a fotek, která nedokáže přečíst.',
      'Poskytovatel hostingu webové aplikace ([doplnit]).',
      'Služby push upozornění Apple, Google nebo Mozilla — doručují jen obecné upozornění bez obsahu.',
      'Pokud v budoucnu zapneme volitelnou funkci Gentleman (úprava textu pomocí AI), text, který do ní sám vložíš, se odešle ke zpracování společnosti Anthropic. Funkce je vypnutá a před zapnutím tě na to upozorníme.',
      'Při předání mimo EU používáme standardní smluvní doložky schválené Evropskou komisí.',
    ],
  },
  {
    title: '5. Jak dlouho údaje uchováváme',
    body: [
      'Účet a profil do doby, než účet smažeš.',
      'Místnost a všechny její vzkazy a fotky do doby, než ji jeden z vás zruší, nebo než vyprší nastavené automatické smazání.',
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
    title: '7. Tvoje práva',
    body: [
      'Máš právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku. Souhlas můžeš kdykoli odvolat.',
      'Účet se všemi údaji smažeš sám v Nastavení → Smazat účet. Ostatní žádosti posílej na ' + OPERATOR.email + ', vyřídíme je do 30 dnů.',
      'Pokud se domníváš, že s údaji nakládáme špatně, můžeš podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).',
    ],
  },
  {
    title: '8. Změny zásad',
    body: [
      'Když zásady podstatně změníme, aplikace ti nové znění ukáže a požádá o potvrzení.',
    ],
  },
];
