import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
// Prefixo de subpasta proposital: o build precisa funcionar fora da raiz do domínio.
export const BASE_PATH = '/qualquer/pasta/';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    trace: 'retain-on-failure',
    // A interface segue o idioma do navegador (F4.6): os testes rodam em português, salvo os de
    // idioma, que trocam o locale.
    locale: 'pt-BR',
  },
  projects: [
    { name: 'computador', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  // Testa o build de produção (dist/), não o servidor de desenvolvimento.
  webServer: {
    command: `node scripts/serve-static.mjs dist ${BASE_PATH} ${PORT}`,
    url: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
  },
});
