import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { maskTints } from './fixtures/pixels';
import { openStep } from './fixtures/steps';

// F4.3: projeções equidistante e cilíndrica, cada uma com o seu transferidor, e linhas horárias em
// hora legal (analemas). Spec 03, seção 3.5; spec 02, seção 2.5.1; decisão 0025.

const CM_PER_PX = 2.54 / 96;
const DEG = Math.PI / 180;

async function openOptions(page: Page) {
  const panel = page.getByTestId('chart-options-panel');
  if ((await panel.locator('details').getAttribute('open')) === null) {
    await panel.locator('summary').click();
  }
  return panel;
}

/** Pontos de um atributo d (M/L) em coordenadas do SVG. */
function pathPoints(d: string): { x: number; y: number }[] {
  return [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

test.describe('projeções e analemas (F4.3)', () => {
  test('painel recolhido no grupo Avançado; equidistante pelo teclado, com link e nota; axe', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0&a1=40');
    const panel = page.getByTestId('chart-options-panel');
    await expect(panel.locator('details')).not.toHaveAttribute('open');
    await expect(page.getByTestId('sun-chart')).toHaveAttribute('data-projection', 'stereographic');
    await expect(page.getByTestId('chart-note')).toContainText('Projeção estereográfica');
    await openOptions(page);
    const stereo = panel.getByTestId('projection-stereographic');
    await expect(stereo).toBeChecked();
    await stereo.focus();
    await page.keyboard.press('ArrowDown');
    await expect(panel.getByTestId('projection-equidistant')).toBeChecked();
    await expect(page).toHaveURL(/proj=eq/);
    await expect(page.getByTestId('sun-chart')).toHaveAttribute('data-projection', 'equidistant');
    await expect(page.getByTestId('chart-note')).toContainText('Projeção equidistante');
    await expect(panel.getByTestId('projection-help')).toContainText('1° vale o mesmo');
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    // Voltar ao padrão tira a chave do link.
    await panel.getByTestId('projection-stereographic').check();
    await expect(page).not.toHaveURL(/proj=/);
  });

  test('equidistante: a sombra total fica em r = z / 90° (pixels), não onde ficaria na estereográfica', async ({
    page,
  }) => {
    // Fachada Norte, α interno de 40° (perfil externo de 50°), sem o transferidor por cima.
    await page.goto('./#local=florianopolis&o=0&a1=40&proj=eq&tr=0');
    await expect(page.getByTestId('mask-total')).toHaveCount(1);
    const tints = await maskTints(
      page,
      [
        { altitude: 53, azimuth: 0 }, // perfil 53° ≥ 50°
        { altitude: 47, azimuth: 0 }, // perfil 47° < 50°
        { altitude: 60, azimuth: 40 }, // perfil atan(tan 60° / cos 40°) = 66°
        { altitude: 30, azimuth: 180 }, // atrás da fachada
      ],
      { kind: 'equidistant' },
    );
    expect(tints).toEqual(['total', 'none', 'total', 'none']);
    // Lido com a fórmula da estereográfica, o ponto de 47° cairia a 54,6° na equidistante, na sombra:
    // a leitura acima confere a projeção, e não só a presença da máscara.
    expect(await maskTints(page, [{ altitude: 47, azimuth: 0 }])).toEqual(['total']);
  });

  test('cilíndrica centrada na fachada: α na altura do perfil, aleta entre β e a fachada (pixels)', async ({
    page,
  }) => {
    // Fachada Leste (90°), α interno de 40° (50° externo) e aleta à direita com β interno de 30°.
    await page.goto('./#local=florianopolis&o=90&a1=40&bd1=30&proj=cil&tr=0');
    const chart = page.getByTestId('sun-chart');
    await expect(chart).toHaveAttribute('data-projection', 'cylindrical');
    await expect(page.getByTestId('chart-note')).toContainText(
      'centrada na normal da fachada (90°)',
    );
    // O Leste está no centro da carta.
    const east = chart.locator('.labels text.cardinal', { hasText: 'L' });
    expect(Number(await east.getAttribute('x'))).toBeCloseTo(0, 6);
    const tints = await maskTints(
      page,
      [
        { altitude: 55, azimuth: 90 }, // perfil 55° na normal
        { altitude: 45, azimuth: 90 },
        { altitude: 20, azimuth: 165 }, // ψ = 75°, entre β (60° externo) e a fachada
        { altitude: 20, azimuth: 135 }, // ψ = 45°: fora da aleta, perfil de 27°
        { altitude: 40, azimuth: 270 }, // atrás da fachada, na costura
      ],
      { kind: 'cylindrical', center: 90 },
    );
    expect(tints).toEqual(['total', 'none', 'total', 'none', 'none']);
    // O transferidor também é desenhado nesta projeção (curvas e reta de β).
    await page.goto('./#local=florianopolis&o=90&a1=40&bd1=30&proj=cil');
    await expect(page.getByTestId('curve-alpha--1')).toHaveCount(1);
    await expect(page.getByTestId('curve-beta-right-1')).toHaveCount(1);
  });

  test('analemas em hora legal: o de 12 h passa pelo sol do pvlib; as duas linhas e a legenda', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&hl=l');
    await expect(page.getByTestId('legal-hour-lines')).toBeVisible();
    await expect(page.getByTestId('hour-lines')).toHaveCount(0);
    const panel = await openOptions(page);
    await expect(panel.getByTestId('hour-lines-legal')).toBeChecked();
    // Florianópolis: λ = −48,547°, fuso −3: 14,2 min atrás pela longitude; ao meio-dia legal, a
    // hora solar vai de 11h32 (11/02) a 12h02 (03/11) (referência do pvlib).
    const help = panel.getByTestId('legal-help');
    await expect(help).toContainText('14,2 min atrás');
    await expect(help).toContainText('11h32 (11/02)');
    await expect(help).toContainText('12h02 (03/11)');
    // Sol às 12h00 legais de 18/06 (dia 168), pelo pvlib, na carta estereográfica.
    const ref = JSON.parse(
      readFileSync('docs/validacao/casos/carta/projecoes-analemas.json', 'utf-8'),
    ) as { locais: { id: string; analema: number[][] }[] };
    const row = ref.locais
      .find((l) => l.id === 'florianopolis')!
      .analema.find((r) => r[0] === 168 && r[1] === 12)!;
    const [z, a] = [row[2]!, row[3]!];
    const r = Math.tan((z * DEG) / 2);
    const expected = { x: r * Math.sin(a * DEG), y: -r * Math.cos(a * DEG) };
    const d = await page.locator('.legal-hour-line[data-hour="12"]').getAttribute('d');
    const nearest = Math.min(
      ...pathPoints(d!).map((p) => Math.hypot(p.x - expected.x, p.y - expected.y)),
    );
    expect(nearest).toBeLessThan(1e-4);
    // As duas: linhas solares e analemas, com a legenda.
    await panel.getByTestId('hour-lines-both').check();
    await expect(page).toHaveURL(/hl=a/);
    await expect(page.getByTestId('hour-lines')).toHaveCount(1);
    await expect(page.getByTestId('legal-hour-lines')).toBeVisible();
    await expect(page.getByTestId('hour-lines-legend')).toContainText('hora legal (analema)');
    await expect(page.getByTestId('chart-note')).toContainText('tracejadas, analemas');
  });

  test('impressão em escala: raio do horizonte na equidistante e altura de 0° a 90° na cilíndrica', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0&proj=eq');
    await page.emulateMedia({ media: 'print' });
    const radiusPx = await page
      .locator('#panel-chart .sun-chart .horizon')
      .evaluate(
        (c) =>
          (c as SVGCircleElement).r.baseVal.value * (c as SVGGraphicsElement).getScreenCTM()!.a,
      );
    expect(radiusPx * CM_PER_PX).toBeCloseTo(6, 3);
    await expect(page.locator('.print-header')).toContainText('Raio da carta: 6 cm');
    await page.emulateMedia({ media: 'screen' });

    await page.goto('./#local=florianopolis&o=0&proj=cil');
    await openStep(page, '5');
    await page.getByTestId('print-radius').fill('5');
    await page.emulateMedia({ media: 'print' });
    // Da linha do horizonte (y = 0) à borda do zênite (y = −1 no SVG): R na escala de impressão.
    const heightPx = await page
      .locator('#panel-chart .sun-chart .horizon')
      .evaluate((line) => (line as SVGGraphicsElement).getScreenCTM()!.d);
    expect(heightPx * CM_PER_PX).toBeCloseTo(5, 3);
    await expect(page.locator('.print-header')).toContainText('Altura da carta, de 0° a 90°: 5 cm');
    await page.emulateMedia({ media: 'screen' });
  });

  test('desenho à mão na equidistante: o vértice vem da inversa da projeção', async ({ page }) => {
    await page.goto('./#local=brasilia&o=0&tr=0&proj=eq');
    await openStep(page, '3');
    await page.getByText('Mais opções').click();
    await page.getByRole('button', { name: 'Começar a desenhar' }).click();
    const chart = page.getByTestId('sun-chart');
    await chart.scrollIntoViewIfNeeded();
    // Três cliques em pontos dados no SVG: (0; −0,5) é a altura de 45° no Norte na equidistante
    // (na estereográfica seria 36,9°).
    const screen = await chart.evaluate((svg) => {
      const m = (svg as SVGSVGElement).getScreenCTM()!;
      return [
        [0, -0.5],
        [0.3, -0.3],
        [-0.3, -0.3],
      ].map(([x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform(m);
        return { x: p.x, y: p.y };
      });
    });
    for (const p of screen) await page.mouse.click(p.x, p.y);
    await page.getByRole('button', { name: 'Concluir polígono' }).click();
    await expect(page).toHaveURL(/dt=/);
    // O clique cai no pixel inteiro mais próximo: até cerca de 0,5° de diferença.
    const dt = new URL(page.url()).hash.match(/dt=([^&]*)/)![1]!;
    const [az, alt] = dt.split('-')[0]!.split('_').map(Number) as [number, number];
    expect(Math.min(az, 360 - az)).toBeLessThan(1);
    expect(Math.abs(alt - 45)).toBeLessThan(0.6);
    expect(await maskTints(page, [{ altitude: 55, azimuth: 0 }], { kind: 'equidistant' })).toEqual([
      'total',
    ]);
  });

  test('celular: a carta cilíndrica fica baixa e não toma a tela', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    await page.goto('./#local=florianopolis&o=0&proj=cil');
    const box = (await page.getByTestId('sun-chart').boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width / box.height).toBeCloseTo(2.28 / 1.36, 1);
    expect(box.height).toBeLessThan(0.45 * viewport.height);
    // Os passos continuam à vista embaixo da carta.
    await expect(page.getByRole('heading', { name: 'Local' })).toBeInViewport();
  });
});
