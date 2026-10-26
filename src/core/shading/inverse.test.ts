import { describe, expect, it } from 'vitest';
import { project } from '../chart/stereographic';
import {
  periodOutline,
  periodSamples,
  requiredAngles,
  sizeFins,
  sizeOverhang,
  subdivideFins,
  subdivideOverhang,
  type PeriodSample,
} from './inverse';
import { facadeVector } from './shadedFraction';

const RAD = Math.PI / 180;

/** Amostra a partir da altura e do ângulo azimutal relativo (fachada com orientação 0). */
function sample(altitude: number, psi: number): PeriodSample {
  const s = facadeVector(altitude, psi, 0);
  return {
    month: 1,
    day: 1,
    hour: 12,
    altitude,
    azimuth: (psi + 360) % 360,
    s,
    psi,
    profile: Math.atan2(s.z, s.y) / RAD,
    gamma: Math.atan2(s.z, Math.abs(s.x)) / RAD,
  };
}

const WINDOW = { width: 1, height: 1 };

describe('requiredAngles', () => {
  it('extremos por grandeza e por lado', () => {
    const list = [sample(45, 0), sample(30, 0), sample(30, 45), sample(40, -60)];
    const a = requiredAngles(list);
    expect(a.alpha!.external).toBeCloseTo(30, 12); // perfil de (30°, 0°)
    expect(a.alpha!.internal).toBeCloseTo(60, 12);
    // (30°, 45°): perfil atan(tan 30° / cos 45°) = 39,23°; γ = atan(tan 30° / sen 45°) = 39,23°.
    expect(a.gammaRight!.external).toBeCloseTo(
      Math.atan(Math.tan(30 * RAD) / Math.sin(45 * RAD)) / RAD,
      12,
    );
    expect(a.gammaLeft!.external).toBeCloseTo(
      Math.atan(Math.tan(40 * RAD) / Math.sin(60 * RAD)) / RAD,
      12,
    );
    expect(a.betaRight!.external).toBeCloseTo(45, 12);
    expect(a.betaLeft!.external).toBeCloseTo(60, 12);
    expect(a.alphaMax!.sample).toBe(list[3]); // (40°, −60°): perfil atan(tan 40° / cos 60°) = 59,2°
  });

  it('sem amostras: nada exigido', () => {
    const a = requiredAngles([]);
    expect(a.alpha).toBeNull();
    expect(sizeOverhang(WINDOW, a)).toEqual({ ok: false, reason: 'noSun' });
  });
});

describe('dimensões (seção 10.3)', () => {
  const angles = requiredAngles([sample(45, 0), sample(45, 30), sample(45, -30)]);

  it('brise: D = (H + e) · cot α_ext; prolongamentos (H + e) · cot γ_ext', () => {
    const r = sizeOverhang({ width: 1.2, height: 1.5 }, angles, { above: 0.5 });
    if (!r.ok) throw new Error();
    expect(r.device.depth).toBeCloseTo(2, 12); // perfil mínimo 45°: D = 2,0 · 1
    const g = angles.gammaRight!.external;
    expect(r.device.extendRight).toBeCloseTo(2 / Math.tan(g * RAD), 12);
    expect(r.device.extendLeft).toBeCloseTo(r.device.extendRight, 12); // simétrico
  });

  it('brise afastado: e = g · tan α2_ext e D = (H + e) · cot α1_ext − g', () => {
    const a = requiredAngles([sample(30, 0), sample(60, 0)]);
    const r = sizeOverhang(WINDOW, a, { gap: 0.2 });
    if (!r.ok) throw new Error();
    expect(r.device.above).toBeCloseTo(0.2 * Math.tan(60 * RAD), 12);
    expect(r.device.depth).toBeCloseTo(
      (1 + 0.2 * Math.tan(60 * RAD)) / Math.tan(30 * RAD) - 0.2,
      12,
    );
  });

  it('aletas: D = W · cot β_ext; prolongamento acima da verga W · tan γ_ext máx', () => {
    const a = requiredAngles([sample(10, 60), sample(30, 70)]);
    const f = sizeFins({ width: 1.2, height: 1 }, a);
    expect(f.left).toBeNull();
    expect(f.right!.depth).toBeCloseTo(1.2 / Math.tan(60 * RAD), 12);
    const top = Math.max(...[sample(10, 60), sample(30, 70)].map((p) => p.gamma));
    expect(f.right!.extendAbove).toBeCloseTo(1.2 * Math.tan(top * RAD), 12);
  });

  it('subdivisão: corda e passo divididos por n; aletas com n + 1 lâminas e o β mais exigente', () => {
    const r = sizeOverhang(WINDOW, angles);
    if (!r.ok) throw new Error();
    const l = subdivideOverhang(WINDOW, r.device, 4);
    expect([l.count, l.chord, l.pitch]).toEqual([4, r.device.depth / 4, 0.25]);
    expect(l.chord / l.pitch).toBeCloseTo(r.device.depth / 1, 12); // tan α_int igual
    const f = sizeFins(WINDOW, requiredAngles([sample(20, 50), sample(20, -70)]));
    const v = subdivideFins(WINDOW, f, 2);
    expect(v.count).toBe(3);
    expect(v.chord).toBeCloseTo(Math.max(f.right!.depth, f.left!.depth) / 2, 12);
    expect(() => subdivideOverhang(WINDOW, { ...r.device, gap: 0.1 }, 2)).toThrow(RangeError);
  });
});

describe('janela recuada (seções 10.3 e 10.4)', () => {
  const angles = requiredAngles([sample(45, 0), sample(45, 30), sample(45, -30), sample(20, 70)]);

  it('brise: profundidade descontando o recuo; prolongamentos pelo γ, sem desconto', () => {
    const plain = sizeOverhang(WINDOW, angles);
    const deep = sizeOverhang({ ...WINDOW, setback: 0.2 }, angles);
    if (!plain.ok || !deep.ok) throw new Error();
    expect(deep.device.depth).toBeCloseTo(plain.device.depth - 0.2, 12);
    expect(deep.device.extendRight).toBe(plain.device.extendRight);
    const gap = sizeOverhang({ ...WINDOW, setback: 0.2 }, angles, { gap: 0.1 });
    if (!gap.ok) throw new Error();
    const rise = 1 + 0.1 * Math.tan(angles.alphaMax!.external * RAD);
    expect(gap.device.above).toBeCloseTo(rise - 1, 12);
    expect(gap.device.depth).toBeCloseTo(rise / Math.tan(angles.alpha!.external * RAD) - 0.3, 12);
  });

  it('recuo que basta: H · tan α_int ≤ d', () => {
    // perfil mínimo de 45°: H · cot 45° = 1 m
    expect(sizeOverhang({ ...WINDOW, setback: 1.001 }, angles)).toEqual({
      ok: false,
      reason: 'setbackSuffices',
    });
    expect(sizeOverhang({ ...WINDOW, setback: 0.999 }, angles).ok).toBe(true);
    expect(() => sizeOverhang({ ...WINDOW, setback: -0.1 }, angles)).toThrow(RangeError);
  });

  it('lâminas: corda (D + d) / n = p · tan α_int; com n = 1, o próprio brise', () => {
    const r = sizeOverhang({ ...WINDOW, setback: 0.2 }, angles);
    if (!r.ok) throw new Error();
    const l = subdivideOverhang({ ...WINDOW, setback: 0.2 }, r.device, 4);
    expect(l.chord).toBeCloseTo((r.device.depth + 0.2) / 4, 12);
    expect(l.chord / l.pitch).toBeCloseTo(1 / Math.tan(angles.alpha!.external * RAD), 12);
    expect(subdivideOverhang({ ...WINDOW, setback: 0.2 }, r.device, 1).chord).toBe(r.device.depth);
  });

  it('aletas: profundidade W · tan β_int − d; ombreira que basta de um lado', () => {
    const a = requiredAngles([sample(10, 60), sample(30, 70), sample(10, -80)]);
    const plain = sizeFins(WINDOW, a);
    expect(plain.setbackSuffices).toEqual({ right: false, left: false });
    // β esquerdo de 80°: W · cot 80° = 0,176 m; β direito de 60°: 0,577 m
    const f = sizeFins({ ...WINDOW, setback: 0.2 }, a);
    expect(f.right!.depth).toBeCloseTo(plain.right!.depth - 0.2, 12);
    expect(f.right!.extendAbove).toBe(plain.right!.extendAbove);
    expect(f.left).toBeNull();
    expect(f.setbackSuffices).toEqual({ right: false, left: true });
    const v = subdivideFins({ ...WINDOW, setback: 0.2 }, f, 2);
    expect(v.chord).toBeCloseTo((f.right!.depth + 0.2) / 2, 12);
  });
});

describe('periodSamples', () => {
  const site = { latitude: -27.67, longitude: -48.547, elevation: 6.1, timeZone: -3 };

  it('datas passando pelo fim do ano e pontas das horas incluídas', () => {
    const r = periodSamples(site, 0, {
      start: { month: 12, day: 30 },
      end: { month: 1, day: 2 },
      startHour: 10,
      endHour: 11,
      timeBase: 'legal',
      stepMinutes: 30,
    });
    expect(r.total).toBe(4 * 3);
  });

  it('hora solar: ao meio-dia solar, o sol está no meridiano (ψ = 0° numa fachada Norte)', () => {
    const r = periodSamples(site, 0, {
      start: { month: 6, day: 21 },
      end: { month: 6, day: 21 },
      startHour: 12,
      endHour: 12,
      timeBase: 'solar',
    });
    expect(r.samples).toHaveLength(1);
    expect(Math.abs(r.samples[0]!.psi)).toBeLessThan(1e-3);
  });

  it('recusa horas invertidas e passo não positivo', () => {
    const p = { start: { month: 1, day: 1 }, end: { month: 1, day: 1 } };
    expect(() => periodSamples(site, 0, { ...p, startHour: 15, endHour: 9 })).toThrow(RangeError);
    expect(() =>
      periodSamples(site, 0, { ...p, startHour: 9, endHour: 15, stepMinutes: 0 }),
    ).toThrow(RangeError);
  });
});

describe('direção de cada amostra e contorno do período na carta', () => {
  const site = { latitude: -15.78, longitude: -47.93, elevation: 1060, timeZone: -3 };

  it('altura e azimute de cada amostra são os do vetor no referencial da fachada', () => {
    const orientation = 30;
    const { samples } = periodSamples(site, orientation, {
      start: { month: 3, day: 1 },
      end: { month: 3, day: 3 },
      startHour: 8,
      endHour: 16,
      stepMinutes: 60,
    });
    expect(samples.length).toBeGreaterThan(5);
    for (const p of samples) {
      expect(Math.sin(p.altitude * RAD)).toBeCloseTo(p.s.z, 12);
      const az = (orientation + Math.atan2(p.s.x, p.s.y) / RAD + 360) % 360;
      expect(Math.abs(((p.azimuth - az + 540) % 360) - 180)).toBeLessThan(1e-9);
    }
  });

  /** Ponto dentro do polígono (regra par-ímpar), em coordenadas da carta. */
  function inside(poly: { x: number; y: number }[], x: number, y: number) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const b = poly[j]!;
      if (a.y > y !== b.y > y && x < b.x + ((y - b.y) * (a.x - b.x)) / (a.y - b.y)) c = !c;
    }
    return c;
  }

  for (const [name, start, end] of [
    [
      'verão, passando pelo solstício e pelo fim do ano',
      { month: 11, day: 21 },
      { month: 2, day: 21 },
    ],
    ['inverno', { month: 5, day: 1 }, { month: 8, day: 31 }],
    ['ano inteiro', { month: 1, day: 1 }, { month: 12, day: 31 }],
  ] as const) {
    it(`hora solar: todas as posições do sol do período ficam dentro do contorno (${name})`, () => {
      const period = { start, end, startHour: 9, endHour: 15, timeBase: 'solar' as const };
      const outline = periodOutline(site, period).map((d) => project(90 - d.altitude, d.azimuth));
      expect(outline.length).toBeGreaterThan(20);
      // Todas as posições do período, inclusive atrás da fachada (orientação qualquer, ψ ignorado):
      // as amostras numa fachada para o Norte e numa para o Sul cobrem o céu do período.
      let checked = 0;
      for (const orientation of [0, 180]) {
        for (const p of periodSamples(site, orientation, { ...period, stepMinutes: 20 }).samples) {
          const c = project(90 - p.altitude, p.azimuth);
          const near = outline.some((q) => Math.hypot(q.x - c.x, q.y - c.y) < 0.01);
          expect(inside(outline, c.x, c.y) || near, `${p.month}/${p.day} ${p.hour} h`).toBe(true);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(500);
      // E pontos claramente fora (antes das 8 h e depois das 16 h solares) ficam fora.
      const out = periodSamples(site, 0, { ...period, startHour: 7, endHour: 7.5 }).samples;
      const out2 = periodSamples(site, 180, { ...period, startHour: 7, endHour: 7.5 }).samples;
      for (const p of [...out, ...out2]) {
        const c = project(90 - p.altitude, p.azimuth);
        expect(inside(outline, c.x, c.y), `${p.month}/${p.day} ${p.hour} h`).toBe(false);
      }
    });
  }
});
