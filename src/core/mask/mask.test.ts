import { describe, expect, it } from 'vitest';
import { project } from '../chart/stereographic';
import { maskRegions, regionContains, type Region } from './mask';

const at = (r: Region, zenith: number, azimuth: number) => {
  const p = project(zenith, azimuth);
  return regionContains(r, p.x, p.y);
};

describe('máscara de um brise horizontal (fachada norte, referência externa)', () => {
  const { total } = maskRegions(0, 'external', { alpha: [45] });

  it('sombreia o zênite e o sol alto à frente; não sombreia sol baixo nem atrás da fachada', () => {
    expect(at(total, 1, 0)).toBe(true);
    expect(at(total, 30, 0)).toBe(true); // perfil 60° ≥ 45°
    expect(at(total, 60, 0)).toBe(false); // perfil 30° < 45°
    expect(at(total, 30, 180)).toBe(false); // atrás da fachada
  });

  it('a borda é a curva α: perfil 45° ± 0,01°', () => {
    // à frente (ψ = 0), perfil = altura
    expect(at(total, 90 - 45.01, 0)).toBe(true);
    expect(at(total, 90 - 44.99, 0)).toBe(false);
  });
});

describe('brise afastado (índice 2)', () => {
  it('sombra entre a curva externa (1) e a interna (2)', () => {
    const { total } = maskRegions(0, 'external', { alpha: [35, 70] });
    expect(at(total, 90 - 50, 0)).toBe(true);
    expect(at(total, 90 - 80, 0)).toBe(false); // sol alto passa pela fresta
    expect(at(total, 90 - 30, 0)).toBe(false);
  });

  it('referência interna do tutorial: α1 = 55°, α2 = 20° equivale a perfil de 35° a 70°', () => {
    const a = maskRegions(30, 'internal', { alpha: [55, 20] }).total;
    const b = maskRegions(30, 'external', { alpha: [35, 70] }).total;
    for (const [z, az] of [
      [40, 30],
      [15, 30],
      [60, 30],
      [45, 80],
    ] as const) {
      expect(at(a, z, az)).toBe(at(b, z, az));
    }
  });

  it('índice 2 menor que o 1: não há sombra total', () => {
    const { total } = maskRegions(0, 'external', { alpha: [60, 30] });
    for (let z = 1; z < 90; z += 4) expect(at(total, z, 0)).toBe(false);
  });
});

describe('limites laterais e aletas', () => {
  it('γ à direita limita o brise só para sol à direita', () => {
    const { total } = maskRegions(0, 'external', { alpha: [30], gammaRight: [60] });
    // sol à direita (azimute 60°), alto o bastante para o perfil, mas com γ do sol abaixo de 60°
    expect(at(total, 50, 60)).toBe(false);
    // o mesmo sol à esquerda continua sombreado (sem γ à esquerda)
    expect(at(total, 50, 300)).toBe(true);
  });

  it('γ2 do brise não altera a máscara (a aresta lateral define um plano só)', () => {
    const a = maskRegions(0, 'external', { alpha: [30], gammaRight: [60] }).total;
    const b = maskRegions(0, 'external', { alpha: [30], gammaRight: [60, 40] }).total;
    for (let az = 0; az < 360; az += 7)
      for (let z = 3; z < 90; z += 7) expect(at(a, z, az)).toBe(at(b, z, az));
  });

  it('aleta à direita: setor entre β e a fachada; γ das aletas corta o sol alto', () => {
    const { total } = maskRegions(0, 'external', { betaRight: [40], finTopRight: [50] });
    expect(at(total, 80, 60)).toBe(true); // ψ = 60° ≥ 40°, sol baixo
    expect(at(total, 80, 30)).toBe(false); // ψ = 30° < 40°
    expect(at(total, 80, 300)).toBe(false); // lado esquerdo
    expect(at(total, 10, 60)).toBe(false); // sol alto passa por cima da aleta
  });

  it('sem nenhum ângulo, nada é sombreado', () => {
    const r = maskRegions(0, 'external', {});
    expect(at(r.total, 30, 0)).toBe(false);
    expect(at(r.partial, 30, 0)).toBe(false);
  });
});

describe('desenho à mão', () => {
  // Triângulo em torno do zênite e outro baixo, a leste; vértices em (altura, azimute).
  const zenith = [
    { altitude: 70, azimuth: 0 },
    { altitude: 70, azimuth: 120 },
    { altitude: 70, azimuth: 240 },
  ];
  const east = [
    { altitude: 5, azimuth: 80 },
    { altitude: 30, azimuth: 90 },
    { altitude: 5, azimuth: 100 },
  ];

  it('soma-se à máscara calculada e entra na sombra total ou na parcial', () => {
    const r = maskRegions(0, 'external', { alpha: [45] }, {}, { total: [east], partial: [zenith] });
    expect(at(r.total, 60, 0)).toBe(false); // perfil 30°: fora do α e do desenho
    expect(at(r.total, 75, 90)).toBe(true); // dentro do triângulo a leste
    expect(at(r.total, 1, 0)).toBe(true); // zênite: dentro do α
    // a parcial desconta a total: o zênite está nos dois, logo não é parcial
    expect(at(r.partial, 1, 0)).toBe(false);
  });

  it('a parcial desenhada aparece onde não há sombra total', () => {
    const r = maskRegions(0, 'external', {}, {}, { total: [], partial: [zenith] });
    expect(at(r.partial, 1, 0)).toBe(true);
    expect(at(r.partial, 40, 0)).toBe(false);
  });

  it('polígono com menos de 3 vértices é ignorado', () => {
    const r = maskRegions(0, 'external', {}, {}, { total: [east.slice(0, 2)], partial: [] });
    expect(r.total.kind).toBe('empty');
  });
});
