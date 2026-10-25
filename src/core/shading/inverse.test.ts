import { describe, expect, it } from 'vitest';
import {
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
