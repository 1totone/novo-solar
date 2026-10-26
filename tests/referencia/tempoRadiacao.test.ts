// Tempo da radiação de um arquivo (spec 04, seção 4.3), calculado na aplicação (F4.2): contra
// deslocamentos conhecidos em radiação sintética, contra o script do catálogo (F4.1, pvlib) nos
// TMYx 2011-2025 do Brasil e contra o ajuste do F2.7 nas TRY do SOL-AR 6.2 (outro método: o
// deslocamento que leva a extraterrestre do próprio arquivo à do SPA).
// Os EPWs não são versionados (decisão 0010); no CI a ausência é erro, fora dele o teste é pulado.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EPW_FIELD_NAMES, type EpwData } from '../../src/core/epw/hourly';
import { parseEpw } from '../../src/core/epw/parseEpw';
import { parseSolar62 } from '../../src/core/epw/parseSolar62';
import { radiationLag } from '../../src/core/epw/radiationTiming';
import { REFERENCE_YEAR } from '../../src/core/solar/constants';
import { solarPosition } from '../../src/core/solar/spa';
import { CITIES } from '../../src/ui/cities';

const root = fileURLToPath(new URL('../../', import.meta.url));
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Ano sem radiação, exceto no dia 21 de cada mês: a global da hora h é 70% da extraterrestre
 * horizontal do SPA integrada em [h − 1 − d, h − d] (12 instantes por hora), ou seja, a radiação
 * vem d minutos depois do sol.
 */
function synthetic(
  place: { latitude: number; longitude: number; timeZone: number },
  shiftMin: number,
): EpwData {
  const month = new Uint8Array(8760);
  const day = new Uint8Array(8760);
  const hour = new Uint8Array(8760);
  const fields = Object.fromEntries(
    EPW_FIELD_NAMES.map((n) => [n, new Float64Array(8760)]),
  ) as EpwData['fields'];
  let i = 0;
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= DAYS_IN_MONTH[m - 1]!; d++) {
      for (let h = 1; h <= 24; h++, i++) {
        month[i] = m;
        day[i] = d;
        hour[i] = h;
        if (d !== 21) continue;
        let acc = 0;
        for (let k = 0; k < 12; k++) {
          const t = h - 1 - shiftMin / 60 + (k + 0.5) / 12;
          const utc = Date.UTC(REFERENCE_YEAR, m - 1, d) + (t - place.timeZone) * 3_600_000;
          const z = solarPosition(utc, place.latitude, place.longitude, 0).zenith;
          acc += Math.max(0, Math.cos((z * Math.PI) / 180)) * 1361;
        }
        fields.globalHorizontal[i] = (0.7 * acc) / 12;
      }
    }
  }
  return {
    location: {
      city: 'sintético',
      state: '',
      country: '',
      source: '',
      wmo: '',
      elevation: 0,
      ...place,
    },
    comments: [],
    hours: 8760,
    hasLeapDay: false,
    month,
    day,
    hour,
    fields,
    missing: Object.fromEntries(EPW_FIELD_NAMES.map((n) => [n, 0])) as EpwData['missing'],
  };
}

describe('tempo da radiação: deslocamentos conhecidos (spec 04, seção 4.3)', () => {
  const places = [
    { name: 'Florianópolis', latitude: -27.67, longitude: -48.547, timeZone: -3 },
    { name: 'Manaus', latitude: -3.039, longitude: -60.05, timeZone: -4 },
    { name: 'Lisboa', latitude: 38.77, longitude: -9.13, timeZone: 0 },
  ];
  for (const place of places) {
    for (const shift of [-30, 0, 30, 60]) {
      it(`${place.name}, radiação ${shift} min depois do sol`, () => {
        expect(Math.abs(radiationLag(synthetic(place, shift))! - shift)).toBeLessThan(0.5);
      });
    }
  }

  it('sem radiação global: nulo', () => {
    const empty = synthetic(places[0]!, 0);
    empty.fields.globalHorizontal.fill(0);
    expect(radiationLag(empty)).toBeNull();
  });
});

// Valores do script do catálogo (F4.1): coluna atraso_ghi_dias_claros_min.
const catalog = new Map(
  readFileSync(`${root}docs/validacao/casos/catalogo/qualidade-tmyx.csv`, 'utf-8')
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const cols = line.split(',');
      return [cols[0]!, Number(cols[21])] as const;
    }),
);
const TMYX = [
  ['821110', 'BRA_AM_Manaus-Gomes.Intl.AP.821110_TMYx.2011-2025.epw'],
  ['833780', 'BRA_DF_Brasilia-Kubitschek.Intl.AP.833780_TMYx.2011-2025.epw'],
  ['821930', 'BRA_PA_Belem-Val.de.Cans.Intl.AP.821930_TMYx.2011-2025.epw'],
  ['839710', 'BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_TMYx.2011-2025.epw'],
  ['838990', 'BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw'],
] as const;
const available = TMYX.every(([, f]) => existsSync(`${root}.cache/epw/${f}`));
if (!available && process.env.CI) throw new Error('EPW de teste ausente no CI');

describe.skipIf(!available)('tempo da radiação: TMYx contra o script do catálogo (pvlib)', () => {
  for (const [id, file] of TMYX) {
    it(`${file.split('_')[2]!.split('.')[0]}: até 1 min do script`, () => {
      const epw = parseEpw(readFileSync(`${root}.cache/epw/${file}`, 'utf-8'));
      const expected = catalog.get(id)!;
      expect(Number.isFinite(expected)).toBe(true);
      expect(Math.abs(radiationLag(epw)! - expected)).toBeLessThanOrEqual(1);
    });
  }
});

// Atraso medido no F2.7 (docs/validacao/casos/solar-6.2/radiacao-csv.json): quando o modelo das
// TRY pôs o sol, pela extraterrestre do próprio arquivo contra o SPA do pvlib.
const f27 = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/solar-6.2/radiacao-csv.json`, 'utf-8'),
) as { arquivos: Record<string, { atraso_radiacao_min: number }> };

/**
 * Viés das nuvens, só com o arquivo: nos 30 dias de maior índice de claridade pela extraterrestre
 * do próprio arquivo, a média do centróide da global menos o da extraterrestre (min). A global
 * segue o sol do modelo, modulada pelas nuvens; se elas são diferentes de manhã e à tarde, o
 * centróide se desloca.
 */
function cloudBias(data: EpwData): number {
  const g = data.fields.globalHorizontal;
  const e = data.fields.extraterrestrialHorizontal;
  const days: { kt: number; lag: number }[] = [];
  for (let start = 0; start < data.hours; start += 24) {
    let sg = 0;
    let se = 0;
    let mg = 0;
    let me = 0;
    for (let i = start; i < start + 24; i++) {
      const t = data.hour[i]! - 0.5;
      sg += g[i]!;
      se += e[i]!;
      mg += g[i]! * t;
      me += e[i]! * t;
    }
    if (sg > 0 && se > 0) days.push({ kt: sg / se, lag: (mg / sg - me / se) * 60 });
  }
  const clear = days.sort((a, b) => b.kt - a.kt).slice(0, 30);
  return clear.reduce((acc, d) => acc + d.lag, 0) / clear.length;
}

describe('tempo da radiação: TRY do SOL-AR 6.2 contra o ajuste do F2.7', () => {
  for (const city of CITIES) {
    const h = city.historical;
    if (!h || h.kind !== 'try') continue;
    it(`${city.name}: até 1 min do F2.7 mais o viés das nuvens`, () => {
      const data = parseSolar62(
        readFileSync(`${root}docs/validacao/casos/solar-6.2/${h.file}`, 'latin1'),
        {
          name: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
          timeZone: city.timeZone,
          elevation: city.elevation,
        },
      );
      const bias = cloudBias(data);
      // Incerteza do método (spec 04, seção 4.3): até 10 min nas 14 TRY.
      expect(Math.abs(bias)).toBeLessThan(10);
      const expected = f27.arquivos[h.file]!.atraso_radiacao_min + bias;
      expect(Math.abs(radiationLag(data)! - expected)).toBeLessThanOrEqual(1);
    });
  }
});
