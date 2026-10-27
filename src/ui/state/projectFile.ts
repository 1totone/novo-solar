import type { Solar62Location } from '../../core/epw/parseSolar62';
import { DEFAULT_PRINT, type PrintOptions } from '../export/printOptions';
import type { HashState } from './hashState';

/**
 * Arquivo de projeto (F4.7, spec 11, decisão 0028): o estado do link, as opções de impressão e os
 * arquivos climáticos carregados, em JSON com versão de esquema.
 */
export const PROJECT_FORMAT = 'sol-ar-project';
export const PROJECT_SCHEMA = 1;

/** Arquivo climático carregado do computador, guardado no projeto como foi lido. */
export interface ClimateFileEntry {
  name: string;
  format: 'epw' | 'csv';
  hours: number;
  text: string;
  /** Local digitado ao abrir um CSV do SOL-AR sem cabeçalho de local. */
  location?: Solar62Location;
}

export interface Project {
  state: HashState;
  print: PrintOptions;
  climateFile: ClimateFileEntry | null;
  /** Arquivo da configuração A da comparação; "same" quando é o mesmo da configuração atual. */
  compareClimateFile: ClimateFileEntry | 'same' | null;
  /** Informativos: quem salvou e quando. */
  app?: { version: string; commit: string };
  savedAt?: string;
}

export type ProjectError =
  | { kind: 'notProject' }
  | { kind: 'newer'; schema: number }
  | { kind: 'invalid'; field: 'schema' | 'state' | 'climateFile' | 'compareClimateFile' };

export function serializeProject(
  project: Project,
  app: { version: string; commit: string },
  savedAt: string,
): string {
  return JSON.stringify(
    {
      format: PROJECT_FORMAT,
      schema: PROJECT_SCHEMA,
      app,
      savedAt,
      state: project.state,
      print: project.print,
      climateFile: project.climateFile,
      compareClimateFile: project.compareClimateFile,
    },
    null,
    2,
  );
}

/**
 * Conversões de esquemas antigos para o seguinte (chave: esquema de origem). Cada mudança de
 * esquema ganha uma função aqui e um projeto de exemplo da versão anterior nos testes.
 */
const MIGRATIONS: Record<number, (project: Record<string, unknown>) => Record<string, unknown>> =
  {};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function readLocation(v: unknown): Solar62Location | null {
  if (!isObject(v) || typeof v.name !== 'string') return null;
  const nums = [v.latitude, v.longitude, v.timeZone, v.elevation];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return {
    name: v.name,
    latitude: v.latitude as number,
    longitude: v.longitude as number,
    timeZone: v.timeZone as number,
    elevation: v.elevation as number,
  };
}

function readClimateFile(v: unknown): ClimateFileEntry | null | undefined {
  if (v === null || v === undefined) return null;
  if (
    !isObject(v) ||
    typeof v.name !== 'string' ||
    (v.format !== 'epw' && v.format !== 'csv') ||
    typeof v.hours !== 'number' ||
    typeof v.text !== 'string'
  ) {
    return undefined;
  }
  const entry: ClimateFileEntry = { name: v.name, format: v.format, hours: v.hours, text: v.text };
  if (v.location !== undefined) {
    const location = readLocation(v.location);
    if (!location) return undefined;
    entry.location = location;
  }
  return entry;
}

function readPrint(v: unknown): PrintOptions {
  const print = { ...DEFAULT_PRINT };
  if (!isObject(v)) return print;
  if (typeof v.radiusCm === 'number' && v.radiusCm >= 2 && v.radiusCm <= 20) {
    print.radiusCm = v.radiusCm;
  }
  for (const key of [
    'protractor',
    'mask',
    'data',
    'legend',
    'protractorOnly',
    'geometry',
  ] as const) {
    if (typeof v[key] === 'boolean') print[key] = v[key];
  }
  return print;
}

/** Lê um arquivo de projeto (spec 11, seção 11.3), sem lançar exceção. */
export function parseProject(
  text: string,
): { ok: true; project: Project } | { ok: false; error: ProjectError } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: { kind: 'notProject' } };
  }
  if (!isObject(json) || json.format !== PROJECT_FORMAT) {
    return { ok: false, error: { kind: 'notProject' } };
  }
  const schema = json.schema;
  if (typeof schema !== 'number' || !Number.isInteger(schema) || schema < 1) {
    return { ok: false, error: { kind: 'invalid', field: 'schema' } };
  }
  if (schema > PROJECT_SCHEMA) return { ok: false, error: { kind: 'newer', schema } };
  let p = json;
  for (let s = schema; s < PROJECT_SCHEMA; s++) p = MIGRATIONS[s]!(p);

  if (!isObject(p.state)) return { ok: false, error: { kind: 'invalid', field: 'state' } };
  const state: HashState = {};
  for (const [key, value] of Object.entries(p.state)) {
    if (key !== '' && typeof value === 'string') state[key] = value;
  }
  const climateFile = readClimateFile(p.climateFile);
  if (climateFile === undefined) {
    return { ok: false, error: { kind: 'invalid', field: 'climateFile' } };
  }
  const compareClimateFile =
    p.compareClimateFile === 'same' ? 'same' : readClimateFile(p.compareClimateFile);
  if (compareClimateFile === undefined) {
    return { ok: false, error: { kind: 'invalid', field: 'compareClimateFile' } };
  }
  const project: Project = {
    state,
    print: readPrint(p.print),
    climateFile,
    compareClimateFile,
  };
  if (isObject(p.app) && typeof p.app.version === 'string' && typeof p.app.commit === 'string') {
    project.app = { version: p.app.version, commit: p.app.commit };
  }
  if (typeof p.savedAt === 'string') project.savedAt = p.savedAt;
  return { ok: true, project };
}
