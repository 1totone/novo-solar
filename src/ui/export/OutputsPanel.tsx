import { useId, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/useI18n';
import type { PrintOptions } from './printOptions';

/** Passo 5: imprimir em escala, exportar e comparar (F2.6). */
export function OutputsPanel({
  print,
  onPrintChange,
  onPrint,
  onExport,
  csvAvailable,
  comparing,
  onCompare,
  geometryAvailable = false,
  children,
}: {
  print: PrintOptions;
  onPrintChange: (next: PrintOptions) => void;
  onPrint: () => void;
  onExport: (kind: 'svg' | 'png' | 'csv' | 'copy') => Promise<string | null>;
  csvAvailable: boolean;
  comparing: boolean;
  onCompare: (start: boolean) => void;
  /** Há corte e vista no passo 6 para imprimir. */
  geometryAvailable?: boolean;
  /** Seção "Projeto" (F4.7), no fim do passo. */
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const [radiusText, setRadiusText] = useState(String(print.radiusCm).replace('.', ','));
  // O raio pode mudar por fora (projeto aberto, F4.7): o campo acompanha.
  const [shownRadius, setShownRadius] = useState(print.radiusCm);
  if (print.radiusCm !== shownRadius) {
    setShownRadius(print.radiusCm);
    if (Number(radiusText.replace(',', '.')) !== print.radiusCm) {
      setRadiusText(String(print.radiusCm).replace('.', ','));
    }
  }
  const [status, setStatus] = useState<string | null>(null);
  const radius = Number(radiusText.replace(',', '.'));
  const radiusValid =
    radiusText.trim() !== '' && Number.isFinite(radius) && radius >= 2 && radius <= 20;
  const check = (key: keyof Omit<PrintOptions, 'radiusCm'>, label: string) => (
    <label className="check">
      <input
        type="checkbox"
        checked={print[key]}
        onChange={(e) => onPrintChange({ ...print, [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  const run = async (kind: 'svg' | 'png' | 'csv' | 'copy') => setStatus(await onExport(kind));

  return (
    <section className="step-panel" aria-labelledby={`${id}-h`} data-testid="outputs-panel">
      <h2 id={`${id}-h`}>
        <span className="step-n">5</span>
        {t('outputs.heading')}
      </h2>
      <div className="field">
        <label htmlFor={`${id}-r`}>{t('outputs.radius')}</label>
        <input
          id={`${id}-r`}
          type="text"
          inputMode="decimal"
          value={radiusText}
          aria-invalid={!radiusValid}
          data-testid="print-radius"
          onChange={(e) => {
            setRadiusText(e.target.value);
            const v = Number(e.target.value.replace(',', '.'));
            if (e.target.value.trim() !== '' && Number.isFinite(v) && v >= 2 && v <= 20) {
              onPrintChange({ ...print, radiusCm: v });
            }
          }}
        />
        {radiusValid ? (
          <p className="note" data-testid="radius-note">
            {radius > 7
              ? t('outputs.paperNote', {
                  radius: radiusText,
                  width: (radius * 2.64).toFixed(1).replace('.', ','),
                })
              : t('outputs.radiusHelp')}
          </p>
        ) : (
          <p className="error" role="alert">
            {t('outputs.radiusInvalid')}
          </p>
        )}
      </div>
      <fieldset className="field plain">
        <legend className="field-label">{t('outputs.include')}</legend>
        {check('protractor', t('outputs.includeProtractor'))}
        {check('mask', t('outputs.includeMask'))}
        {check('data', t('outputs.includeData'))}
        {check('legend', t('outputs.includeLegend'))}
        {check('protractorOnly', t('outputs.protractorOnly'))}
        {geometryAvailable && check('geometry', t('outputs.includeGeometry'))}
      </fieldset>
      <button type="button" className="btn primary" onClick={onPrint}>
        {t('outputs.print')}
      </button>
      <p className="note">{t('outputs.printHelp')}</p>
      <h3 className="sub-heading">{t('outputs.export')}</h3>
      <div className="button-row">
        <button type="button" className="btn" onClick={() => run('svg')}>
          SVG
        </button>
        <button type="button" className="btn" onClick={() => run('png')}>
          PNG
        </button>
        <button type="button" className="btn" disabled={!csvAvailable} onClick={() => run('csv')}>
          {t('outputs.csv')}
        </button>
        <button type="button" className="btn" onClick={() => run('copy')}>
          {t('outputs.copy')}
        </button>
      </div>
      <p className="note">{csvAvailable ? t('outputs.exportHelp') : t('outputs.csvNone')}</p>
      {status && (
        <p className="note" role="status" data-testid="export-status">
          {status}
        </p>
      )}
      <h3 className="sub-heading">{t('outputs.compare')}</h3>
      <button
        type="button"
        className="btn"
        aria-pressed={comparing}
        data-testid="compare"
        onClick={() => onCompare(!comparing)}
      >
        {comparing ? t('outputs.compareStop') : t('outputs.compare')}
      </button>
      <p className="note">{t('outputs.compareHelp')}</p>
      {children}
    </section>
  );
}
