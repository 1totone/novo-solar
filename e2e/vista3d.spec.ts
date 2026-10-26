import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { decodeScreenshot } from './fixtures/pixels';

// F3.7: aba "Vista 3D". Brasília, fachada a 30°, janela de 2,00 × 1,00 m com brise de 0,60 m
// (prolongamentos de 0,30 m) e aleta à direita de 0,40 m.
const BASE = '#local=brasilia&o=30&aba=3d&jl=2&ja=1&pc1=b_0%2C6__0_0%2C3_0%2C3&pc2=ad_0%2C4';

async function ready(page: Page) {
  const canvas = page.getByTestId('view3d-canvas');
  await expect(canvas).toHaveAttribute('data-state', 'ready', { timeout: 30000 });
  return canvas;
}

/**
 * Fração do vidro em azul-escuro (sombra) entre os pixels de vidro, na vista de frente: conta os
 * pixels dentro do retângulo do vidro (com 3 px de folga nas bordas) que são da cor da sombra
 * (#08306b) ou do vidro ensolarado (#9ecae1); o raio do sol e as bordas suavizadas ficam de fora.
 */
async function pixelShadedFraction(page: Page) {
  const canvas = page.getByTestId('view3d-canvas');
  await canvas.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(200);
  const box = (await canvas.boundingBox())!;
  const [x0, y0, x1, y1] = (await canvas.getAttribute('data-window-rect'))!.split(',').map(Number);
  const img = decodeScreenshot(await canvas.screenshot());
  const scale = img.width / box.width;
  let shadow = 0;
  let glass = 0;
  for (let y = Math.ceil((y0! + 3) * scale); y < (y1! - 3) * scale; y++) {
    for (let x = Math.ceil((x0! + 3) * scale); x < (x1! - 3) * scale; x++) {
      const i = (y * img.width + x) * img.channels;
      const [r, g, b] = [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!];
      if (Math.abs(r - 0x08) < 20 && Math.abs(g - 0x30) < 20 && Math.abs(b - 0x6b) < 20) shadow++;
      else if (Math.abs(r - 0x9e) < 20 && Math.abs(g - 0xca) < 20 && Math.abs(b - 0xe1) < 20)
        glass++;
    }
  }
  return { fraction: shadow / (shadow + glass), counted: shadow + glass };
}

test.describe('aba Vista 3D (F3.7)', () => {
  test('o Three.js só é carregado quando a aba abre', async ({ page }) => {
    const chunks: string[] = [];
    page.on('request', (r) => {
      if (/scene3d-.*\.js$/.test(r.url())) chunks.push(r.url());
    });
    await page.goto(`./${BASE.replace('&aba=3d', '')}`);
    await expect(page.getByTestId('sun-chart')).toBeVisible();
    await page.waitForTimeout(500);
    expect(chunks).toEqual([]);
    const tab = page.getByRole('tab', { name: 'Vista 3D' });
    await expect(page.getByRole('tab')).toHaveText(['Carta solar', 'Vista 3D', 'Rosa dos ventos']);
    await tab.click();
    await expect(page).toHaveURL(/aba=3d/);
    await ready(page);
    expect(chunks).toHaveLength(1);
  });

  for (const [month, hour, label] of [
    [6, 15, '21 de junho, 15h00'],
    [3, 8, '21 de março, 8h00'],
    [3, 9, '21 de março, 9h00'],
  ] as const) {
    test(`a sombra em 3D bate com a fração ensolarada calculada (${label})`, async ({ page }) => {
      await page.goto(`./${BASE}&v3v=f&v3m=${month}&v3h=${hour}`);
      const canvas = await ready(page);
      await expect(page.getByTestId('view3d-status')).toContainText(label);
      const shaded = Number(await canvas.getAttribute('data-shaded'));
      expect(shaded).toBeGreaterThan(0.2);
      expect(shaded).toBeLessThan(0.95);
      const { fraction, counted } = await pixelShadedFraction(page);
      expect(counted).toBeGreaterThan(20000);
      expect(Math.abs(fraction - shaded), `pixels ${fraction}, cálculo ${shaded}`).toBeLessThan(
        0.02,
      );
      await expect(page.getByTestId('view3d-status')).toContainText(
        `${(shaded * 100).toFixed(1).replace('.', ',')}% da janela à sombra`,
      );
    });
  }

  test('sol atrás da fachada: vidro sem sombra; sem janela, pede o passo 6', async ({ page }) => {
    await page.goto(`./${BASE}&v3v=f&v3m=3&v3h=15`);
    const canvas = await ready(page);
    await expect(page.getByTestId('view3d-status')).toContainText('sol atrás da fachada');
    await expect(canvas).toHaveAttribute('data-shaded', '');
    const { fraction } = await pixelShadedFraction(page);
    expect(fraction).toBe(0);
    await page.goto('./#local=brasilia&aba=3d');
    await expect(page.getByTestId('view3d-needs-window')).toContainText('passo 6');
  });

  test('animar o dia muda a hora e a sombra; parar grava a hora no link; teclado e axe', async ({
    page,
  }) => {
    await page.goto(`./${BASE}&v3m=6&v3h=8`);
    await ready(page);
    const status = page.getByTestId('view3d-status');
    const before = await status.textContent();
    await page.getByTestId('view3d-play').click();
    await expect(page.getByTestId('view3d-play')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => status.textContent(), { timeout: 5000 }).not.toBe(before);
    await page.getByTestId('view3d-play').click();
    await expect(page).not.toHaveURL(/v3h=8(&|$)/);
    // Teclado: a hora anda com as setas no controle deslizante.
    const slider = page.getByTestId('view3d-hour');
    await slider.focus();
    const v = Number(await slider.inputValue());
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue(String(v + 0.25));
    await page.getByTestId('view3d-front').check();
    await expect(page).toHaveURL(/v3v=f/);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
