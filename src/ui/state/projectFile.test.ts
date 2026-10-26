import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT } from '../export/printOptions';
import projectV1 from './fixtures/projeto-v1.json?raw';
import { buildHash, parseHash } from './hashState';
import {
  PROJECT_FORMAT,
  PROJECT_SCHEMA,
  parseProject,
  serializeProject,
  type Project,
} from './projectFile';

// Arquivo de projeto (F4.7, spec 11, decisão 0028).

const APP = { version: '0.1.0', commit: 'abc1234' };
const SAVED = '2026-10-26T13:20:00.000Z';

/** Link com chaves de todos os passos (dos testes de ponta a ponta) e uma comparação. */
const KITCHEN_SINK =
  '#a1=55&a2=30&aba=rosa&bd1=30&be1=40&ca=90&cg=2&cm=a&cmp=local%3Drecife%26o%3D30&cn=20&cr=m' +
  '&cs=0&ct=f&dado=tbs&dt=0_45-30_30-330_30&esc=50&estacao=jun-ago&gad=50&hist=1&hl=a&ja=1' +
  '&jl=1%2C2&local=natal&o=200&pbe1=20&pc1=ad_0%2C4&pc2=lh_x_0%2C2_0%2C3&periodo=tarde&proj=cil' +
  '&rosa=vel&setores=16&tr=0&va=4%2C5&vh=q&vt=s';

const base = (over: Partial<Project> = {}): Project => ({
  state: { local: 'florianopolis', o: '30', a1: '55' },
  print: DEFAULT_PRINT,
  climateFile: null,
  compareClimateFile: null,
  ...over,
});

const ok = (text: string) => {
  const r = parseProject(text);
  if (!r.ok) throw new Error(`não abriu: ${JSON.stringify(r.error)}`);
  return r.project;
};

describe('arquivo de projeto: ida e volta', () => {
  it('formato, esquema, aplicação e data no topo; estado igual ao do link', () => {
    const text = serializeProject(base(), APP, SAVED);
    const json = JSON.parse(text) as Record<string, unknown>;
    expect(json).toMatchObject({
      format: PROJECT_FORMAT,
      schema: PROJECT_SCHEMA,
      app: APP,
      savedAt: SAVED,
      state: { local: 'florianopolis', o: '30', a1: '55' },
      climateFile: null,
      compareClimateFile: null,
    });
    expect(PROJECT_FORMAT).toBe('sol-ar-project');
    expect(PROJECT_SCHEMA).toBe(1);
    const back = ok(text);
    expect(back).toEqual({ ...base(), app: APP, savedAt: SAVED });
  });

  it('um link com chaves de todos os passos volta igual (compatível com os links atuais)', () => {
    const state = parseHash(KITCHEN_SINK);
    const back = ok(serializeProject(base({ state }), APP, SAVED));
    expect(buildHash(back.state)).toBe(KITCHEN_SINK);
    // Local de arquivo, com acentos no nome.
    const file =
      '#alt=6.1&fuso=-3&lat=-27.67&local=arquivo&lon=-48.547&nome=S%C3%A3o+Jos%C3%A9%2C+SC';
    expect(
      buildHash(ok(serializeProject(base({ state: parseHash(file) }), APP, SAVED)).state),
    ).toBe(file);
  });

  it('impressão e arquivos climáticos (o da comparação pode ser "o mesmo")', () => {
    const climateFile = {
      name: 'floripa.csv',
      format: 'csv' as const,
      hours: 8760,
      text: '1,1,1,20.0\n',
      location: { name: 'Teste', latitude: -27.6, longitude: -48.5, timeZone: -3, elevation: 5 },
    };
    const print = { ...DEFAULT_PRINT, radiusCm: 8.5, legend: false, protractorOnly: true };
    const p = base({ print, climateFile, compareClimateFile: 'same' });
    expect(ok(serializeProject(p, APP, SAVED))).toEqual({ ...p, app: APP, savedAt: SAVED });
    const other = { name: 'a.epw', format: 'epw' as const, hours: 8784, text: 'LOCATION,...' };
    const q = base({ compareClimateFile: other });
    expect(ok(serializeProject(q, APP, SAVED)).compareClimateFile).toEqual(other);
  });
});

describe('arquivo de projeto: abrir com cuidado', () => {
  const json = (o: unknown) => JSON.stringify(o);
  const minimal = { format: PROJECT_FORMAT, schema: 1, state: { o: '30' } };

  it('não é JSON ou não é um projeto do SOL-AR', () => {
    expect(parseProject('LOCATION,Florianopolis')).toEqual({
      ok: false,
      error: { kind: 'notProject' },
    });
    expect(parseProject(json({ ...minimal, format: 'outro' }))).toEqual({
      ok: false,
      error: { kind: 'notProject' },
    });
    expect(parseProject(json([1, 2]))).toEqual({ ok: false, error: { kind: 'notProject' } });
  });

  it('esquema mais novo é recusado; esquema inválido também', () => {
    expect(parseProject(json({ ...minimal, schema: 2 }))).toEqual({
      ok: false,
      error: { kind: 'newer', schema: 2 },
    });
    for (const schema of [0, 1.5, '1', null]) {
      expect(parseProject(json({ ...minimal, schema })), String(schema)).toEqual({
        ok: false,
        error: { kind: 'invalid', field: 'schema' },
      });
    }
  });

  it('só os textos entram no estado; impressão fora da faixa volta ao padrão', () => {
    const p = ok(
      json({
        ...minimal,
        state: { o: '30', a1: 55, tr: null, '': 'x', vh: 'q' },
        print: { radiusCm: 40, protractor: false, legend: 'sim' },
      }),
    );
    expect(p.state).toEqual({ o: '30', vh: 'q' });
    expect(p.print).toEqual({ ...DEFAULT_PRINT, protractor: false });
    // Sem impressão, sem arquivos e sem aplicação: os padrões.
    const q = ok(json(minimal));
    expect(q).toEqual({
      state: { o: '30' },
      print: DEFAULT_PRINT,
      climateFile: null,
      compareClimateFile: null,
    });
  });

  it('estado ausente e arquivo climático malformado são erros', () => {
    expect(parseProject(json({ format: PROJECT_FORMAT, schema: 1 }))).toEqual({
      ok: false,
      error: { kind: 'invalid', field: 'state' },
    });
    for (const climateFile of [
      { name: 'a.epw', format: 'xls', hours: 1, text: 'x' },
      { name: 'a.epw', format: 'epw', hours: 1 },
      { name: 'a.csv', format: 'csv', hours: 1, text: 'x', location: { latitude: 'a' } },
      'arquivo',
    ]) {
      expect(parseProject(json({ ...minimal, climateFile })), JSON.stringify(climateFile)).toEqual({
        ok: false,
        error: { kind: 'invalid', field: 'climateFile' },
      });
    }
    expect(parseProject(json({ ...minimal, compareClimateFile: 'outro' }))).toEqual({
      ok: false,
      error: { kind: 'invalid', field: 'compareClimateFile' },
    });
  });
});

describe('projeto de exemplo do esquema 1 (tem de abrir em todas as versões futuras)', () => {
  it('src/ui/state/fixtures/projeto-v1.json', () => {
    const p = ok(projectV1);
    expect(buildHash(p.state)).toBe('#a1=55&aba=rosa&local=florianopolis&o=30&va=3&vh=q&vt=c');
    expect(p.print).toEqual({ ...DEFAULT_PRINT, radiusCm: 8 });
    expect(p.climateFile).toBeNull();
    expect(p.app).toEqual({ version: '0.1.0', commit: 'f9b8675' });
    expect(p.savedAt).toBe('2026-10-26T13:20:00.000Z');
  });
});
