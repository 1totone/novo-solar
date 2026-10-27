import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// F5.2: exportação para o EnergyPlus e para o CAD, no passo 6 (spec 13). Janela de 1,5 × 1,2 m
// numa fachada norte de Florianópolis, com brise de 0,8 m a 0,1 m da verga, infinito dos dois
// lados. Os arquivos são conferidos no EnergyPlus pelo teste de referência
// (tests/referencia/energyplusExportacao.test.ts); aqui, o caminho na interface.
const CASE = '#local=florianopolis&o=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i';

async function openSection(page: Page) {
  await page.goto(`./${CASE}`);
  const panel = page.getByTestId('geometry-panel');
  if ((await panel.locator('details').first().getAttribute('open')) === null) {
    await panel.locator('summary').first().click();
  }
  const section = page.getByTestId('energyplus-section');
  await section.locator('summary').click();
  return section;
}

async function download(page: Page, testId: string) {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId(testId).click(),
  ]);
  return { name: file.suggestedFilename(), text: readFileSync((await file.path())!, 'utf-8') };
}

test.describe('exportação para o EnergyPlus e o CAD (F5.2)', () => {
  test('modelo, objetos e DXF, com o objeto de cada peça na tela', async ({ page }) => {
    const section = await openSection(page);
    await expect(section.getByTestId('energyplus-plan')).toContainText(
      'Peça 1: Shading:Overhang:Projection',
    );
    // Brise a 0,8 m do vidro: L = 20 · 0,8 = 16 m.
    await expect(section.getByTestId('energyplus-plan')).toContainText('exportado com 16,0 m');

    const model = await download(page, 'energyplus-model');
    expect(model.name).toBe('solar-florianopolis-sc-modelo-energyplus.idf');
    expect(model.text).toContain('Shading:Overhang:Projection,');
    expect(model.text).toMatch(/ {2}0\.666666667; +!- Depth as Fraction of Window\/Door Height/);
    expect(model.text).toMatch(/ {2}16, +!- Left extension from Window\/Door Width/);
    expect(model.text).toMatch(/Site:Location,\n {2}Florianopolis \(SC\), +!- Name/);

    await section.getByTestId('energyplus-window-name').fill('Janela, sala');
    await expect(section.getByRole('alert')).toContainText('sem vírgula');
    await expect(section.getByTestId('energyplus-objects')).toBeDisabled();
    await section.getByTestId('energyplus-window-name').fill('Sala Janela Norte');
    const objects = await download(page, 'energyplus-objects');
    expect(objects.text).toContain('Sala Janela Norte Brise 1,');
    expect(objects.text).not.toContain('BuildingSurface:Detailed');

    const dxf = await download(page, 'energyplus-dxf');
    expect(dxf.name).toBe('solar-florianopolis-sc-corte-e-vista.dxf');
    expect(dxf.text).toContain('AC1009');
    expect(dxf.text).toContain('VISTA-VIDRO');
  });

  test('janela colada: nomes e posição vêm dela, com avisos de tamanho e orientação', async ({
    page,
  }) => {
    const section = await openSection(page);
    const paste = section.getByTestId('energyplus-paste');
    await paste.fill('Window, J1, Vidro, P1, , 1, 0, 0, 1.5, 1.2;');
    await expect(section.getByTestId('energyplus-paste-status')).toContainText(
      'Não achei um objeto FenestrationSurface:Detailed',
    );
    // Janela de 1,0 × 1,2 m voltada para o Leste, com o canto em (10, 5, 3).
    await paste.fill(
      'FenestrationSurface:Detailed, Leste 1, Window, Vidro, Parede Leste, , autocalculate, , 1, 4,\n' +
        '  10, 4, 4.2,  10, 4, 3,  10, 5, 3,  10, 5, 4.2;',
    );
    await expect(section.getByTestId('energyplus-paste-status')).toContainText(
      'Janela Leste 1, na parede Parede Leste: 1,00 × 1,20 m, normal externa a 90,0°.',
    );
    await expect(section.getByTestId('energyplus-warning')).toHaveCount(2);
    await expect(section.getByTestId('energyplus-window-name')).toHaveValue('Leste 1');
    const objects = await download(page, 'energyplus-objects');
    expect(objects.text).toContain('Leste 1 Brise 1,');
    expect(objects.text).toContain('! A janela colada tem 1,00 x 1,20 m');
    expect(objects.text).toContain('a 90,0 graus');
  });
});
