import { expect, test } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { svgColors } from './fixtures/pixels';

// No EPW sintético, todas as horas têm vento de 180° (Sul) a 2,0 m/s.
const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';

test.describe('rosa dos ventos', () => {
  test('sem dados abertos, a aba pede os dados', async ({ page }) => {
    await page.goto('./#aba=rosa&local=porto-alegre');
    await expect(page.getByRole('tab', { name: 'Rosa dos ventos' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('wind-need-file')).toContainText(
      'abra no passo 1 os dados da cidade',
    );
    await expect(page.getByTestId('wind-need-file').getByRole('link')).toHaveAttribute(
      'href',
      /Porto.Alegre.*TMYx/,
    );
  });

  test('rosa do arquivo: setor Sul, classe de 2 a 4 m/s, aviso de resolução e filtros', async ({
    page,
  }) => {
    await page.goto('./');
    await page.getByLabel('Ou carregue um arquivo climático (EPW ou CSV do SOL-AR)').setInputFiles({
      name: 'floripa.epw',
      mimeType: 'text/plain',
      buffer: Buffer.from(syntheticEpw(FLORIPA)),
    });
    await page.getByRole('tab', { name: 'Rosa dos ventos' }).click();
    await expect(page).toHaveURL(/aba=rosa/);
    await expect(page.getByTestId('wind-rose')).toBeVisible();
    await expect(page.getByTestId('calm-label')).toHaveText('0,0%');
    await expect(page.getByTestId('wind-info')).toContainText('8.760 horas válidas de 8.760');
    // Velocidades em m/s inteiros: 2,0 cai na fronteira e vai para a classe de cima.
    await expect(page.getByTestId('wind-bias')).toContainText('passos de 1 m/s');
    // A rosa aparece de fato: a cunha do Sul (y > 0 no SVG) tem a cor da classe de 2 a 4 m/s
    // (#3987e5) e o setor Norte, vazio, fica com o fundo branco. Antes desta conferência, o
    // contorno dos rótulos dos anéis cobria a rosa inteira de branco sem que nenhum teste visse.
    const [southWedge, northSector, southRing] = await svgColors(page.getByTestId('wind-rose'), [
      { x: 0, y: 0.55 },
      { x: 0, y: -0.55 },
      { x: 0, y: 0.95 },
    ]);
    for (const [c, expected] of [
      [southWedge!, [57, 135, 229]],
      [southRing!, [57, 135, 229]],
    ] as const) {
      c.forEach((v, k) => expect(Math.abs(v - expected[k]!)).toBeLessThan(25));
    }
    expect(Math.min(...northSector!)).toBeGreaterThan(235);

    await page.getByText('Tabela da rosa').click();
    const south = page.getByTestId('wind-table').getByRole('row', { name: /^S / });
    await expect(south.getByRole('cell')).toHaveText([
      '0,0',
      '100,0',
      '0,0',
      '0,0',
      '100,0',
      '2,0',
    ]);

    await page.getByRole('radio', { name: '16' }).click();
    await expect(page).toHaveURL(/setores=16/);
    await expect(page.getByTestId('wind-table').getByRole('row')).toHaveCount(18);

    // Hemisfério Sul: jun a ago é inverno.
    await page.getByRole('radio', { name: 'Inverno' }).click();
    await expect(page).toHaveURL(/estacao=jun-ago/);
    await expect(page.getByTestId('wind-info')).toContainText('2.208 horas válidas');
    await page.getByRole('radio', { name: 'Tarde' }).click();
    await expect(page).toHaveURL(/periodo=tarde/);
    await expect(page.getByTestId('wind-info')).toContainText('552 horas válidas');

    // Volta para a carta: a rosa some e a carta aparece.
    await page.getByRole('tab', { name: 'Carta solar' }).click();
    await expect(page.getByTestId('sun-chart')).toBeVisible();
    await expect(page.getByTestId('wind-rose')).toHaveCount(0);
  });
});
