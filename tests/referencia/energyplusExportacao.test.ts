// Exportação para o EnergyPlus e para o CAD (F5.2; spec 13, seção 13.6): teste de ida e volta.
// A aplicação exporta os arquivos das cenas de teste (as 8 do F3.8 e 3 novas) para
// docs/validacao/casos/energyplus/exportacao/; docs/validacao/scripts/energyplus_exportacao.py
// roda o EnergyPlus 26.2 nos modelos exportados, confere as superfícies que ele montou contra as
// placas num cálculo independente em Python e lê os DXF com o ezdxf. Aqui:
// - os arquivos exportados pelo código de agora são os mesmos que o EnergyPlus rodou;
// - a fração ensolarada do EnergyPlus nos modelos exportados é a da aplicação, com o mesmo sol;
// - nas cenas do F3.8, é a mesma do modelo do F3.8 (placas como Shading:Building:Detailed);
// - a geometria e os DXF passaram nas conferências do script.
// Para regenerar os arquivos: ATUALIZAR_EXPORTACAO=1 npx vitest run tests/referencia/energyplusExportacao.test.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/core/chart/sunChart';
import { parseFenestration, placementFromVertices } from '../../src/core/energyplus/frame';
import { modelIdf, objectsIdf } from '../../src/core/energyplus/idf';
import { planExport } from '../../src/core/energyplus/plan';
import { buildScene, type Device, type WindowGeometry } from '../../src/core/shading/geometry';
import { HOURS_PER_YEAR } from '../../src/core/shading/hourly';
import { sunOnWindow } from '../../src/core/shading/shadedFraction';
import { drawingsDxf } from '../../src/ui/geometry/dxf';
import { energyPlusSun, sunlit } from './energyplusSol';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = `${root}docs/validacao/casos/energyplus/exportacao/`;
const UPDATE = process.env.ATUALIZAR_EXPORTACAO === '1';
const STEPS = 6;

interface SceneDef {
  id: string;
  local: string;
  orientacao: number;
  origem?: [number, number, number];
  janela: WindowGeometry;
  dispositivos: Device[];
}

const f38 = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/energyplus/fracao-ensolarada.json`, 'utf-8'),
) as { locais: Record<string, Site>; cenas: (SceneDef & { horaria: number[] })[] };
const novas = JSON.parse(readFileSync(`${dir}cenas.json`, 'utf-8')) as { cenas: SceneDef[] };

/** null (JSON) = prolongamento infinito. */
function devices(list: Device[]): Device[] {
  return list.map(
    (d) =>
      Object.fromEntries(
        Object.entries(d).map(([k, v]) => [k, v === null ? Infinity : v]),
      ) as unknown as Device,
  );
}

const scenes: SceneDef[] = [...f38.cenas, ...novas.cenas].map((s) => ({
  ...s,
  dispositivos: devices(s.dispositivos),
}));
const DXF_SCENES = ['grelha-oeste', 'laminas-sudeste-recuo', 'placas-livres-sul'];
const NAMES = { window: 'JANELA', wall: 'PAREDE_FRENTE' };

const meta = (s: SceneDef) => ({
  source: 'SOL-AR (teste de referencia do F5.2)',
  siteName: s.local,
  orientation: s.orientacao,
});

/** Arquivos que a aplicação exporta para a cena. */
function exported(s: SceneDef): Record<string, string> {
  const site = f38.locais[s.local]!;
  if (s.origem) {
    // A janela vem do modelo base escrito pelo script em Python, com outra origem.
    const base = readFileSync(`${dir}${s.id}-base.idf`, 'utf-8');
    const pasted = parseFenestration(base);
    const placement = placementFromVertices(pasted.vertices);
    return {
      [`${s.id}-objetos.idf`]: objectsIdf({
        window: s.janela,
        devices: s.dispositivos,
        names: { window: pasted.name, wall: pasted.baseSurface },
        frame: placement.frame,
        pasted: true,
        meta: meta(s),
      }),
    };
  }
  const files: Record<string, string> = {
    [`${s.id}.idf`]: modelIdf({
      window: s.janela,
      devices: s.dispositivos,
      names: NAMES,
      site: { name: s.local, ...site },
      meta: meta(s),
    }),
  };
  if (DXF_SCENES.includes(s.id)) {
    files[`${s.id}.dxf`] = drawingsDxf(s.janela, s.dispositivos, { title: s.id });
  }
  return files;
}

interface Results {
  energyplus: string;
  cenas: Record<
    string,
    {
      horaria: number[];
      objetos: Record<string, number>;
      geometria: { superficies: number; nao_casadas: number; distancia_maxima: number };
    }
  >;
  dxf: Record<
    string,
    { erros: number; correcoes: number; vidro: boolean; distancia_maxima: number; pecas: number }
  >;
}
const resultsPath = `${dir}resultados.json`;
const results: Results | null = existsSync(resultsPath)
  ? (JSON.parse(readFileSync(resultsPath, 'utf-8')) as Results)
  : null;

/** Número de superfícies de sombreamento que o EnergyPlus monta para a cena (sem as Mir-). */
function surfaceCount(s: SceneDef): number {
  const plan = planExport(s.janela, s.dispositivos, 'JANELA');
  return plan.items.reduce((n, it) => n + (it.type === 'Shading:Fin:Projection' ? 2 : 1), 0);
}

function objectCounts(s: SceneDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of planExport(s.janela, s.dispositivos, 'JANELA').items) {
    out[it.type] = (out[it.type] ?? 0) + 1;
  }
  return out;
}

describe('exportação para o EnergyPlus: ida e volta (F5.2)', () => {
  it('os arquivos exportados são os que o EnergyPlus rodou', () => {
    for (const s of scenes) {
      for (const [name, text] of Object.entries(exported(s))) {
        if (UPDATE) writeFileSync(`${dir}${name}`, text);
        else expect(readFileSync(`${dir}${name}`, 'utf-8'), name).toBe(text);
      }
    }
  });

  it('os resultados do EnergyPlus 26.2 estão gravados para todas as cenas', () => {
    expect(results, 'rode docs/validacao/scripts/energyplus_exportacao.py').not.toBeNull();
    expect(results!.energyplus).toMatch(/^26\.2\.0/);
    expect(Object.keys(results!.cenas).sort()).toEqual(scenes.map((s) => s.id).sort());
  });

  it('cada cena usa os objetos previstos na spec 13', () => {
    const byId = Object.fromEntries(scenes.map((s) => [s.id, objectCounts(s)]));
    expect(byId['brise-norte']).toEqual({ 'Shading:Overhang:Projection': 1 });
    expect(byId['grelha-oeste']).toEqual({
      'Shading:Overhang:Projection': 1,
      'Shading:Fin:Projection': 1,
    });
    expect(byId['projecao-assimetrica']).toEqual({
      'Shading:Overhang:Projection': 1,
      'Shading:Fin:Projection': 1,
    });
    expect(byId['aleta-sozinha-infinita']).toEqual({
      'Shading:Overhang:Projection': 1,
      'Shading:Zone:Detailed': 1,
    });
    expect(byId['recuo-noroeste']).toEqual({ 'Shading:Zone:Detailed': 4 });
    expect(byId['brise-afastado-aletas']).toEqual({ 'Shading:Building:Detailed': 3 });
    expect(byId['objetos-no-modelo']).toEqual({
      'Shading:Zone:Detailed': 5,
      'Shading:Building:Detailed': 3,
    });
    for (const s of scenes) expect(results!.cenas[s.id]!.objetos, s.id).toEqual(byId[s.id]);
  });

  describe.each(scenes)('$id ($local, fachada a $orientacao°)', (s) => {
    const site = f38.locais[s.local]!;
    const scene = buildScene(s.janela, s.dispositivos);

    it('geometria: o EnergyPlus montou as placas da aplicação (até 2 × 10⁻⁵ m)', () => {
      const g = results!.cenas[s.id]!.geometria;
      expect(g.superficies).toBe(surfaceCount(s));
      expect(g.nao_casadas).toBe(0);
      expect(g.distancia_maxima).toBeLessThanOrEqual(2e-5);
    });

    it('fração ensolarada hora a hora igual à da aplicação, com o sol do EnergyPlus', () => {
      const ep = results!.cenas[s.id]!.horaria;
      expect(ep).toHaveLength(HOURS_PER_YEAR);
      let worst = 0;
      let grazingHours = 0;
      let hour = 0;
      for (let day = 1; day <= 365; day++) {
        for (let h = 1; h <= 24; h++, hour++) {
          let sum = 0;
          let grazing = false;
          for (let step = 1; step <= STEPS; step++) {
            const sun = energyPlusSun(site, s.orientacao, day, h, step, STEPS);
            sum += sunlit(scene, sun);
            const cos = sun && sunOnWindow(sun) ? sun.y : 0;
            if (cos > 0 && cos < 1e-3) grazing = true;
          }
          if (grazing) {
            grazingHours++;
            continue;
          }
          worst = Math.max(worst, Math.abs(sum / STEPS - ep[hour]!));
        }
      }
      expect(worst).toBeLessThanOrEqual(1e-4);
      expect(grazingHours).toBeLessThanOrEqual(0.01 * HOURS_PER_YEAR);
    });

    const ref = f38.cenas.find((c) => c.id === s.id);
    it.runIf(ref)('cenas do F3.8: igual ao modelo do F3.8 no EnergyPlus', () => {
      const ep = results!.cenas[s.id]!.horaria;
      let worst = 0;
      let hour = 0;
      for (let day = 1; day <= 365; day++) {
        for (let h = 1; h <= 24; h++, hour++) {
          let grazing = false;
          for (let step = 1; step <= STEPS; step++) {
            const sun = energyPlusSun(site, s.orientacao, day, h, step, STEPS);
            const cos = sun && sunOnWindow(sun) ? sun.y : 0;
            if (cos > 0 && cos < 1e-3) grazing = true;
          }
          if (!grazing) worst = Math.max(worst, Math.abs(ep[hour]! - ref!.horaria[hour]!));
        }
      }
      expect(worst).toBeLessThanOrEqual(1e-4);
    });
  });

  it.each(DXF_SCENES)('DXF de %s: abre no ezdxf e tem as placas da aplicação', (id) => {
    const d = results!.dxf[id]!;
    expect(d.erros).toBe(0);
    expect(d.correcoes).toBe(0);
    expect(d.vidro).toBe(true);
    expect(d.pecas).toBeGreaterThan(0);
    expect(d.distancia_maxima).toBeLessThanOrEqual(1e-6);
  });
});
