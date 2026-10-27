import { OVERLAY_QUANTITIES } from '../../core/overlay/overlay';
import type { PrintOptions } from '../export/printOptions';
import type { Locale, MessageKey } from '../i18n/i18n';
import { QUANTITY_OF, type OverlayState } from '../state/overlayHash';
import type { ProtractorState } from '../state/protractorHash';

/**
 * Resumos de uma linha dos passos 2, 4 e 5 fechados (decisão 0044; o do passo 3 fica em
 * `protractor/summary.ts`). Ficam no pacote inicial; o conteúdo dos passos chega sob demanda.
 */
type T = (key: MessageKey, params?: Record<string, string | number>) => string;
type Format = (value: number, fractionDigits?: number) => string;

const decimal = (format: Format, v: number) => format(v, Number.isInteger(v) ? 0 : 1);

/** Passo 2: "Fachada 315° (NO)", e "sem transferidor" quando oculto. */
export function facadeSummary(state: ProtractorState, t: T, format: Format): string {
  if (!state.orientationValid) return t('steps.facade.invalid');
  const o = ((state.orientation % 360) + 360) % 360;
  const compass = t('compass.points').split(',')[Math.round(o / 22.5) % 16]!;
  return [
    t('steps.facade', { degrees: decimal(format, o), compass }),
    ...(state.show ? [] : [t('steps.facade.noProtractor')]),
  ].join(' · ');
}

/** Passo 4: variável e semestre, e o limiar da frequência. */
export function dataSummary(overlay: OverlayState, hasData: boolean, t: T, format: Format): string {
  if (!hasData) return t('steps.data.needData');
  const key = overlay.key;
  if (!key) return t('steps.data.none');
  const info = OVERLAY_QUANTITIES[QUANTITY_OF[key]];
  return [
    t(`data.short.${key}`),
    t(overlay.semester === 1 ? 'data.semester1' : 'data.semester2'),
    ...(overlay.mode === 'frequency'
      ? [
          t('steps.data.frequency', {
            threshold: decimal(format, overlay.threshold),
            unit: info.unit,
          }),
        ]
      : []),
  ].join(' · ');
}

/** Passo 5: o raio e o que fica fora da folha. */
export function outputsSummary(
  print: PrintOptions,
  comparing: boolean,
  t: T,
  format: Format,
  locale: Locale,
): string {
  const left = [
    ...(print.protractor ? [] : [t('steps.outputs.protractor')]),
    ...(print.mask ? [] : [t('steps.outputs.mask')]),
    ...(print.data ? [] : [t('steps.outputs.data')]),
    ...(print.legend ? [] : [t('steps.outputs.legend')]),
  ];
  return [
    t('steps.outputs.radius', { radius: decimal(format, print.radiusCm) }),
    print.protractorOnly
      ? t('steps.outputs.protractorOnly')
      : left.length === 0
        ? t('steps.outputs.all')
        : t('steps.outputs.without', {
            items: new Intl.ListFormat(locale, { type: 'conjunction' }).format(left),
          }),
    ...(comparing ? [t('steps.outputs.comparing')] : []),
  ].join(' · ');
}
