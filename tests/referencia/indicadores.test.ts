// Indicadores de sombreamento (F3.5) contra a referência independente
// docs/validacao/scripts/indicadores.py: fração ensolarada com o pvlib (NREL SPA) e o shapely, DNI
// lida do EPW em Python e classes da referência do F3.4, no ano inteiro.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/core/chart/sunChart';
import { classifyHours, DEFAULT_METHOD } from '../../src/core/comfort/classification';
import { parseEpw } from '../../src/core/epw/parseEpw';
import { buildScene, type Device, type WindowGeometry } from '../../src/core/shading/geometry';
import { hourlyShading, sunSamples, type SunSamples } from '../../src/core/shading/hourly';
import {
  beamIndicators,
  hourlyBeam,
  sunUpFraction,
  type DniWithinHour,
} from '../../src/core/shading/indicators';

const root = fileURLToPath(new URL('../../', import.meta.url));

interface Totals {
  incident: number;
  admitted: number;
  blocked: number;
  hours: number;
}
interface Combination {
  local: string;
  cena: string;
  dni_na_hora: DniWithinHour;
  por_classe: Record<'hot' | 'cold' | 'neutral' | 'none', Totals>;
  bloqueado_nas_quentes: number | null;
  admitido_nas_frias: number | null;
  dni_ausente: number;
  horas: [number, number, number][];
}
interface SceneRef {
  id: string;
  orientacao: number;
  janela: WindowGeometry;
  dispositivos: Device[];
}
const data = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/indicadores/indicadores.json`, 'utf-8'),
) as {
  locais: Record<string, Site>;
  arquivos: Record<string, string>;
  cenas: SceneRef[];
  combinacoes: Combination[];
};

const available = Object.values(data.arquivos).every((f) => existsSync(`${root}.cache/epw/${f}`));

const relClose = (actual: number, expected: number, tol = 1e-6) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(expected)));

describe.skipIf(!available)('indicadores contra pvlib, shapely e a DNI do EPW', () => {
  const sun = new Map<string, SunSamples>();
  const epws = new Map<string, ReturnType<typeof parseEpw>>();
  for (const c of data.combinacoes) {
    const ref = data.cenas.find((s) => s.id === c.cena)!;
    it(`${c.local}, ${c.cena}, DNI ${c.dni_na_hora}`, () => {
      if (!sun.has(c.local)) sun.set(c.local, sunSamples(data.locais[c.local]!));
      if (!epws.has(c.local)) {
        epws.set(
          c.local,
          parseEpw(readFileSync(`${root}.cache/epw/${data.arquivos[c.local]}`, 'utf-8')),
        );
      }
      const samples = sun.get(c.local)!;
      const epw = epws.get(c.local)!;
      const shading = hourlyShading(
        samples,
        buildScene(ref.janela, ref.dispositivos),
        ref.orientacao,
      );
      const beam = hourlyBeam(shading, epw, epw.fields.directNormal, {
        within: c.dni_na_hora,
        sunUp: c.dni_na_hora === 'whileSunUp' ? sunUpFraction(samples) : undefined,
      });
      for (const [i, e0, e] of c.horas) {
        relClose(beam.incident[i]!, e0);
        relClose(beam.admitted[i]!, e);
      }
      const classes = classifyHours(epw.fields.dryBulb, DEFAULT_METHOD, 'mean').classes;
      const r = beamIndicators(beam, classes);
      for (const k of ['hot', 'cold', 'neutral', 'none'] as const) {
        relClose(r.byClass[k].incident, c.por_classe[k].incident);
        relClose(r.byClass[k].admitted, c.por_classe[k].admitted);
        relClose(r.byClass[k].blocked, c.por_classe[k].blocked);
        expect(r.byClass[k].hours).toBe(c.por_classe[k].hours);
      }
      for (const [actual, expected] of [
        [r.blockedInHot, c.bloqueado_nas_quentes],
        [r.admittedInCold, c.admitido_nas_frias],
      ] as const) {
        if (expected === null) expect(actual).toBeNull();
        else expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(1e-6);
      }
      expect(r.missingDni).toBe(c.dni_ausente);
    });
  }
});
