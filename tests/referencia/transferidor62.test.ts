// Regressão do transferidor contra o SOL-AR 6.2 (F2.2): curvas reconstruídas do código de desenho
// do ProjSolar.exe (docs/validacao/scripts/transferidor_solar62.py; relatório F2.2).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { protractorCurves, type ProtractorAngles } from '../../src/core/protractor/protractor';

const root = fileURLToPath(new URL('../../', import.meta.url));
const [head, ...lines] = readFileSync(
  `${root}docs/validacao/casos/transferidor/solar62.csv`,
  'utf-8',
)
  .trim()
  .split(/\r?\n/);
const keys = head!.split(',');
const rows = lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i]!, v])));

// Entradas dos casos, iguais às do script de referência.
const CASES: Record<
  string,
  { orientation: number; reference: 'internal' | 'external'; angles: ProtractorAngles }
> = {
  'norte-interna': {
    orientation: 0,
    reference: 'internal',
    angles: { alpha: [45], betaRight: [30], betaLeft: [60], gammaRight: [20], gammaLeft: [50] },
  },
  'nne-interna-indices2': {
    orientation: 30,
    reference: 'internal',
    angles: {
      alpha: [40, 15],
      betaRight: [20, 50],
      betaLeft: [35, 10],
      gammaRight: [30, 60],
      gammaLeft: [25, 45],
    },
  },
  'leste-externa': {
    orientation: 90,
    reference: 'external',
    angles: { alpha: [55], betaRight: [40], betaLeft: [75], gammaRight: [35], gammaLeft: [65] },
  },
  'sudeste-externa-indices2': {
    orientation: 135,
    reference: 'external',
    angles: {
      alpha: [70, 30],
      betaRight: [45, 15],
      betaLeft: [20, 55],
      gammaRight: [50, 10],
      gammaLeft: [40, 80],
    },
  },
  'sso-interna': {
    orientation: 200,
    reference: 'internal',
    angles: { alpha: [25], betaRight: [65], betaLeft: [5], gammaRight: [75], gammaLeft: [15] },
  },
  'noroeste-interna': {
    orientation: 330,
    reference: 'internal',
    angles: { alpha: [60, 75], betaRight: [10], betaLeft: [80], gammaRight: [45], gammaLeft: [5] },
  },
  'orientacao-negativa': {
    orientation: -30,
    reference: 'external',
    angles: { alpha: [35], betaRight: [50], betaLeft: [25], gammaRight: [20], gammaLeft: [60] },
  },
  'oeste-externa': {
    orientation: 270,
    reference: 'external',
    angles: { alpha: [10, 85], betaRight: [88], betaLeft: [1], gammaRight: [85], gammaLeft: [1] },
  },
};

const FAMILY: Record<string, string> = { alfa: 'alpha', beta: 'beta', gama: 'gamma' };
const SIDE: Record<string, string | undefined> = {
  direita: 'right',
  esquerda: 'left',
  '': undefined,
};

describe('transferidor igual ao do SOL-AR 6.2', () => {
  it.each(Object.keys(CASES))('%s', (id) => {
    const c = CASES[id]!;
    const ref = rows.filter((r) => r.caso === id);
    // O 6.2 não desenha curvas de α e γ com ângulo externo de 89° ou mais.
    const ours = protractorCurves(c.orientation, c.reference, c.angles).filter(
      (k) => k.geometry.kind === 'ray' || k.externalAngle < 89,
    );
    expect(ours.length).toBe(ref.length);
    for (const r of ref) {
      const k = ours.find(
        (x) =>
          x.family === FAMILY[r.curva!] && x.side === SIDE[r.lado!] && x.index === Number(r.indice),
      );
      expect(k, `${id} ${r.curva} ${r.lado} ${r.indice}`).toBeDefined();
      expect(k!.externalAngle).toBeCloseTo(Number(r.angulo_externo), 9);
      if (k!.geometry.kind === 'circle') {
        expect(k!.geometry.centerE).toBeCloseTo(Number(r.centro_leste), 9);
        expect(k!.geometry.centerN).toBeCloseTo(Number(r.centro_norte), 9);
        expect(k!.geometry.radius).toBeCloseTo(Number(r.raio), 9);
      } else {
        const d = Math.abs(((k!.geometry.azimuth - Number(r.azimute_reta) + 540) % 360) - 180);
        expect(d).toBeLessThan(1e-9);
      }
    }
  });
});
