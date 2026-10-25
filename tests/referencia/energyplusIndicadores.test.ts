// Indicadores (F3.5) nas 8 cenas do F3.8 contra docs/validacao/casos/energyplus/indicadores.json,
// gerado por docs/validacao/scripts/energyplus_indicadores.py com o EnergyPlus 26.2.0. O passo S4 é o
// método da aplicação recalculado em Python (SPA do pvlib no meio dos passos, DNI constante na hora,
// fração ensolarada do shapely): o núcleo tem de reproduzi-lo. O passo S0 é o EnergyPlus (DNI
// interpolada, sol do SUN3/SUN4 no fim dos passos): a diferença fica registrada no relatório do F3.5,
// com um limite de regressão, e não é critério de aceitação (decisão 0021).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/core/chart/sunChart';
import { classifyHours, DEFAULT_METHOD } from '../../src/core/comfort/classification';
import { parseEpw } from '../../src/core/epw/parseEpw';
import { buildScene, type Device, type WindowGeometry } from '../../src/core/shading/geometry';
import { hourlyShading, sunSamples } from '../../src/core/shading/hourly';
import { beamIndicators, hourlyBeam } from '../../src/core/shading/indicators';

const root = fileURLToPath(new URL('../../', import.meta.url));

interface Summary {
  quentes: { incidente: number; admitida: number };
  frias: { incidente: number; admitida: number };
  todas: { incidente: number; admitida: number };
  bloqueado_nas_quentes: number | null;
  admitido_nas_frias: number | null;
}
const ep = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/energyplus/indicadores.json`, 'utf-8'),
) as {
  cenas: {
    cena: string;
    local: string;
    dni_interpolacao_dif_max_w_m2: number;
    contabilidade_dif_max_w_m2: number;
    passos: Record<'S0' | 'S1' | 'S2' | 'S3' | 'S4', Summary>;
  }[];
};
const f38 = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/energyplus/fracao-ensolarada.json`, 'utf-8'),
) as {
  locais: Record<string, Site & { epw: string }>;
  cenas: { id: string; orientacao: number; janela: WindowGeometry; dispositivos: Device[] }[];
};

const available = Object.values(f38.locais).every((l) => existsSync(`${root}.cache/epw/${l.epw}`));

describe.skipIf(!available)('indicadores nas cenas do F3.8 (EnergyPlus 26.2.0)', () => {
  for (const c of ep.cenas) {
    it(`${c.cena}: núcleo igual ao método recalculado em Python; EnergyPlus dentro do limite de regressão`, () => {
      // Contabilidade do EnergyPlus entendida: DNI interpolada e radiação incidente reproduzidas.
      expect(c.dni_interpolacao_dif_max_w_m2).toBeLessThan(1e-9);
      expect(c.contabilidade_dif_max_w_m2).toBeLessThan(1e-9);

      const scene = f38.cenas.find((s) => s.id === c.cena)!;
      const local = f38.locais[c.local]!;
      const epw = parseEpw(readFileSync(`${root}.cache/epw/${local.epw}`, 'utf-8'));
      const shading = hourlyShading(
        sunSamples(local),
        buildScene(scene.janela, scene.dispositivos),
        scene.orientacao,
      );
      const r = beamIndicators(
        hourlyBeam(shading, epw, epw.fields.directNormal),
        classifyHours(epw.fields.dryBulb, DEFAULT_METHOD).classes,
      );
      const s4 = c.passos.S4;
      const kwh = (wh: number) => wh / 1000;
      const close = (a: number, b: number, tol: number) =>
        expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
      // Somas: 10⁻⁶ relativo (spec 09, seção 9.6), mais o arredondamento do arquivo (10⁻⁶ kWh/m²).
      const closeSum = (a: number, b: number) => close(a, b, 1e-6 * Math.abs(b) + 1e-6);
      closeSum(kwh(r.byClass.hot.incident), s4.quentes.incidente);
      closeSum(kwh(r.byClass.hot.admitted), s4.quentes.admitida);
      closeSum(kwh(r.byClass.cold.incident), s4.frias.incidente);
      closeSum(kwh(r.byClass.cold.admitted), s4.frias.admitida);
      for (const [a, b] of [
        [r.blockedInHot, s4.bloqueado_nas_quentes],
        [r.admittedInCold, s4.admitido_nas_frias],
      ] as const) {
        if (b === null) expect(a).toBeNull();
        else close(a!, b, 2e-6);
      }

      // Limite de regressão contra o EnergyPlus (relatório do F3.5, seção 4).
      const s0 = c.passos.S0;
      const rel = (a: number, b: number) => Math.abs(a - b) / b;
      expect(rel(s4.todas.incidente, s0.todas.incidente)).toBeLessThanOrEqual(0.01);
      expect(rel(s4.todas.admitida, s0.todas.admitida)).toBeLessThanOrEqual(0.02);
      for (const k of ['bloqueado_nas_quentes', 'admitido_nas_frias'] as const) {
        if (s0[k] !== null) close(s4[k]!, s0[k], 0.01);
      }
    });
  }
});
