# Hushki

Soukromé vzkazy pro páry. Webová aplikace (PWA), kterou si uživatel připne na plochu iPhonu nebo Androidu, bez App Store.

Jeden z partnerů napíše vzkaz, druhému přijde jen diskrétní upozornění („Máš nový vzkaz 🤫“) a obsah otevře až za svým PINem. Vzkazy jsou šifrované přímo v telefonu, server vidí jen zašifrovaná data.

## Co umí první verze

- Registrace a přihlášení (e-mail + heslo), pohlaví (muž / žena / nechci uvést)
- Párování dvou uživatelů tajným kódem
- Chat: nepřečtený vzkaz přijde jako zalepená obálka, otevře se klepnutím
- Odpovědi na vzkazy (klepni na bublinu → Odpovědět)
- Šifrované fotky (zmenšené na 1600 px, šifrované v telefonu, uložené v Supabase Storage)
- Samolepky Hushki (pánská a dámská sada, vlastní sada se nabízí první)
- Šifrované vzkazy (AES-GCM 256, Web Crypto) a zámek PINem (6 číslic), automatické zamčení po 30 s mimo aplikaci
- Nápady na vzkazy (šablony) z databáze, doplňují se bez aktualizace aplikace
- Tichá push upozornění bez obsahu (iOS 16.4+ po přidání na plochu)
- Gentleman mód (AI přepis přes Claude API): **připravený, ale vypnutý**
- Další funkce připravené jako neaktivní přepínače (viz `src/data/features.json`)
- **Demo režim**: bez nastaveného Supabase běží celá aplikace jen v prohlížeči se simulovaným partnerem

## Jak funguje šifrování

1. Při založení páru telefon vygeneruje 16znakový kód (`XXXX-XXXX-XXXX-XXXX`).
2. Z kódu se v telefonu odvodí klíč páru (PBKDF2, 310 000 iterací). Server dostane jen SHA-256 kódu (pro připojení partnera) a otisk klíče (pro kontrolu správnosti).
3. Partner zadá stejný kód, takže má stejný klíč.
4. Klíč je v zařízení uložený zašifrovaný klíčem odvozeným z PINu (PBKDF2, 600 000 iterací).
5. Vzkazy se šifrují AES-GCM před odesláním. Správce databáze vidí jen šifrovaný text.

Párovací kód je zároveň záloha. Bez něj nejde vzkazy otevřít na novém telefonu ani změnit zapomenutý PIN.
Pozor: Gentleman mód (až se zapne) posílá text k přepsání na server s AI nešifrovaně.

## Lokální vývoj

```bash
npm install
npm run dev          # demo režim, nebo s .env.local (viz .env.example) proti Supabase
npm run build
```

## Nastavení Supabase (účet klienta)

1. Na [supabase.com](https://supabase.com) založit účet a projekt (region EU, např. Frankfurt). Vývojáře pozvat do organizace.
2. **SQL Editor**: spustit postupně `supabase/migrations/0001_init.sql`, `0002_chat_photos.sql`, `0003_user_ideas.sql`, `0004_rooms.sql`, `0005_template_variants.sql` a pak `supabase/seed.sql`.
3. **Authentication → Providers → Email**: zapnuto. Pro testování lze vypnout „Confirm email“.
4. **Authentication → URL Configuration**: Site URL nastavit na adresu aplikace.
5. **Project Settings → API**: zkopírovat Project URL a `anon` klíč.
6. Push upozornění:
   ```bash
   npx web-push generate-vapid-keys
   supabase link --project-ref <ref>
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:info@hushki.cz
   supabase functions deploy notify
   ```

### Samolepky

Obrázky patří do `public/stickers/` jako `m01.png` až `m15.png` (pánská sada) a `f01.png` až `f15.png` (dámská sada), ideálně 256 × 256 s průhledným pozadím. Názvy a pořadí jsou v `src/data/stickers.ts`. Dokud obrázek chybí, zobrazí se náhradní emoji. Obsah vzkazu (text, fotka, samolepka i odpověď) se šifruje jako celek, takže server nepozná ani typ zprávy.

### Šablony nápadů

Tabulka `templates` (Table Editor v Supabase): `category` (`romantika` / `odvaha` / `hra` nebo nová), `title`, `body`, `sort`, `active`. Změny se v aplikaci projeví hned. Výchozí sada je v `src/data/templates.json` (`node scripts/seed-sql.mjs` z ní vygeneruje `supabase/seed.sql`).

### Přepínače funkcí

Tabulka `feature_flags`. `enabled = true` funkci zapne bez nového nasazení. Funkce, které jsou vypnuté, se v nastavení ukazují v části „Připravujeme“.

### Zapnutí Gentleman módu

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# volitelně: supabase secrets set GENTLEMAN_MODEL=claude-haiku-5-5
supabase functions deploy gentleman
```
Pak v `feature_flags` nastavit `gentleman` na `true`.

## Nasazení

**GitHub Pages (testovací adresa):** Settings → Pages → Source: *GitHub Actions*. Každý push do `main` nasadí aplikaci na `https://<uživatel>.github.io/hushki/`. Bez proměnných běží demo. Pro ostrý backend přidat v Settings → Secrets and variables → Actions → **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` (všechny jsou veřejné hodnoty).

**Vlastní doména (hushki.cz / hushki.app):** nastavit proměnnou `BASE_PATH` na `/`, doménu v Settings → Pages a DNS záznam podle návodu GitHubu. Nebo nasadit složku `dist` na libovolný statický hosting (Netlify, Cloudflare Pages, Vercel).

## Struktura

```
src/lib/crypto.ts      šifrování, párovací kód, zámek PINem
src/lib/backend.ts     Supabase + demo režim
src/lib/push.ts        push upozornění, service worker
src/screens/           obrazovky aplikace
src/data/              výchozí šablony a přepínače funkcí
public/sw.js           service worker (offline + push)
supabase/migrations/   databázové schéma s RLS
supabase/functions/    gentleman (Claude API), notify (Web Push)
```

## Ikona

`public/icons/` je vygenerovaná z kresleného psa Hushki. Pro výměnu stačí nahradit PNG soubory (180, 192, 512 a maskable 512).
