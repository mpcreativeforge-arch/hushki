import { defineConfig, devices } from '@playwright/test';

// Kouřový test celé aplikace v demo režimu (bez serveru). Spouští se `npm test` po `npm run build`.
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: 0,
  use: { baseURL: 'http://localhost:4173/', trace: 'off', locale: 'cs-CZ' },
  projects: [
    { name: 'mobil', use: { ...devices['Pixel 7'] } },
    { name: 'pc', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: true },
});
