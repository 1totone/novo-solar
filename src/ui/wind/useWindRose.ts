import { useMemo } from 'react';
import { classifyHours } from '../../core/comfort/classification';
import type { EpwData } from '../../core/epw/parseEpw';
import { windRose } from '../../core/wind/windRose';
import { useI18n } from '../i18n/useI18n';
import { methodKey, type ClassificationState } from '../state/classificationHash';
import type { WindState } from '../state/windHash';

/**
 * Rosa dos ventos do estado (F2.5 e F4.4), a mesma na tela e no CSV: a classificação das horas do
 * passo 7 quando o filtro pela condição térmica a pede (ou `withClasses`, para mostrar as
 * contagens), e a rosa com o filtro e o fator da altura e do terreno (spec 06).
 */
export function useWindRose(
  epw: EpwData | null,
  wind: WindState,
  classification: ClassificationState,
  { active = true, withClasses = false }: { active?: boolean; withClasses?: boolean } = {},
) {
  const key = methodKey(classification);
  const needClasses = active && (Boolean(wind.thermal) || withClasses);
  const classes = useMemo(
    () =>
      epw && classification.method && needClasses
        ? classifyHours(epw.fields.dryBulb, classification.method, classification.mode)
        : null,
    // A chave representa o método e a temperatura da hora.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [epw, key, needClasses],
  );
  // O filtro só vale com a classificação feita (método completo no passo 7).
  const thermal = wind.thermal && classes ? wind.thermal : undefined;
  const rose = useMemo(
    () =>
      active && epw
        ? windRose(epw, {
            sectors: wind.sectors,
            season: wind.season,
            period: wind.period,
            thermal: thermal && classes ? { classes: classes.classes, keep: thermal } : undefined,
            speedFactor: wind.speedFactor,
          })
        : null,
    [active, epw, wind.sectors, wind.season, wind.period, thermal, classes, wind.speedFactor],
  );
  return { rose, classes, thermal };
}

/** Método da classificação do passo 7 numa frase (spec 06, seção 6.8). */
export function useMethodSentence(cls: ClassificationState): string {
  const { t, formatNumber } = useI18n();
  const m = cls.method;
  if (!m) return '';
  let method: string;
  if (m.kind === 'adaptive') {
    method = t('wind.method.adaptive', {
      acceptability: String(m.acceptability),
      gains: m.gains ? t('wind.method.gains', { gains: formatNumber(m.gains, 1) }) : '',
    });
  } else if (m.kind === 'balance') {
    method = t('wind.method.balance', { balance: formatNumber(m.balance, 1) });
  } else if (cls.preset) {
    method = t('wind.method.threshold20');
  } else {
    method = t('wind.method.thresholds', {
      cold:
        m.cold === null
          ? t('classes.h2.noCold')
          : t('classes.h2.coldBelow', { value: formatNumber(m.cold, 1) }),
      hot:
        m.hot === null
          ? t('classes.h2.noHot')
          : t('classes.h2.hotAbove', { value: formatNumber(m.hot, 1) }),
    });
  }
  return t('wind.thermalMethod', {
    method,
    mode: t(cls.mode === 'end' ? 'wind.hourTemp.end' : 'wind.hourTemp.mean'),
  });
}
