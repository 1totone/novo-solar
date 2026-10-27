import { expect, test, type Page } from '@playwright/test';

// Rótulos da carta sem se atropelar com várias camadas: os nomes dos ângulos do dimensionamento
// pelo período (F3.6), os percentuais das curvas da proteção (F3.2), as horas, os meses e a
// grade. Conferido pelos retângulos dos textos na tela, em pixels.
const CASES: [string, string][] = [
  [
    'dimensionamento pelo período em Brasília (tutorial da UFU)',
    '#local=brasilia&o=30&tr=0&cs=0&jl=2&ja=1&jr=0%2C15&dpi=1%2F1&dpf=31%2F12&dhi=9&dhf=15',
  ],
  [
    'curvas de um brise na fachada norte de Florianópolis',
    '#local=florianopolis&o=0&tr=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i',
  ],
  [
    'curvas, período e transferidor juntos em Brasília',
    '#local=brasilia&o=30&jl=2&ja=1&jr=0%2C15&pc1=b_1%2C28___1%2C7_1%2C2&dpi=1%2F1&dpf=31%2F12&dhi=9&dhf=15',
  ],
  [
    'curvas sobre os dados e com a máscara pelos ângulos',
    '#local=florianopolis&hist=1&dado=tbs&o=0&a1=40&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i',
  ],
  [
    'curvas de brise e aletas com o transferidor em Brasília',
    '#local=brasilia&o=30&jl=2&ja=1&pc1=b_0%2C6__0_0%2C3_0%2C3&pc2=ad_0%2C4',
  ],
  [
    'curvas de brise e aletas na fachada leste de Florianópolis',
    '#local=florianopolis&o=90&jl=1%2C2&ja=1&pc1=ad_0%2C4&pc2=lh_x_0%2C2_0%2C3',
  ],
  [
    'carta cilíndrica com analemas, transferidor e máscara (F4.3)',
    '#local=florianopolis&o=90&a1=40&bd1=30&proj=cil&hl=a',
  ],
  [
    'carta cilíndrica com as curvas de um brise na fachada norte (F4.3)',
    '#local=florianopolis&o=0&proj=cil&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i',
  ],
  [
    'carta equidistante com curvas e período (F4.3)',
    '#local=brasilia&o=30&proj=eq&jl=2&ja=1&jr=0%2C15&pc1=b_1%2C28___1%2C7_1%2C2&dpi=1%2F1&dpf=31%2F12&dhi=9&dhf=15',
  ],
];

type Rect = { text: string; cls: string; x0: number; y0: number; x1: number; y1: number };

/** Retângulos, em pixels da tela, de todos os textos visíveis da carta. */
async function textRects(page: Page): Promise<Rect[]> {
  return page
    .getByTestId('sun-chart')
    .first()
    .evaluate((svg) =>
      [...svg.querySelectorAll('text')]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && (el.textContent ?? '') !== '';
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: el.textContent ?? '',
            cls: el.getAttribute('class') ?? '',
            x0: r.left,
            y0: r.top,
            x1: r.right,
            y1: r.bottom,
          };
        }),
    );
}

/** Pares de textos que se sobrepõem em mais de `tolerance` px nos dois eixos. */
function overlaps(rects: Rect[], tolerance = 1): string[] {
  const found: string[] = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const b = rects[j]!;
      const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (dx > tolerance && dy > tolerance)
        found.push(`"${a.text}" (${a.cls}) × "${b.text}" (${b.cls})`);
    }
  }
  return found;
}

for (const [name, hash] of CASES) {
  test(`nenhum rótulo da carta sobre outro: ${name}`, async ({ page }) => {
    await page.goto(`./${hash}`);
    const chart = page.getByTestId('sun-chart').first();
    await expect(chart).toBeVisible();
    // Espera as camadas calculadas nos workers.
    await expect(page.getByTestId('shading-pending')).toHaveCount(0, { timeout: 20000 });
    if (hash.includes('dpi=')) {
      await expect(chart.getByTestId('period-mark').first()).toBeVisible({ timeout: 20000 });
    }
    if (hash.includes('pc1=')) {
      await expect(chart.getByTestId('contour-label').first()).toBeVisible({ timeout: 20000 });
    }
    if (hash.includes('dado=')) {
      await expect(page.getByTestId('overlay')).toBeVisible({ timeout: 20000 });
    }
    const rects = await textRects(page);
    expect(rects.length).toBeGreaterThan(20);
    expect(overlaps(rects)).toEqual([]);
  });
}
