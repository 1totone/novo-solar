/**
 * Conversões de tempo (docs/spec/02-tempo-e-posicao-solar.md, seções 2.1 e 2.2).
 * Hora legal = hora padrão local, sem horário de verão; o fuso vem do cabeçalho do EPW.
 */
import { REFERENCE_YEAR } from './constants';

const MS_PER_HOUR = 3_600_000;

/** Instante UTC (ms desde 1970) de uma data e hora legal (hora decimal) no fuso dado (h). */
export function localStandardToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: number,
): number {
  return Date.UTC(year, month - 1, day) + (hour - timeZone) * MS_PER_HOUR;
}

/**
 * Instante UTC associado a uma linha horária do EPW (hora 1 a 24 do dia), no ano de referência.
 * 'end': instante h (temperatura, umidade, vento). 'middle': h − 0,5 (radiação integrada na hora).
 */
export function epwInstantUtc(
  month: number,
  day: number,
  hour: number,
  timeZone: number,
  at: 'end' | 'middle',
): number {
  return localStandardToUtc(REFERENCE_YEAR, month, day, at === 'end' ? hour : hour - 0.5, timeZone);
}
