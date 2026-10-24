// Leitor do CSV do SOL-AR 6.2 contra referência independente (módulo csv do Python):
// docs/validacao/scripts/gerar_referencia_csv62.py -> docs/validacao/casos/solar-6.2/referencia-csv.json.
// Os 15 arquivos embarcados no 6.2 (sem cabeçalho) e o exemplo do formato "Incluir Nova Cidade"
// (com cabeçalho de local) são versionados (decisão 0010).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EPW_FIELD_NAMES, type EpwData, type EpwFieldName } from '../../src/core/epw/parseEpw';
import { parseSolar62, solar62Header } from '../../src/core/epw/parseSolar62';

const dir = new URL('../../docs/validacao/casos/solar-6.2/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), 'utf-8');

interface FieldRef {
  ausentes: number;
  soma: number;
  minimo: number | null;
  maximo: number | null;
}
interface Instant {
  mes: number;
  dia: number;
  hora: number;
  tbs: number;
}
interface FileRef {
  linhas: number;
  linhas_vazias: number;
  primeira: Instant;
  ultima: Instant;
  campos: Record<EpwFieldName, FieldRef>;
  local?: { nome: string; latitude: number; longitude: number; fuso: number; elevacao: number };
  dados_identicos_a_concepcion_csv?: boolean;
}

const reference = JSON.parse(read('referencia-csv.json')) as { arquivos: Record<string, FileRef> };
const INCLUSION = 'formato-inclusao/CHL_Concepcion_NormaIWEC_SOlAr.csv';
const embedded = Object.entries(reference.arquivos).filter(([name]) => name !== INCLUSION);

// Unidade do arquivo -> unidade da aplicação (a do EPW): só a pressão muda, de kPa para Pa.
const FACTOR: Partial<Record<EpwFieldName, number>> = { pressure: 1000 };
// Os arquivos embarcados não têm local; qualquer local válido serve para conferir os dados.
const PLACE = { name: 'teste', latitude: -27.67, longitude: -48.547, timeZone: -3, elevation: 6.1 };

function expectMatches(epw: EpwData, ref: FileRef) {
  expect(epw.hours).toBe(ref.linhas);
  expect(epw.hasLeapDay).toBe(false);
  const n = epw.hours - 1;
  expect([epw.month[0], epw.day[0], epw.hour[0], epw.fields.dryBulb[0]]).toEqual([
    ref.primeira.mes,
    ref.primeira.dia,
    ref.primeira.hora,
    ref.primeira.tbs,
  ]);
  expect([epw.month[n], epw.day[n], epw.hour[n], epw.fields.dryBulb[n]]).toEqual([
    ref.ultima.mes,
    ref.ultima.dia,
    ref.ultima.hora,
    ref.ultima.tbs,
  ]);
  for (const name of Object.keys(ref.campos) as EpwFieldName[]) {
    const f = ref.campos[name];
    const k = FACTOR[name] ?? 1;
    const values = Array.from(epw.fields[name]).filter((v) => !Number.isNaN(v));
    expect(epw.missing[name], name).toBe(f.ausentes);
    expect(values.length, name).toBe(ref.linhas - f.ausentes);
    const sum = values.reduce((a, b) => a + b, 0);
    // A soma da referência está arredondada em 10⁻⁶ (na unidade do arquivo).
    expect(Math.abs(sum - f.soma * k), name).toBeLessThanOrEqual(
      1e-6 * k + 1e-12 * Math.abs(f.soma * k),
    );
    if (f.minimo === null || f.maximo === null) {
      expect(values.length, name).toBe(0);
    } else {
      expect(Math.min(...values), name).toBeCloseTo(f.minimo * k, 9);
      expect(Math.max(...values), name).toBeCloseTo(f.maximo * k, 9);
    }
  }
}

describe('parseSolar62 contra o módulo csv do Python', () => {
  it('a referência cobre os 15 arquivos do 6.2 e o exemplo de inclusão', () => {
    expect(embedded).toHaveLength(15);
    expect(reference.arquivos[INCLUSION]).toBeDefined();
  });

  it.each(embedded)('%s', (name, ref) => {
    const text = read(name);
    expect(solar62Header(text)).toBeNull();
    const epw = parseSolar62(text, PLACE);
    expectMatches(epw, ref);
    expect(epw.location).toMatchObject({
      city: PLACE.name,
      latitude: PLACE.latitude,
      longitude: PLACE.longitude,
      timeZone: PLACE.timeZone,
      elevation: PLACE.elevation,
    });
  });

  it('formato de inclusão: local do cabeçalho (longitude leste positiva) e os mesmos dados de concepcion.csv', () => {
    const ref = reference.arquivos[INCLUSION]!;
    const text = read(INCLUSION);
    expect(solar62Header(text)).toEqual({
      name: ref.local!.nome,
      latitude: ref.local!.latitude,
      longitude: ref.local!.longitude,
      timeZone: ref.local!.fuso,
      elevation: ref.local!.elevacao,
    });
    const inclusion = parseSolar62(text);
    expect(inclusion.location).toMatchObject({
      city: 'Concepcion',
      latitude: -36.77,
      longitude: -73.05,
      timeZone: -4,
      elevation: 16,
    });
    expectMatches(inclusion, ref);

    expect(ref.dados_identicos_a_concepcion_csv).toBe(true);
    const embeddedCopy = parseSolar62(read('concepcion.csv'), PLACE);
    for (const name of EPW_FIELD_NAMES) {
      expect(Array.from(inclusion.fields[name]), name).toEqual(
        Array.from(embeddedCopy.fields[name]),
      );
    }
  });
});
