import { expect, test, type Page } from '@playwright/test';

const pin = async (p: Page, digits: string) => {
  for (const d of digits) await p.locator('.key', { hasText: new RegExp(`^${d}$`) }).last().click();
};

test('registrace, místnost, samolepka, pikant, Legenda a angličtina', async ({ page: p }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript(() => sessionStorage.setItem('hushki.install-seen', '1'));
  await p.goto('/');
  await p.locator('.splash').click(); // úvod jde přeskočit ťuknutím
  await expect(p.locator('.splash')).toHaveCount(0);

  // úvodní karty
  await expect(p.getByRole('heading', { name: 'Jen samolepky, jen vy dva' })).toBeVisible();
  await p.getByRole('button', { name: 'Další' }).click();
  await p.getByRole('button', { name: 'Další' }).click();
  await p.getByRole('button', { name: 'Začít' }).click();

  // registrace: jen e-mail a heslo
  await p.getByLabel('E-mail').fill('test@example.com');
  await p.getByLabel('Heslo', { exact: true }).fill('heslo12345');
  await p.getByRole('button', { name: 'Vytvořit účet' }).click();
  await expect(p.locator('.consent input[type=checkbox]')).toHaveCount(2);
  for (const c of await p.locator('.consent input[type=checkbox]').all()) await c.check();
  await p.getByRole('button', { name: 'Souhlasím a pokračuji' }).click();

  // místnost a PIN
  await p.getByRole('button', { name: 'Vytvořit kód' }).click();
  await expect(p.getByRole('button', { name: /Poslat pozvánku/ })).toBeVisible();
  await p.getByRole('button', { name: 'Pokračovat' }).click();
  await pin(p, '1234');
  await pin(p, '1234');

  // identita: jen HE / SHE (bez jména)
  await expect(p.getByLabel(/Jak ti má/)).toHaveCount(0);
  await p.getByRole('radio', { name: 'On', exact: true }).click();
  await p.getByRole('button', { name: 'Potvrdit' }).click();
  await expect(p.locator('.profile-step')).toHaveCount(0);

  // chat: demo partner se připojí a pošle uvítání
  await expect(p.locator('.picker-tabs')).toBeVisible();
  await expect(p.getByRole('tab').first()).toHaveText('Pokec');
  // bez Premium jdou ve vlastní sadě upravit 2 přání, u třetího vyskočí nabídka Premium
  await p.getByRole('button', { name: 'Legenda' }).first().click();
  await p.getByRole('tab', { name: 'Moje' }).click();
  await expect(p.getByText(/Zdarma můžeš upravit 2 přání \(zbývá 2\)/)).toBeVisible();
  for (const i of [0, 1]) {
    await p.locator('.legend-edit-btn').nth(i).click();
    await p.getByLabel('Popis').fill(`Moje vlastní přání ${i + 1}.`);
    await p.getByRole('button', { name: 'Uložit', exact: true }).click();
    await expect(p.getByText(`Moje vlastní přání ${i + 1}.`)).toBeVisible();
  }
  await p.locator('.legend-edit-btn').nth(2).click();
  await expect(p.getByText(/upravit kolik přání chceš/)).toBeVisible();
  await p.getByRole('button', { name: 'Teď ne' }).click();

  // samostatné nálepky na začátku Pokecu: IDEA, ?, !, Secret wish, Curious (zdarma)
  await expect(p.locator('.picker-grid .sticker-btn').first()).toHaveAttribute('aria-label', 'IDEA');
  await p.locator('.picker-grid .sticker-btn').nth(1).click();
  await expect(p.locator('.msg.mine').last()).toBeVisible();
  // štítek odesílatele nad vzkazem
  await expect(p.locator('.msg.mine .who-tag').last()).toHaveText('On');

  // otazník se psem (s31) je prémiový: bez Premium otevře nabídku, v demu se Premium zapne hned
  await expect(p.getByRole('button', { name: 'Samolepka s textem' })).toHaveCount(0);
  await p.getByRole('button', { name: '? (Premium)', exact: true }).click();
  await expect(p.getByRole('heading', { name: /Hushki Premium/ })).toBeVisible();
  await p.getByRole('button', { name: /ročně/ }).click();
  await expect(p.getByRole('heading', { name: /Hushki Premium/ })).toHaveCount(0);
  // s Premium korunky zmizí
  await expect(p.locator('.picker-grid .sticker-btn.locked')).toHaveCount(0);
  await p.locator('.picker-grid .sticker-btn').nth(2).click();
  await expect(p.locator('.msg.mine')).toHaveCount(2);
  // stav jen u posledního vlastního vzkazu, naposledy použité jako první záložka
  await expect(p.locator('.msg-status')).toHaveCount(1);
  await expect(p.getByRole('tab', { name: 'Naposledy použité' })).toBeVisible();

  // smazání vlastního vzkazu podržením
  const mine = await p.locator('.msg.mine').count();
  const box = (await p.locator('.msg.mine .bubble-wrap').last().boundingBox())!;
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up();
  await p.getByRole('button', { name: /Smazat/ }).click();
  await p.getByRole('button', { name: /Opravdu smazat/ }).click();
  await expect(p.locator('.msg.mine')).toHaveCount(mine - 1);

  // dva vzkazy od partnera, když chat není otevřený → jedna obálka
  await p.getByRole('tab', { name: 'Pokec' }).click();
  await p.locator('.picker-grid .sticker-btn').nth(2).click();
  await p.locator('.picker-grid .sticker-btn').nth(3).click();
  await p.getByRole('button', { name: 'Zpět na místnosti' }).click();
  await p.waitForTimeout(6000);
  await p.locator('.room').first().click();
  const group = p.locator('.sealed.group').last();
  await expect(group).toBeVisible();
  await group.click();
  await expect(p.locator('.sealed.group')).toHaveCount(0);

  // pikant: kostka a odeslání čísla
  await p.getByRole('tab', { name: /pikant/ }).click();
  await p.getByRole('button', { name: 'Hod kostkou' }).click();
  // tajné přání: vybrané číslo „padne“ na kostce
  await p.getByRole('button', { name: /Tajné přání/ }).click();
  await p.getByRole('group').getByRole('button', { name: '7', exact: true }).click();
  await p.screenshot({ path: 'test-results/kostka-prani.png' });
  await p.locator('button.d20').click();
  await expect(p.locator('.dice-result')).toHaveText('7');
  await p.getByRole('button', { name: 'Poslat toto číslo' }).click();
  await pin(p, '5678');
  await expect(p.locator('.msg.mine .num-badge').last()).toBeVisible();
  // druhé číslo: heslo místnosti je předvyplněné, stačí poslat
  const sent = await p.locator('.msg.mine .num-badge').count();
  await p.locator('.picker-grid .sticker-btn').nth(4).click();
  await p.getByRole('button', { name: /^Poslat číslo/ }).click();
  await expect(p.locator('.msg.mine .num-badge')).toHaveCount(sent + 1);

  // Legenda: dvě sady. V „Moje“ se upravuje vlastní sada (název + emoji), partner úpravu nevidí.
  await p.getByRole('button', { name: 'Legenda' }).first().click();
  await expect(p.getByRole('heading', { name: 'Legenda' })).toBeVisible();
  await p.getByRole('tab', { name: /Přijaté/ }).click();
  await expect(p.locator('.legend-edit-btn')).toHaveCount(0);
  await p.getByRole('tab', { name: 'Moje' }).click();
  await p.locator('.legend-edit-btn').first().click();
  await p.getByLabel('Název').fill('Naše tajemství');
  // ikony pro vlastní přání: HE vidí jen svou sadu
  await p.getByRole('tab', { name: /Samolepka/ }).click();
  await expect(p.getByRole('button', { name: 'High Heels' })).toBeVisible();
  await expect(p.getByRole('button', { name: 'Suit & Tie' })).toHaveCount(0);
  await p.getByRole('tab', { name: /Emoji/ }).click();
  await p.getByRole('button', { name: '🍓' }).click();
  await p.getByRole('button', { name: 'Uložit', exact: true }).click();
  await expect(p.getByText('1. Naše tajemství')).toBeVisible();
  // demo už má Premium zapnuté: přání jde upravit kolik chceš (bez Premium jen 2)
  await expect(p.getByText(/S Premium upravíš kolik přání chceš/)).toBeVisible();
  await p.locator('.legend-edit-btn').nth(1).click();
  await p.getByLabel('Popis').fill('Vlastní přání číslo dvě.');
  await p.getByRole('button', { name: 'Uložit', exact: true }).click();
  await expect(p.getByText('Vlastní přání číslo dvě.')).toBeVisible();
  await p.locator('.sheet-backdrop').click({ position: { x: 10, y: 10 } });
  // odeslané upravené přání nese text i ikonu ve vzkazu, bez štítku „upraveno“
  await p.locator('.picker-grid .sticker-btn').nth(2).click();
  await p.getByRole('button', { name: /^Poslat číslo/ }).click();
  await expect(p.locator('.msg.mine .sticker-fallback').last()).toHaveText('🍓');

  // kostka v Legendě umí padlé číslo rovnou poslat
  const dice = await p.locator('.msg.mine .dice-tag').count();
  await p.getByRole('button', { name: 'Legenda' }).first().click();
  await p.locator('.sheet').getByRole('button', { name: /Kostka/ }).click();
  await p.locator('button.d20').click();
  await expect(p.getByRole('button', { name: 'Ukázat v Legendě' })).toBeVisible();
  await p.getByRole('button', { name: 'Poslat toto číslo' }).click();
  await p.getByRole('button', { name: /^Poslat číslo/ }).click();
  await expect(p.locator('.msg.mine .dice-tag')).toHaveCount(dice + 1);

  // odpověď na přijatou samolepku ukáže náhled té samolepky
  // (podržení prstu je v emulaci mobilu nespolehlivé, gesto se ověřuje na PC)
  if (test.info().project.name !== 'mobil') {
    // počkat na odpověď dema, jinak nová zpráva posune seznam během podržení
    await p.waitForTimeout(5000);
    const theirs = p.locator('.msg.theirs .sticker-msg').last();
    await theirs.scrollIntoViewIfNeeded();
    const rb = (await theirs.boundingBox())!;
    await p.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
    await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up();
    await p.getByRole('button', { name: /Odpovědět/ }).click();
    const thumb = '.reply-quote :is(img.sticker, .sticker-fallback)';
    await expect(p.locator('.reply-bar ' + thumb)).toBeVisible();
    await p.getByRole('tab', { name: 'Pokec' }).click();
    await p.locator('.picker-grid .sticker-btn').nth(2).click();
    await expect(p.locator('.msg.mine').last().locator('.quote ' + thumb)).toBeVisible();
    await p.screenshot({ path: 'test-results/odpoved-nahled.png' });
  }

  // místnost jde smazat přímo ze seznamu
  await p.getByRole('button', { name: 'Zpět na místnosti' }).click();
  const rooms = await p.locator('.room').count();
  await p.getByRole('button', { name: 'Smazat místnost' }).first().click();
  await p.screenshot({ path: 'test-results/smazat-mistnost.png' });
  await p.getByRole('button', { name: 'Ano, smazat' }).click();
  await expect(p.locator('.room')).toHaveCount(rooms - 1);

  // přepnutí do angličtiny
  await p.getByRole('button', { name: 'Menu' }).click();
  await p.getByRole('radio', { name: 'EN' }).click();
  await expect(p.getByRole('button', { name: 'Settings' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('pozvánka odkazem vyplní kód a nabídne připojení', async ({ page: p }) => {
  await p.addInitScript(() => sessionStorage.setItem('hushki.install-seen', '1'));
  await p.goto('/#join=abcd-efgh-jkmn-pqrs');
  await p.locator('.splash').click();
  await expect(p.getByText(/Partner tě zve do Hushki/)).toBeVisible();
  expect(new URL(p.url()).hash).toBe(''); // kód nezůstane v adrese
  await p.getByLabel('E-mail').fill('pozvana@example.com');
  await p.getByLabel('Heslo', { exact: true }).fill('heslo12345');
  await p.getByRole('button', { name: 'Vytvořit účet' }).click();
  await expect(p.locator('.consent input[type=checkbox]')).toHaveCount(2);
  for (const c of await p.locator('.consent input[type=checkbox]').all()) await c.check();
  await p.getByRole('button', { name: 'Souhlasím a pokračuji' }).click();
  await expect(p.getByRole('heading', { name: /pozvánku/ })).toBeVisible();
  await expect(p.getByLabel('Párovací kód')).toHaveValue('ABCD-EFGH-JKMN-PQRS');
});
