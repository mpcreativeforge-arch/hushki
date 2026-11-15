import { expect, test, type Page } from '@playwright/test';

const pin = async (p: Page, digits: string) => {
  for (const d of digits) await p.locator('.key', { hasText: new RegExp(`^${d}$`) }).last().click();
};

test('registrace, místnost, samolepka, pikant, Legenda a angličtina', async ({ page: p }) => {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript(() => localStorage.setItem('hushki.install-seen', '1'));
  await p.goto('/');
  await p.locator('.splash').click(); // úvod jde přeskočit ťuknutím
  await expect(p.locator('.splash')).toHaveCount(0);

  // registrace
  await p.getByLabel(/Jak ti má/).fill('Test');
  await p.getByRole('radio', { name: 'Muž' }).click();
  await p.getByLabel('E-mail').fill('test@example.com');
  await p.getByLabel('Heslo').fill('heslo12345');
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

  // chat: demo partner se připojí a pošle uvítání
  await expect(p.locator('.picker-tabs')).toBeVisible();
  await expect(p.getByRole('tab').first()).toHaveText('Pokec');
  await p.locator('.picker-grid .sticker-btn').nth(1).click();
  await expect(p.locator('.msg.mine').last()).toBeVisible();

  // pikant: kostka a odeslání čísla
  await p.getByRole('tab', { name: /pikant/ }).click();
  await p.getByRole('button', { name: 'Hod kostkou' }).click();
  await p.locator('button.d20').click();
  await p.getByRole('button', { name: 'Poslat toto číslo' }).click();
  await pin(p, '5678');
  await expect(p.locator('.msg.mine .num-badge').last()).toBeVisible();

  // Legenda
  await p.getByRole('button', { name: 'Legenda' }).first().click();
  await expect(p.getByRole('heading', { name: 'Legenda' })).toBeVisible();
  await p.locator('.sheet-backdrop').click({ position: { x: 10, y: 10 } });

  // přepnutí do angličtiny
  await p.getByRole('button', { name: 'Menu' }).click();
  await p.getByRole('radio', { name: 'EN' }).click();
  await expect(p.getByRole('button', { name: 'Settings' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('pozvánka odkazem vyplní kód a nabídne připojení', async ({ page: p }) => {
  await p.addInitScript(() => localStorage.setItem('hushki.install-seen', '1'));
  await p.goto('/#join=abcd-efgh-jkmn-pqrs');
  await p.locator('.splash').click();
  await expect(p.getByText(/Partner tě zve do Hushki/)).toBeVisible();
  expect(new URL(p.url()).hash).toBe(''); // kód nezůstane v adrese
  await p.getByLabel(/Jak ti má/).fill('Test');
  await p.getByRole('radio', { name: 'Žena' }).click();
  await p.getByLabel('E-mail').fill('pozvana@example.com');
  await p.getByLabel('Heslo').fill('heslo12345');
  await p.getByRole('button', { name: 'Vytvořit účet' }).click();
  await expect(p.locator('.consent input[type=checkbox]')).toHaveCount(2);
  for (const c of await p.locator('.consent input[type=checkbox]').all()) await c.check();
  await p.getByRole('button', { name: 'Souhlasím a pokračuji' }).click();
  await expect(p.getByRole('heading', { name: /pozvánku/ })).toBeVisible();
  await expect(p.getByLabel('Párovací kód')).toHaveValue('ABCD-EFGH-JKMN-PQRS');
});
