import { describe, expect, it } from 'vitest';
import { EpwParseError } from '../core/epw/parseEpw';
import { translate } from './i18n/i18n';
import { epwErrorMessage } from './epwErrorMessage';

const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
  translate('pt-BR', key, params);

describe('epwErrorMessage', () => {
  it('traduz o código, a linha e o nome do campo', () => {
    const err = new EpwParseError('negativeRadiation', 'x', 309, 'directNormal');
    expect(epwErrorMessage(err, t)).toBe(
      'Linha 309: radiação negativa no campo "radiação direta normal".',
    );
  });

  it('não deixa marcadores sem valor', () => {
    const err = new EpwParseError('invalidHourCount', 'x');
    expect(epwErrorMessage(err, t)).not.toMatch(/\{\w+\}/);
  });
});
