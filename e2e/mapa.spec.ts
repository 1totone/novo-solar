import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { svgColors } from './fixtures/pixels';

// F3.3: mapa mês × hora da janela à sombra. Fachada norte em Florianópolis com um brise infinito
// rente à fachada (D = 0,8 m, e = 0,1 m acima da verga, janela de 1,50 × 1,20 m): o percentual
// só depende do ângulo de perfil α_p, f = (D · tan α_p − e) / H.
const URL = '#local=florianopolis&o=0&tr=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i';
const COLORS: [number, number, number][] = [
  [0xd4, 0xef, 0xf6],
  [0xa1, 0xd8, 0xe6],
  [0x70, 0xbd, 0xcf],
  [0x40, 0x9d, 0xb2],
  [0x06, 0x7e, 0x93],
  [0x00, 0x5b, 0x6d],
];

/**
 * Classe da cor (0 a 5) pela mais próxima da rampa, ou "sem-sol" para a hachura cinza sobre o
 * branco: as cores da rampa têm o azul pelo menos 34 acima do vermelho; a hachura (#8c959f e as
 * misturas dela com o branco), no máximo 19.
 */
function colorClass([r, g, b]: [number, number, number]): string {
  if (b - r < 25) return 'sem-sol';
  let best = -1;
  let dist = Infinity;
  COLORS.forEach(([cr, cg, cb], k) => {
    const d = Math.hypot(r - cr, g - cg, b - cb);
    if (d < dist) {
      dist = d;
      best = k;
    }
  });
  return dist < 30 ? String(best) : 'sem-sol';
}

async function waitForMap(page: Page) {
  const map = page.getByTestId('month-hour-map');
  await expect(map).toBeVisible({ timeout: 20000 });
  await expect(map).not.toHaveClass(/stale/);
  await expect(page.getByTestId('annual-pending')).toHaveCount(0);
  // No celular, a carta fixa ocupa o topo: o mapa vai para a parte de baixo da tela.
  await expect(page.getByTestId('shading-pending')).toHaveCount(0);
  await map.evaluate((el) => el.scrollIntoView({ block: 'end' }));
  return map;
}

/** Classe desenhada (atributo) e classe da cor no centro de cada célula. */
async function cells(map: Locator) {
  const rects = await map.evaluate((svg) =>
    Array.from(svg.querySelectorAll('rect[data-month]')).map((r) => {
      const b = (r as SVGRectElement).getBBox();
      return {
        month: Number(r.getAttribute('data-month')),
        hour: Number(r.getAttribute('data-hour')),
        cls: r.getAttribute('data-class')!,
        x: b.x + b.width / 2,
        y: b.y + b.height / 2,
      };
    }),
  );
  const colors = await svgColors(
    map,
    rects.map((r) => ({ x: r.x, y: r.y })),
    1,
  );
  return rects.map((r, i) => ({ ...r, pixel: colorClass(colors[i]!) }));
}

test.describe('mapa mês × hora da sombra (F3.3)', () => {
  test('células conhecidas, cor de todas as 288 células e tabela coerentes', async ({ page }) => {
    const workers: string[] = [];
    page.on('worker', (w) => workers.push(w.url()));
    await page.goto(`./${URL}`);
    const map = await waitForMap(page);
    expect(workers.some((u) => /annual\.worker/.test(u))).toBe(true);

    const all = await cells(map);
    expect(all).toHaveLength(288);
    const at = (month: number, hour: number) =>
      all.find((c) => c.month === month && c.hour === hour)!;
    // Junho, 12 a 13 h: sol ao norte a uns 39° (perfil igual à altura): f = (0,8 · tan 39° − 0,1)
    // / 1,2 ≈ 0,45, classe de 25 a 50%.
    expect(at(6, 13).cls).toBe('2');
    // Janeiro, 11 a 12 h: sol alto (perfil acima de 58,4°, o da curva de 100%): 100%.
    expect(at(1, 12).cls).toBe('5');
    // Junho, 17 a 18 h: sol baixo a noroeste; só no começo da hora o perfil passa de
    // atan(e / D) = 7,1°, e a sombra é pequena mas não nula (0,2%): classe de 0 a 25%.
    expect(at(6, 18).cls).toBe('1');
    // Dezembro, 7 a 8 h: sol a sudeste, atrás da fachada norte; junho, 2 a 3 h: noite.
    expect(at(12, 8).cls).toBe('sem-sol');
    expect(at(6, 3).cls).toBe('sem-sol');
    // A cor de cada célula é a da sua classe (e a hachura onde não há sol na janela).
    const wrong = all.filter((c) => c.pixel !== c.cls);
    expect(wrong.map((c) => `${c.month}/${c.hour}: ${c.cls} pintada como ${c.pixel}`)).toEqual([]);

    // Tabela: o número de cada célula (arredondado) cabe na classe desenhada.
    const table = page.getByTestId('annual-table');
    await page.getByText('Tabela do mapa').click();
    await expect(table).toBeVisible();
    const values = await table
      .locator('tbody tr')
      .evaluateAll((rows) =>
        rows.map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.textContent ?? '')),
      );
    const range: Record<string, [number, number]> = {
      '0': [0, 0],
      '1': [0, 25],
      '2': [25, 50],
      '3': [50, 75],
      '4': [75, 100],
      '5': [100, 100],
    };
    for (const c of all) {
      const text = values[c.month - 1]![c.hour - 1]!;
      if (c.cls === 'sem-sol') {
        expect(text, `${c.month}/${c.hour}`).toBe('');
        continue;
      }
      const v = Number(text);
      const [lo, hi] = range[c.cls]!;
      expect(v, `${c.month}/${c.hour}`).toBeGreaterThanOrEqual(lo);
      expect(v, `${c.month}/${c.hour}`).toBeLessThanOrEqual(hi);
    }
  });

  test('exportações: SVG do mapa, CSV do mapa e CSV hora a hora', async ({ page }) => {
    await page.goto(`./${URL}`);
    await waitForMap(page);

    let download = page.waitForEvent('download');
    await page.getByTestId('annual-export-csv').click();
    let file = await download;
    expect(file.suggestedFilename()).toBe('solar-florianopolis-sc-mapa-sombra.csv');
    const csv = readFileSync((await file.path())!, 'utf-8')
      .replace(/^\ufeff/, '')
      .trimEnd()
      .split('\n');
    expect(csv.filter((l) => l.startsWith('# '))).toHaveLength(6);
    expect(csv.some((l) => /# Fachada a 0°; janela de 1,50 × 1,20 m/.test(l))).toBe(true);
    const june = csv.find((l) => l.startsWith('jun,sombra_%'))!.split(',');
    expect(Number(june[2 + 12])).toBeGreaterThan(25);
    expect(Number(june[2 + 12])).toBeLessThanOrEqual(50);
    expect(csv.filter((l) => /^[a-z]{3},(sombra|sol_na_janela)_%/.test(l))).toHaveLength(24);

    download = page.waitForEvent('download');
    await page.getByTestId('annual-export-hourly').click();
    file = await download;
    expect(file.suggestedFilename()).toBe('solar-florianopolis-sc-fracao-ensolarada.csv');
    const hourly = readFileSync((await file.path())!, 'utf-8')
      .trimEnd()
      .split('\n');
    expect(hourly.filter((l) => /^\d/.test(l))).toHaveLength(8760);
    expect(hourly).toContain(
      'mes,dia,hora,fracao_ensolarada,sol_na_janela,incidencia_ensolarada,incidencia_sem_protecao',
    );

    download = page.waitForEvent('download');
    await page.getByTestId('annual-export-svg').click();
    file = await download;
    expect(file.suggestedFilename()).toBe('solar-florianopolis-sc-mapa-sombra.svg');
    const svg = readFileSync((await file.path())!, 'utf-8');
    expect(svg.match(/<rect [^>]*data-month=/g)).toHaveLength(288);
    expect(svg).toContain('hora legal (UTC−3)');
  });

  test('sem peças, o mapa pede uma peça; teclado e axe com o mapa e a tabela', async ({ page }) => {
    await page.goto('./#local=florianopolis&jl=1%2C2&ja=1');
    await expect(page.getByTestId('annual-section')).toContainText('Adicione uma peça');
    await expect(page.getByTestId('month-hour-map')).toHaveCount(0);
    await page.goto(`./${URL}`);
    await waitForMap(page);
    const summary = page.getByTestId('annual-section').locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('annual-table')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
