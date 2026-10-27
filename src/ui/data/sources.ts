import { sameLocation } from '../../core/overlay/difference';
import { catalogIdFromFileName } from '../catalog/catalog';
import { CITIES, type City } from '../cities';
import type { LoadedFile } from './climateFile';

/**
 * Fontes de dados horários de um lugar (decisão 0047, itens e e f da 0044): os dados históricos da
 * cidade e os arquivos carregados nesta sessão que são do mesmo lugar. Os arquivos ficam na lista
 * enquanto a página estiver aberta, mesmo trocando de cidade.
 */

/** Lugar a comparar com o de um arquivo: cidade do catálogo, estação ou outro arquivo. */
export interface Place {
  /** Código da estação (WMO), que os arquivos TMYx trazem no nome. */
  wmo?: string;
  latitude: number;
  longitude: number;
  timeZone: number;
}

/**
 * O arquivo é deste lugar? Pelo código da estação no nome do arquivo TMYx ou, sem ele, pelas
 * coordenadas do cabeçalho: até 0,1° de latitude e de longitude e o mesmo fuso (o critério da
 * diferença entre dois arquivos, spec 05, seção 5.5).
 */
export function fileMatches(file: LoadedFile, place: Place): boolean {
  const id = catalogIdFromFileName(file.fileName);
  if (id !== null && place.wmo !== undefined) return id === place.wmo;
  return sameLocation(file.data.location, place);
}

/** Cidade da lista de um arquivo, se houver. */
export function cityOfFile(file: LoadedFile): City | null {
  return CITIES.find((c) => fileMatches(file, c)) ?? null;
}

/** O mesmo arquivo, carregado de novo (mesmo nome e mesmo texto). */
export function sameFile(a: LoadedFile, b: LoadedFile): boolean {
  return a === b || (a.fileName === b.fileName && a.text === b.text);
}

/** A lista da sessão com o arquivo: no fim, ou no lugar do mesmo arquivo carregado antes. */
export function withFile(files: readonly LoadedFile[], file: LoadedFile): LoadedFile[] {
  return files.some((f) => sameFile(f, file))
    ? files.map((f) => (sameFile(f, file) ? file : f))
    : [...files, file];
}
