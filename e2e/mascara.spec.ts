import { expect, test } from '@playwright/test';
import { maskTints } from './fixtures/pixels';

// Caso do tutorial do SOL-AR (UFU): Brasília, fachada nordeste (30°), referência interna. Nos
// testes de cor, o transferidor fica oculto (tr=0) e os pontos ficam longe das linhas da grade.
const TUTORIAL = '#local=brasilia&o=30&a1=55&gd1=50&ge1=60';

test.describe('máscara pelos ângulos', () => {
  test('pinta a sombra total do exemplo do tutorial e segue as mudanças do link', async ({
    page,
  }) => {
    await page.goto(`./${TUTORIAL}&tr=0`);
    await expect(page.getByTestId('mask-total')).toHaveCount(1);
    await expect(page.getByTestId('mask-partial')).toHaveCount(0);
    // À frente da fachada (ψ = 10°), perfil 55,4° ≥ 35° (α externo): sombra; perfil 15,2°: sol;
    // atrás da fachada: sol.
    expect(
      await maskTints(page, [
        { altitude: 55, azimuth: 40 },
        { altitude: 15, azimuth: 40 },
        { altitude: 45, azimuth: 220 },
      ]),
    ).toEqual(['total', 'none', 'none']);

    // Aletas numa fachada sul-sudoeste: a máscara muda de lado, sem restos da anterior.
    await page.goto('./#local=brasilia&o=200&be1=40&bd1=30&gad=50&pbe1=20&tr=0');
    expect(
      await maskTints(page, [
        { altitude: 25, azimuth: 125 }, // ψ = −75°, aleta esquerda (β externo 50°)
        { altitude: 45, azimuth: 15 }, // atrás da fachada
        { altitude: 45, azimuth: 195 }, // à frente, entre as aletas
      ]),
    ).toEqual(['total', 'none', 'none']);
  });

  test('sombra parcial em "Mais opções" e índice 2 do brise afastado', async ({ page }) => {
    await page.goto(`./${TUTORIAL}`);
    await page.getByText('Mais opções').click();
    // Do centro da janela, a ponta do brise é vista mais perto do horizonte: α interno 60°
    // (externo 30°, contra 35° da total).
    await page.getByTestId('angle-pa1').fill('60');
    await expect(page.getByTestId('curve-p-alpha--1')).toHaveCount(1);
    await expect(page.getByTestId('mask-partial')).toHaveCount(1);
    await expect(page).toHaveURL(/pa1=60/);
    // Perfil 32,4°: fora da total, dentro da parcial; perfil 55,4°: total.
    await page.getByLabel('Mostrar o transferidor sobre a carta').uncheck();
    expect(
      await maskTints(page, [
        { altitude: 32, azimuth: 40 },
        { altitude: 55, azimuth: 40 },
      ]),
    ).toEqual(['partial', 'total']);

    // Brise afastado: α2 = 20° (externo 70°) abre a fresta junto à fachada.
    // O conjunto parcial não tem índice 2, então a fresta fica com sombra parcial.
    await page.getByTestId('angle-a2').fill('20');
    await expect(page).toHaveURL(/a2=20/);
    expect(
      await maskTints(page, [
        { altitude: 50, azimuth: 40 },
        { altitude: 78, azimuth: 40 },
      ]),
    ).toEqual(['total', 'partial']);
  });

  test('desenho à mão: marca vértices, conclui e guarda no link', async ({ page }) => {
    await page.goto('./#local=brasilia&o=0&tr=0');
    await page.getByText('Mais opções').click();
    await page.getByRole('button', { name: 'Começar a desenhar' }).click();
    const chart = page.getByTestId('sun-chart');
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    // Três cliques perto do centro da carta (zênite): um triângulo.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const d = box.width * 0.12;
    await page.mouse.click(cx - d, cy - d);
    await page.mouse.click(cx + d, cy - d);
    await page.mouse.click(cx, cy + d);
    await expect(page.getByRole('status')).toContainText('3 até agora');
    await page.getByRole('button', { name: 'Concluir polígono' }).click();
    await expect(page).toHaveURL(/dt=/);
    await expect(page.getByTestId('mask-total')).toHaveCount(1);
    expect(await maskTints(page, [{ altitude: 78, azimuth: 10 }])).toEqual(['total']);

    await page.getByRole('button', { name: 'Parar de desenhar' }).click();
    await page.getByRole('button', { name: 'Apagar os desenhos' }).click();
    await expect(page).not.toHaveURL(/dt=/);
    await expect(page.getByTestId('mask-total')).toHaveCount(0);
  });
});
