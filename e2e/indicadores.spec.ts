import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { svgColors } from './fixtures/pixels';

// F3.5: radiação direta bloqueada e admitida e comparação de alternativas, no passo 7. EPW sintético
// num local como Florianópolis: 15 °C até a linha 12 do dia e 25 °C da 13 em diante (manhãs frias,
// tardes quentes com o limiar de 20 °C; a hora das 12 às 13 h empata e fica neutra), DNI de
// 600 Wh/m² das 6 às 18 h. Fachada Norte, janela de 1,50 × 1,20 m.
const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';
const BASE = '#local=florianopolis&o=0&jl=1%2C5&ja=1%2C2&cm=l&tf=20&tq=20';

async function load(page: Page, hash: string) {
  await page.goto(`./${hash}`);
  await page.getByLabel('Ou carregue um arquivo climático (EPW ou CSV do SOL-AR)').setInputFiles({
    name: 'manha-fria.epw',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      syntheticEpw(
        FLORIPA,
        (_m, _d, h) => (h <= 12 ? 15 : 25),
        'Teste do F3.5',
        (_m, _d, h) => (h >= 7 && h <= 18 ? 600 : 0),
      ),
    ),
  });
  await expect(page.getByTestId('site-info')).toContainText('manha-fria.epw');
  const panel = page.getByTestId('effect-panel');
  if ((await panel.locator('details').first().getAttribute('open')) === null) {
    await panel.locator('summary').first().click();
  }
  return panel;
}

const num = (text: string) => Number(text.replace('%', '').replace(',', '.'));

/** Bloqueada e admitida (%) de uma linha da tabela das alternativas. */
async function percentages(page: Page, row: string) {
  const cells = await page
    .getByTestId('alternatives-table')
    .locator(`tr[data-row="${row}"] td`)
    .allTextContents();
  return cells.map(num);
}

test.describe('passo 7: indicadores e alternativas (F3.5)', () => {
  test('sem peça no passo 6, pede a proteção; com o brise, os indicadores batem com a tabela', async ({
    page,
  }) => {
    await load(page, BASE);
    await expect(page.getByTestId('indicators-needs-geometry')).toBeVisible();
    await load(page, `${BASE}&pc1=b_0%2C3`);
    const tiles = page.getByTestId('indicator-tiles');
    await expect(tiles).toBeVisible({ timeout: 20000 });
    // Percentuais dos quadros = somas da tabela por classe (kWh/m², uma casa).
    const rowOf = async (c: string) =>
      (
        await page
          .getByTestId('indicators-table')
          .locator(`tr[data-class="${c}"] td`)
          .allTextContents()
      ).map(num);
    const [hotIncident, , hotBlocked] = await rowOf('hot');
    const [coldIncident, coldAdmitted] = await rowOf('cold');
    const blocked = num(
      (await page.getByTestId('indicator-blockedInHot').locator('.tile-value').textContent())!,
    );
    const admitted = num(
      (await page.getByTestId('indicator-admittedInCold').locator('.tile-value').textContent())!,
    );
    expect(blocked).toBeCloseTo((100 * hotBlocked!) / hotIncident!, 0);
    expect(admitted).toBeCloseTo((100 * coldAdmitted!) / coldIncident!, 0);
    expect(blocked).toBeGreaterThan(0);
    expect(admitted).toBeLessThan(100);
    // Sem proteção: nada bloqueado, tudo admitido.
    expect(await percentages(page, 'sem')).toEqual([0, 100]);
    await expect(page.getByTestId('alternative-status-sem')).toHaveText('não superada');
    await expect(page.getByTestId('indicators-section')).toContainText('Só a radiação direta');
  });

  test('a aleta a oeste supera o brise sozinho: mesma parte admitida nas frias, mais bloqueada', async ({
    page,
  }) => {
    await load(page, `${BASE}&pc1=b_0%2C3`);
    await expect(page.getByTestId('indicator-tiles')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('alternative-name').fill('Brise');
    await page.getByTestId('alternative-save').click();
    await expect(page).toHaveURL(/alter1=Brise%7C1%2C5%7C1%2C2%7C%7Cb_0%2C3/);
    await expect(page.getByTestId('indicators-section')).toContainText(
      'A proteção atual já está guardada como "Brise"',
    );

    // Aleta à esquerda de quem está dentro olhando para o Norte: a oeste. De manhã (horas frias,
    // antes do meio-dia solar, 12h14 em hora legal) o sol vem do leste, e a sombra dela cai fora
    // da janela.
    await page.getByTestId('piece-add-type').selectOption('ae');
    await page.getByTestId('piece-add').click();
    await expect(page).toHaveURL(/pc2=ae_/);
    await expect(page.getByTestId('alternative-status-alter1')).toHaveText(
      'superada por Atual (não guardada)',
      { timeout: 20000 },
    );
    const [blockedBrise, admittedBrise] = await percentages(page, 'alter1');
    const [blockedBoth, admittedBoth] = await percentages(page, 'atual');
    expect(admittedBoth).toBe(admittedBrise);
    expect(blockedBoth).toBeGreaterThan(blockedBrise!);

    await page.getByTestId('alternative-name').fill('Brise e aleta');
    await page.getByTestId('alternative-save').click();
    await expect(page).toHaveURL(/alter2=Brise\+e\+aleta/);
    await expect(page.getByTestId('alternative-status-alter1')).toHaveText(
      'superada por Brise e aleta',
    );
    await expect(page.getByTestId('alternative-status-alter2')).toHaveText('não superada');

    // Gráfico: superada vazada (centro branco), não superada cheia (azul-petróleo), cada uma no
    // ponto dos seus percentuais.
    const plot = page.getByTestId('alternatives-plot');
    await plot.evaluate((el) => el.scrollIntoView({ block: 'end' }));
    const centers = await plot.evaluate((svg) =>
      Array.from(svg.querySelectorAll('g[data-point] circle')).map((c) => ({
        id: c.parentElement!.getAttribute('data-point')!,
        x: Number(c.getAttribute('cx')),
        y: Number(c.getAttribute('cy')),
      })),
    );
    const at = (id: string) => centers.find((c) => c.id === id)!;
    expect(at('alter1').x).toBeCloseTo(40 + (admittedBrise! / 100) * 246, 0);
    expect(at('alter1').y).toBeCloseTo(190 - (blockedBrise! / 100) * 178, 0);
    const [hollow, filled] = await svgColors(plot, [at('alter1'), at('alter2')], 0.4);
    expect(hollow![0] > 240 && hollow![1] > 240 && hollow![2] > 240, `superada: ${hollow}`).toBe(
      true,
    );
    expect(filled![0] < 60 && filled![2] - filled![0] > 60, `não superada: ${filled}`).toBe(true);

    // Usar a primeira no passo 6 tira a aleta; remover renumera as alternativas.
    await page.getByTestId('alternative-use-alter1').click();
    await expect(page).toHaveURL(/pc1=b_0%2C3/);
    expect(page.url()).not.toMatch(/pc2=/);
    await page.getByTestId('alternative-remove-alter1').click();
    await expect(page).toHaveURL(/alter1=Brise\+e\+aleta/);
    expect(page.url()).not.toMatch(/alter2=/);
  });

  test('teclado e acessibilidade (axe) com indicadores, tabela e gráfico', async ({ page }) => {
    const hash = `${BASE}&pc1=b_0%2C3&alter1=${encodeURIComponent('Brise maior|1,5|1,2||b_0,8')}`;
    await load(page, hash);
    await expect(page.getByTestId('alternatives-plot')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('alternative-name').focus();
    await page.keyboard.type('Atual');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('alternative-save')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/alter2=Atual/);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
