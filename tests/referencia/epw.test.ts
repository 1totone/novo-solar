// Leitor de EPW contra referência independente (pvlib.iotools.read_epw), nos 6 EPWs de teste.
// Os EPWs não são versionados (decisão 0010): baixe com
//   python3 docs/validacao/scripts/baixar_epw.py
// No CI, a ausência dos arquivos é erro; fora do CI, os testes são pulados com aviso.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEpw, type EpwFieldName } from '../../src/core/epw/parseEpw';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cacheDir = `${root}.cache/epw/`;

interface FieldRef {
  ausentes: number;
  soma: number;
  minimo: number | null;
  maximo: number | null;
}
interface FileRef {
  arquivo: string;
  local: {
    cidade: string;
    estado: string;
    pais: string;
    wmo: string;
    latitude: number;
    longitude: number;
    fuso: number;
    elevacao: number;
  };
  horas: number;
  primeira: { mes: number; dia: number; hora: number; tbs: number };
  ultima: { mes: number; dia: number; hora: number; tbs: number };
  campos: Record<EpwFieldName, FieldRef>;
}

const reference = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/epw/referencia-pvlib.json`, 'utf-8'),
) as { arquivos: Record<string, FileRef> };

const entries = Object.entries(reference.arquivos);
const available = entries.every(([, ref]) => existsSync(cacheDir + ref.arquivo));

if (!available && process.env.CI) {
  throw new Error(
    'EPWs de teste ausentes em .cache/epw/. Rode docs/validacao/scripts/baixar_epw.py.',
  );
}
if (!available) {
  console.warn('EPWs de teste ausentes em .cache/epw/; testes de referência do EPW pulados.');
}

describe.skipIf(!available)('parseEpw contra pvlib.iotools.read_epw', () => {
  it.each(entries)('%s', (_id, ref) => {
    const epw = parseEpw(readFileSync(cacheDir + ref.arquivo, 'utf-8'));

    expect(epw.location).toMatchObject({
      city: ref.local.cidade,
      state: ref.local.estado,
      country: ref.local.pais,
      wmo: ref.local.wmo,
      latitude: ref.local.latitude,
      longitude: ref.local.longitude,
      timeZone: ref.local.fuso,
      elevation: ref.local.elevacao,
    });
    expect(epw.hours).toBe(ref.horas);
    const last = epw.hours - 1;
    expect([epw.month[0], epw.day[0], epw.hour[0], epw.fields.dryBulb[0]]).toEqual([
      ref.primeira.mes,
      ref.primeira.dia,
      ref.primeira.hora,
      ref.primeira.tbs,
    ]);
    expect([epw.month[last], epw.day[last], epw.hour[last], epw.fields.dryBulb[last]]).toEqual([
      ref.ultima.mes,
      ref.ultima.dia,
      ref.ultima.hora,
      ref.ultima.tbs,
    ]);

    for (const [name, f] of Object.entries(ref.campos) as [EpwFieldName, FieldRef][]) {
      const values = epw.fields[name];
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      for (const v of values) {
        if (Number.isNaN(v)) continue;
        sum += v;
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
      expect(epw.missing[name], `${name}: ausentes`).toBe(f.ausentes);
      // Soma de 8760 valores com uma casa decimal: diferenças só de arredondamento binário.
      expect(Math.abs(sum - f.soma), `${name}: soma`).toBeLessThanOrEqual(
        1e-6 * Math.max(1, Math.abs(f.soma)),
      );
      if (f.minimo !== null) expect(min, `${name}: mínimo`).toBe(f.minimo);
      if (f.maximo !== null) expect(max, `${name}: máximo`).toBe(f.maximo);
    }
  });
});
