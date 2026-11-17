import { expect, test, type Page } from '@playwright/test';

const pin = async (p: Page, digits: string) => {
  for (const d of digits) await p.locator('.key', { hasText: new RegExp(`^${d}$`) }).last().click();
};

test('registrace, místnost, samolepka, pikant, Legenda a angličtina', async ({ page: p }) => {
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

  // jméno a pohlaví až po spárování
  await p.getByLabel(/Jak ti má/).fill('Test');
  await p.getByRole('radio', { name: 'Muž' }).click();
  await p.getByRole('button', { name: 'Hotovo' }).click();
  await expect(p.locator('.profile-step')).toHaveCount(0);

  // chat: demo partner se připojí a pošle uvítání
  await expect(p.locator('.picker-tabs')).toBeVisible();
  await expect(p.getByRole('tab').first()).toHaveText('Pokec');
  await p.locator('.picker-grid .sticker-btn').nth(1).click();
  await expect(p.locator('.msg.mine').last()).toBeVisible();

  // otazník je prémiový: bez Premium otevře nabídku, v demu se Premium zapne hned
  await expect(p.getByRole('button', { name: 'Samolepka s textem' })).toHaveCount(0);
  await p.getByRole('button', { name: '? (Premium)', exact: true }).click();
  await expect(p.getByRole('heading', { name: /Hushki Premium/ })).toBeVisible();
  await p.getByRole('button', { name: /ročně/ }).click();
  await expect(p.getByRole('heading', { name: /Hushki Premium/ })).toHaveCount(0);
  // s Premium je otazník první samolepkou Pokecu
  await expect(p.locator('.picker-grid .sticker-btn').first()).toHaveAttribute('aria-label', '?');
  await p.getByRole('button', { name: '?', exact: true }).click();
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
  await p.locator('button.d20').click();
  await p.getByRole('button', { name: 'Poslat toto číslo' }).click();
  await pin(p, '5678');
  await expect(p.locator('.msg.mine .num-badge').last()).toBeVisible();
  // druhé číslo: heslo místnosti je předvyplněné, stačí poslat
  const sent = await p.locator('.msg.mine .num-badge').count();
  await p.locator('.picker-grid .sticker-btn').nth(4).click();
  await p.getByRole('button', { name: /^Poslat číslo/ }).click();
  await expect(p.locator('.msg.mine .num-badge')).toHaveCount(sent + 1);

  // Legenda a úprava čísla (název + emoji), ikona se propíše i do samolepky
  await p.getByRole('button', { name: 'Legenda' }).first().click();
  await expect(p.getByRole('heading', { name: 'Legenda' })).toBeVisible();
  // demo partner občas pošle zamčené číslo, to upravit nejde: vezmi první upravitelné
  const editBtn = p.locator('.legend-edit-btn').first();
  const num = (await editBtn.getAttribute('aria-label'))!.replace(/\D+/g, '');
  await editBtn.click();
  await p.getByLabel('Název').fill('Naše tajemství');
  await p.getByRole('button', { name: '🍓' }).click();
  await p.getByRole('button', { name: 'Uložit pro oba' }).click();
  await expect(p.getByText(`${num}. Naše tajemství`)).toBeVisible();
  await p.locator('.sheet-backdrop').click({ position: { x: 10, y: 10 } });

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
