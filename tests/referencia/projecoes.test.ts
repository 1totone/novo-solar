// F4.3: analemas em hora legal, projeções equidistante e cilíndrica e curvas do transferidor nessas
// projeções, contra a referência independente de docs/validacao/scripts/gerar_projecoes_analemas.py
// (pvlib e fórmulas fechadas da spec 03, seção 3.5). Locais com fusos de −5 a +5,5 h, inclusive um do
// hemisfério norte (Lisboa).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  makeProjection,
  projectDirection,
  type ChartPoint,
  type ProjectionKind,
} from '../../src/core/chart/projection';
import { legalHourPosition, legalNoonSolarOffsets } from '../../src/core/chart/sunChart';
import { protractorPolylines } from '../../src/core/protractor/projected';

const root = fileURLToPath(new URL('../../', import.meta.url));
const DEG = Math.PI / 180;

interface RefSite {
  id: string;
  latitude: number;
  longitude: number;
  fuso: number;
  elevacao: number;
  analema: number[][];
  meio_dia_legal: {
    longitude_min: number;
    tst_menos_legal_min: { valor: number; dia: number };
    tst_menos_legal_max: { valor: number; dia: number };
  };
}
interface RefCurve {
  orientacao: number;
  familia: 'alpha' | 'gamma' | 'beta';
  lado: 'right' | 'left' | null;
  externo: number;
  pontos: number[][];
}
const ref = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/carta/projecoes-analemas.json`, 'utf-8'),
) as { locais: RefSite[]; centros_cilindrica: number[]; transferidor: RefCurve[] };

function vector(zenith: number, azimuth: number): [number, number, number] {
  return [
    Math.sin(zenith * DEG) * Math.sin(azimuth * DEG),
    Math.sin(zenith * DEG) * Math.cos(azimuth * DEG),
    Math.cos(zenith * DEG),
  ];
}

function separation(z1: number, a1: number, z2: number, a2: number): number {
  const u = vector(z1, a1);
  const v = vector(z2, a2);
  const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return Math.atan2(Math.hypot(...c), u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / DEG;
}

/** Distância de um ponto à polilinha mais próxima (na cilíndrica, também às cópias de ±2). */
function distanceToLines(p: ChartPoint, lines: ChartPoint[][], period = 0): number {
  let best = Infinity;
  for (const shift of period ? [-period, 0, period] : [0]) {
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = { x: line[i - 1]!.x + shift, y: line[i - 1]!.y };
        const b = { x: line[i]!.x + shift, y: line[i]!.y };
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        const t =
          len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
        best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
      }
    }
  }
  return best;
}

describe('analemas em hora legal contra o pvlib', () => {
  for (const s of ref.locais) {
    const site = {
      latitude: s.latitude,
      longitude: s.longitude,
      elevation: s.elevacao,
      timeZone: s.fuso,
    };
    it(`${s.id} (fuso ${s.fuso}): sol às H:00 legais, de 5 a 19 h, ano inteiro`, () => {
      let worst = 0;
      for (const [day, hour, zenith, azimuth] of s.analema) {
        const p = legalHourPosition(site, day!, hour!);
        worst = Math.max(worst, separation(p.zenith, p.azimuth, zenith!, azimuth!));
      }
      // Tolerância da spec 02 (0,01°); a referência tem 6 casas decimais.
      expect(worst).toBeLessThan(1e-5);
    });

    it(`${s.id}: hora solar ao meio-dia legal (longitude e equação do tempo)`, () => {
      const o = legalNoonSolarOffsets(site);
      const r = s.meio_dia_legal;
      expect(o.longitudeMinutes).toBeCloseTo(r.longitude_min, 6);
      // 1 s de tolerância (spec 02, seção 2.6); datas dos extremos a até 1 dia.
      expect(Math.abs(o.min.minutes - r.tst_menos_legal_min.valor)).toBeLessThan(1 / 60);
      expect(Math.abs(o.max.minutes - r.tst_menos_legal_max.valor)).toBeLessThan(1 / 60);
      expect(Math.abs(o.min.day - r.tst_menos_legal_min.dia)).toBeLessThanOrEqual(1);
      expect(Math.abs(o.max.day - r.tst_menos_legal_max.dia)).toBeLessThanOrEqual(1);
    });
  }
});

describe('projeções equidistante e cilíndrica contra fórmulas independentes', () => {
  it('coordenadas dos pontos dos analemas das 9, 12 e 15 h, com dois centros na cilíndrica', () => {
    let worstFormula = 0;
    let worstPipeline = 0;
    let n = 0;
    for (const s of ref.locais) {
      const site = {
        latitude: s.latitude,
        longitude: s.longitude,
        elevation: s.elevacao,
        timeZone: s.fuso,
      };
      for (const row of s.analema) {
        if (row.length < 10) continue;
        const [day, hour, zenith, azimuth, xe, ye] = row as number[];
        const mine = legalHourPosition(site, day!, hour!);
        const check = (kind: ProjectionKind, center: number, x: number, y: number) => {
          const p = makeProjection(kind, center);
          const a = projectDirection(p, zenith!, azimuth!);
          const b = projectDirection(p, mine.zenith, mine.azimuth);
          // Na cilíndrica, x é periódico (2 unidades por volta).
          const dx = (u: number) =>
            kind === 'cylindrical' ? Math.abs(((((u - x + 1) % 2) + 2) % 2) - 1) : Math.abs(u - x);
          worstFormula = Math.max(worstFormula, dx(a.x), Math.abs(a.y - y));
          worstPipeline = Math.max(worstPipeline, dx(b.x), Math.abs(b.y - y));
          n++;
        };
        check('equidistant', 0, xe!, ye!);
        ref.centros_cilindrica.forEach((c, k) => {
          check('cylindrical', c, row[6 + 2 * k]!, row[7 + 2 * k]!);
        });
      }
    }
    expect(n).toBeGreaterThan(2000);
    // A referência guarda zênite e azimute com 6 casas (10⁻⁶° vale 1,1 × 10⁻⁸ R) e as coordenadas
    // calculadas antes do arredondamento.
    expect(worstFormula).toBeLessThan(2e-8);
    expect(worstPipeline).toBeLessThan(1e-6);
  });
});

describe('transferidor nas projeções equidistante e cilíndrica', () => {
  for (const kind of ['equidistant', 'cylindrical'] as const) {
    it(`${kind}: pontos das curvas de α, γ e β pelas fórmulas fechadas ficam sobre as polilinhas`, () => {
      let worst = 0;
      let n = 0;
      for (const c of ref.transferidor) {
        const p = makeProjection(kind, kind === 'cylindrical' ? c.orientacao : 0);
        const angles =
          c.familia === 'alpha'
            ? { alpha: [c.externo] as [number] }
            : c.familia === 'gamma'
              ? c.lado === 'right'
                ? { gammaRight: [c.externo] as [number] }
                : { gammaLeft: [c.externo] as [number] }
              : c.lado === 'right'
                ? { betaRight: [c.externo, c.externo] as [number, number] }
                : { betaLeft: [c.externo, c.externo] as [number, number] };
        const curves = protractorPolylines(p, c.orientacao, 'external', angles);
        const lines = curves.filter((k) => k.family === c.familia).flatMap((k) => k.lines);
        expect(lines.length).toBeGreaterThan(0);
        for (const pt of c.pontos) {
          const [, h, xe, ye, xc, yc] = pt as number[];
          if (h! < 0.5) continue; // no horizonte, a curva encontra a borda do recorte
          const target = kind === 'equidistant' ? { x: xe!, y: ye! } : { x: xc!, y: yc! };
          worst = Math.max(worst, distanceToLines(target, lines, kind === 'cylindrical' ? 2 : 0));
          n++;
        }
      }
      expect(n).toBeGreaterThan(500);
      // Spec 03, seção 3.5.4: 10⁻⁴ R da polilinha desenhada.
      expect(worst).toBeLessThan(1e-4);
    });
  }
});
