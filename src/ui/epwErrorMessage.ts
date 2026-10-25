import { EPW_FIELD_NAMES, type EpwErrorCode, type EpwFieldName } from '../core/epw/parseEpw';
import type { EpwParseError } from '../core/epw/parseEpw';
import type { MessageKey } from './i18n/i18n';

const ERROR_KEYS: Record<EpwErrorCode, MessageKey> = {
  missingLocation: 'epw.error.missingLocation',
  missingCsvLocation: 'epw.error.missingCsvLocation',
  invalidCsvHeader: 'epw.error.invalidCsvHeader',
  semicolonCsv: 'epw.error.semicolonCsv',
  invalidLatitude: 'epw.error.invalidLatitude',
  invalidLongitude: 'epw.error.invalidLongitude',
  invalidTimeZone: 'epw.error.invalidTimeZone',
  invalidElevation: 'epw.error.invalidElevation',
  tooFewFields: 'epw.error.tooFewFields',
  invalidNumber: 'epw.error.invalidNumber',
  invalidSequence: 'epw.error.invalidSequence',
  invalidHourCount: 'epw.error.invalidHourCount',
  negativeRadiation: 'epw.error.negativeRadiation',
};

const FIELD_KEYS: Record<EpwFieldName, MessageKey> = {
  dryBulb: 'epw.field.dryBulb',
  dewPoint: 'epw.field.dewPoint',
  relativeHumidity: 'epw.field.relativeHumidity',
  pressure: 'epw.field.pressure',
  extraterrestrialHorizontal: 'epw.field.extraterrestrialHorizontal',
  globalHorizontal: 'epw.field.globalHorizontal',
  directNormal: 'epw.field.directNormal',
  diffuseHorizontal: 'epw.field.diffuseHorizontal',
  windDirection: 'epw.field.windDirection',
  windSpeed: 'epw.field.windSpeed',
  totalSkyCover: 'epw.field.totalSkyCover',
};

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

function isFieldName(name: string | undefined): name is EpwFieldName {
  return name !== undefined && (EPW_FIELD_NAMES as readonly string[]).includes(name);
}

/**
 * Mensagem para o usuário, no idioma da interface, a partir do erro do leitor de EPW ou do CSV do
 * SOL-AR 6.2 (`format`), que só diferem no número de campos esperado por linha.
 */
export function epwErrorMessage(
  err: EpwParseError,
  t: Translate,
  format: 'epw' | 'csv' = 'epw',
): string {
  const field = isFieldName(err.field) ? t(FIELD_KEYS[err.field]) : (err.field ?? '');
  const key =
    format === 'csv' && err.code === 'tooFewFields'
      ? 'csv.error.tooFewFields'
      : ERROR_KEYS[err.code];
  return t(key, { line: err.line ?? '', field });
}
