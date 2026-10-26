// Gera os ícones PNG da aplicação instalável (F4.6) a partir de public/favicon.svg, com o
// Chromium do Playwright. Uso: node scripts/pwa/icones.mjs (grava em public/).
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf-8');
const out = (name) => new URL(`../../public/${name}`, import.meta.url).pathname;
// Ícone comum: o desenho ocupa o quadrado, sobre o branco. Ícone mascarável: o desenho dentro da
// zona segura (círculo de 80% do lado), sobre o fundo da aplicação.
const icons = [
  { name: 'icone-180.png', size: 180, inset: 0.06 },
  { name: 'icone-192.png', size: 192, inset: 0.06 },
  { name: 'icone-512.png', size: 512, inset: 0.06 },
  { name: 'icone-mascaravel-512.png', size: 512, inset: 0.2 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { name, size, inset } of icons) {
  await page.setViewportSize({ width: size, height: size });
  const pad = Math.round(size * inset);
  await page.setContent(
    `<html><body style="margin:0;background:#ffffff"><div style="width:${size}px;height:${size}px;box-sizing:border-box;padding:${pad}px">${svg.replace('<svg ', `<svg width="${size - 2 * pad}" height="${size - 2 * pad}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: out(name), omitBackground: false });
}
await browser.close();
