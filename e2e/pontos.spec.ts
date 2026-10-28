import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { decodeScreenshot } from './fixtures/pixels';
import { openStep } from './fixtures/steps';

// Pontos marcados na carta (decisão 0051): clique, botão no toque ou digitados; até 3, numerados,
// com forma e número; tabela com altura, azimute, quando o sol passa e α e β do transferidor; no
// link, no projeto, na impressão e nas imagens; nas três projeções.

const RAD = Math.PI / 180;

/**
 * Posição na tela de uma direção do céu, pelas fórmulas da spec 03 (seções 3.1 e 3.5), a partir
 * do SVG da carta: estereográfica, equidistante ou cilíndrica centrada na normal da fachada.
 */
async function screenPoint(
  page: Page,
  altitude: number,
  azimuth: number,
  projection: 'stereographic' | 'equidistant' | 'cylindrical' = 'stereographic',
  center = 0,
) {
  const z = 90 - altitude;
  let x: number;
  let y: number;
  if (projection === 'cylindrical') {
    const psi = ((((azimuth - center + 180) % 360) + 360) % 360) - 180;
    x = psi / 180;
    y = -altitude / 90;
  } else {
    const r = projection === 'equidistant' ? z / 90 : Math.tan((z * RAD) / 2);
    x = r * Math.sin(azimuth * RAD);
    y = -r * Math.cos(azimuth * RAD);
  }
  return page
    .getByTestId('sun-chart')
    .first()
    .evaluate(
      (svg, q) => {
        const p = new DOMPoint(q.x, q.y).matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
        return { x: p.x, y: p.y };
      },
      { x, y },
    );
}

/** Cor do pixel (r, g, b) na tela. */
async function pixel(page: Page, x: number, y: number) {
  const img = decodeScreenshot(
    await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } }),
  );
  return [img.data[0]!, img.data[1]!, img.data[2]!];
}

const markers = (page: Page) => page.getByTestId('point-marker');
const marker = (page: Page, n: number) =>
  page.locator(`[data-testid="point-marker"][data-point="${n}"]`);
const rows = (page: Page) => page.getByTestId('points-row');

/** Valor de uma chave do '#'. */
const hashValue = (page: Page, key: string) =>
  page.evaluate((k) => new URLSearchParams(location.hash.slice(1)).get(k), key);

test.describe('computador', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse e teclado');

  test('clique marca até 3 pontos com forma e número; o quarto avisa; remover e limpar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('./#local=florianopolis&o=0');
    // Sem pontos, nada embaixo da carta.
    await expect(page.getByTestId('points-panel')).toBeAttached();
    expect((await page.getByTestId('points-panel').boundingBox())!.height).toBeLessThanOrEqual(1);
    const directions = [
      { altitude: 45, azimuth: 50 },
      { altitude: 33, azimuth: 346 },
      { altitude: 33, azimuth: 256 },
    ];
    for (const [i, d] of directions.entries()) {
      const p = await screenPoint(page, d.altitude, d.azimuth);
      await page.mouse.move(p.x, p.y);
      await expect(page.getByTestId('readout-mark-hint')).toHaveText(
        `Clique para marcar o ponto ${i + 1}.`,
      );
      await page.mouse.click(p.x, p.y);
      await expect(markers(page)).toHaveCount(i + 1);
      await expect(page.getByTestId('readout-mark-hint')).toHaveText(
        `Ponto ${i + 1} marcado aqui.`,
      );
    }
    // Forma de cada número: círculo, quadrado e losango, com o número dentro.
    for (const [n, shape] of [
      [1, 'circle'],
      [2, 'rect'],
      [3, 'polygon'],
    ] as const) {
      const m = marker(page, n);
      await expect(m.locator(shape)).toHaveCount(1);
      await expect(m.locator('text')).toHaveText(String(n));
    }
    // Pixels: no centro do marcador 1, o número (escuro); entre o número e a borda, o fundo branco;
    // na borda, o contorno escuro. O ponto da carta está no centro do marcador.
    await page.mouse.move(5, 5);
    const c = await screenPoint(page, 45, 50);
    const box = (await marker(page, 1).locator('circle').boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - c.x)).toBeLessThan(1.5);
    expect(Math.abs(box.y + box.height / 2 - c.y)).toBeLessThan(1.5);
    const white = await pixel(page, c.x - box.width * 0.26, c.y);
    expect(Math.min(...white)).toBeGreaterThan(235);
    const edge = await Promise.all([-1, 0, 1].map((d) => pixel(page, c.x, box.y + d)));
    expect(Math.min(...edge.map((rgb) => Math.max(...rgb)))).toBeLessThan(110);
    // O link guarda os três, com altura e azimute.
    expect(await hashValue(page, 'pm1')).toMatch(/^4[45](\.\d)?_(49|50)(\.\d)?$/);
    expect(await hashValue(page, 'pm3')).toMatch(/^3[23](\.\d)?_25[56](\.\d)?$/);
    // Tabela: 3 linhas na ordem dos números; o ponto atrás da fachada norte não tem α nem β.
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).nth(2).getByTestId('points-behind-cell')).toHaveText(
      'atrás da fachada',
    );
    await expect(page.getByTestId('points-reference')).toHaveText('α e β na referência interna');
    // O quarto clique avisa e não marca.
    const fourth = await screenPoint(page, 60, 120);
    await page.mouse.move(fourth.x, fourth.y);
    await expect(page.getByTestId('readout-mark-hint')).toHaveText(
      'Já há 3 pontos marcados: remova um para marcar outro.',
    );
    await page.mouse.click(fourth.x, fourth.y);
    await expect(page.getByTestId('points-status')).toHaveText(
      'Já há 3 pontos marcados: remova um para marcar outro.',
    );
    await expect(page.getByTestId('points-status')).toBeVisible();
    await expect(markers(page)).toHaveCount(3);
    // Remover o 2: o 3 continua 3, e o próximo ponto marcado ganha o 2.
    await page.getByRole('button', { name: 'Remover o ponto 2' }).click();
    await expect(markers(page)).toHaveCount(2);
    expect(await hashValue(page, 'pm2')).toBeNull();
    await expect(page.getByRole('button', { name: 'Remover o ponto 3' })).toBeFocused();
    await page.mouse.click(fourth.x, fourth.y);
    await expect(marker(page, 2)).toHaveCount(1);
    await expect(rows(page)).toHaveCount(3);
    // Limpar pontos tira todos, do link também.
    await page.getByRole('button', { name: 'Limpar pontos' }).click();
    await expect(markers(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(0);
    expect(await page.evaluate(() => location.hash)).toBe('#local=florianopolis&o=0');
  });

  test('o link reabre os pontos; α e β na referência do passo 3, para a fachada do passo 2', async ({
    page,
  }) => {
    // Fachada a 30°, ponto a 40° de altura e 60° de azimute: ψ = 30° (à direita).
    // tan α_ext = tan 40° / cos 30° → α_ext = 44,09°, α_int = 45,91°; β_ext = 30°, β_int = 60°.
    await page.goto('./#local=florianopolis&o=30&pm1=40_60&pm3=20_210');
    await expect(markers(page)).toHaveCount(2);
    await expect(rows(page)).toHaveCount(2);
    const first = rows(page).first();
    await expect(first.getByTestId('points-altitude-cell')).toHaveText('40°');
    await expect(first.getByTestId('points-azimuth-cell')).toHaveText('60° ENE');
    await expect(first.getByTestId('points-alpha-cell')).toHaveText('46°');
    await expect(first.getByTestId('points-beta-cell')).toHaveText('60° d');
    await expect(first.getByTestId('points-sun-cell')).toContainText('(hora solar)');
    await expect(rows(page).nth(1).getByTestId('points-behind-cell')).toBeVisible();
    // Referência externa: α_ext = 44°, β_ext = 30°.
    await openStep(page, '3');
    await page.getByRole('radio', { name: 'Externa' }).click();
    await expect(first.getByTestId('points-alpha-cell')).toHaveText('44°');
    await expect(first.getByTestId('points-beta-cell')).toHaveText('30° d');
    await expect(page.getByTestId('points-reference')).toHaveText('α e β na referência externa');
    // Outra fachada: o ponto passa para a esquerda da normal (ψ = 60° − 90° = −30°).
    await openStep(page, '2');
    await page.getByLabel('Orientação da fachada (azimute da normal externa)').fill('90');
    await expect(first.getByTestId('points-beta-cell')).toHaveText('30° e');
  });

  test('teclado: digitar altura e azimute (graus ou rumo), tabela navegável, axe', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0');
    const typeButton = page.getByTestId('points-type');
    // O botão de digitar aparece quando recebe o foco.
    await typeButton.focus();
    await expect(typeButton).toBeInViewport();
    await page.keyboard.press('Enter');
    // O formulário abre com o foco na altura.
    const altitude = page.getByRole('textbox', { name: /^Altura/ });
    await expect(altitude).toBeFocused();
    await altitude.fill('95');
    await page.getByRole('textbox', { name: /^Azimute/ }).fill('SE');
    await page.getByTestId('points-add').click();
    await expect(page.getByText('A altura vai de 0° a 90°.')).toBeVisible();
    await expect(markers(page)).toHaveCount(0);
    await altitude.fill('30,5');
    await page.getByTestId('points-add').click();
    await expect(markers(page)).toHaveCount(1);
    expect(await hashValue(page, 'pm1')).toBe('30.5_135');
    await expect(rows(page).first().getByTestId('points-azimuth-cell')).toHaveText('135° SE');
    await altitude.fill('50');
    await page.getByRole('textbox', { name: /^Azimute/ }).fill('20');
    await altitude.press('Enter');
    await expect(markers(page)).toHaveCount(2);
    await expect(page.getByTestId('points-status')).toHaveText('Ponto 2 marcado.');
    // Axe sem violações, com a tabela e o formulário à vista.
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
    // Tab chega aos botões de remover, na ordem dos pontos; Enter remove e o foco segue.
    await page.getByRole('button', { name: 'Limpar pontos' }).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Remover o ponto 1' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Remover o ponto 2' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(markers(page)).toHaveCount(0);
    await expect(typeButton).toBeFocused();
  });

  for (const [projection, code] of [
    ['equidistant', 'eq'],
    ['cylindrical', 'cil'],
  ] as const) {
    test(`projeção ${projection}: o marcador fica onde a leitura diz a mesma direção`, async ({
      page,
    }) => {
      await page.goto(`./#local=florianopolis&o=30&proj=${code}&pm1=40_60&pm2=15_250`);
      await expect(markers(page)).toHaveCount(2);
      for (const [n, altitude, azimuth] of [
        [1, 40, 60],
        [2, 15, 250],
      ] as const) {
        const p = await screenPoint(page, altitude, azimuth, projection, 30);
        const box = (await marker(page, n).locator('text').boundingBox())!;
        expect(Math.abs(box.x + box.width / 2 - p.x)).toBeLessThan(1.5);
        expect(Math.abs(box.y + box.height / 2 - p.y)).toBeLessThan(2.5);
        await page.mouse.move(p.x, p.y);
        await expect(page.getByTestId('readout-position')).toContainText(
          `Altura ${altitude}° · azimute ${azimuth}°`,
        );
        await expect(page.getByTestId('readout-mark-hint')).toHaveText(`Ponto ${n} marcado aqui.`);
      }
      // Um clique na carta marca o terceiro ponto nesta projeção também.
      const q = await screenPoint(page, 50, 0, projection, 30);
      await page.mouse.click(q.x, q.y);
      await expect(markers(page)).toHaveCount(3);
      expect(await hashValue(page, 'pm3')).toMatch(/^(49\.\d|50(\.\d)?)_(359\.\d|0(\.\d)?)$/);
    });
  }

  test('impressão e SVG: marcadores e tabela vão para a folha; a imagem leva os marcadores', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0&pm1=45_50&pm2=30_340');
    await expect(markers(page)).toHaveCount(2);
    await page.emulateMedia({ media: 'print' });
    await expect(markers(page).first()).toBeVisible();
    await expect(page.getByTestId('points-table')).toBeVisible();
    await expect(
      page.getByText('α e β na referência interna, para a fachada de 0° (N).'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Limpar pontos' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Remover o ponto 1' })).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await openStep(page, '5');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'SVG', exact: true }).click();
    const text = readFileSync(await (await download).path(), 'utf-8');
    expect(text).toContain('data-point="1"');
    expect(text).toContain('data-point="2"');
    expect(text).toMatch(/class="point-number"[^>]*style="[^"]*font-weight:\s*700/);
  });
});

test('toque: a leitura ganha "Marcar ponto"; tocar no botão marca; a carta deixa de ficar fixa', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'celular', 'toque');
  await page.goto('./#local=florianopolis&o=0');
  await page.getByTestId('sun-chart').scrollIntoViewIfNeeded();
  const p = await screenPoint(page, 45, 50);
  await page.touchscreen.tap(p.x, p.y);
  // Só tocar mostra a leitura, sem marcar (arrastar rola a página).
  await expect(page.getByTestId('chart-readout')).toBeVisible();
  await expect(markers(page)).toHaveCount(0);
  const section = page.locator('.chart-section');
  expect(await section.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
  const button = page.getByTestId('readout-mark');
  await expect(button).toHaveText('Marcar ponto');
  await button.tap();
  await expect(markers(page)).toHaveCount(1);
  await expect(page.getByTestId('chart-readout')).toHaveCount(0);
  expect(await hashValue(page, 'pm1')).toMatch(/^4[45](\.\d)?_(49|50)(\.\d)?$/);
  await expect(rows(page)).toHaveCount(1);
  expect(await section.evaluate((el) => getComputedStyle(el).position)).toBe('static');
  // Tocar em cima do marcador mostra a leitura dele, sem o botão.
  await page.touchscreen.tap(p.x, p.y);
  await expect(page.getByTestId('readout-mark-hint')).toHaveText('Ponto 1 marcado aqui.');
  await expect(page.getByTestId('readout-mark')).toHaveCount(0);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  await page.getByRole('button', { name: 'Limpar pontos' }).tap();
  await expect(markers(page)).toHaveCount(0);
  expect(await section.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
});
