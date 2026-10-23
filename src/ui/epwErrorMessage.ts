import { EPW_FIELD_NAMES, type EpwErrorCode, type EpwFieldName } from '../core/epw/parseEpw';
import type { EpwParseError } from '../core/epw/parseEpw';
import type { MessageKey } from './i18n/i18n';

const ERROR_KEYS: Record<EpwErrorCode, MessageKey> = {
  missingLocation: 'epw.error.missingLocation',
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
  return name !== undefined && (EPW_FIELD_NAMES as string[]).includes(name);
}

/** Mensagem para o usuário, no idioma da interface, a partir do erro do leitor de EPW. */
export function epwErrorMessage(err: EpwParseError, t: Translate): string {
  const field = isFieldName(err.field) ? t(FIELD_KEYS[err.field]) : (err.field ?? '');
  return t(ERROR_KEYS[err.code], { line: err.line ?? '', field });
}
