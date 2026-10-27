import { useId, useState } from 'react';
import { OVERLAY_QUANTITIES } from '../../core/overlay/overlay';
import { useI18n } from '../i18n/useI18n';
import type { MessageKey } from '../i18n/i18n';
import {
  DATA_KEYS,
  QUANTITY_OF,
  formatLimits,
  type DataKey,
  type OverlayState,
} from '../state/overlayHash';
import { onRovingKeyDown } from '../a11y/roving';

const LABEL: Record<DataKey, MessageKey> = {
  tbs: 'data.tbs',
  ur: 'data.ur',
  ghi: 'data.ghi',
  dni: 'data.dni',
  dhi: 'data.dhi',
};
/** Grandezas cujas faixas padrão vêm do SOL-AR 6.2. */
const FROM_62: DataKey[] = ['tbs', 'ghi', 'dni'];

/** Número digitado (vírgula ou ponto decimal, sem separador de milhar). */
const parseNumber = (text: string) => (text.trim() === '' ? NaN : Number(text.replace(',', '.')));
const showNumber = (v: number) => String(v).replace('.', ',');

/** Quatro limites crescentes, ou null. */
function parseLimits(text: readonly string[]): number[] | null {
  const nums = text.map(parseNumber);
  return nums.every((v, k) => Number.isFinite(v) && (k === 0 || v > nums[k - 1]!)) ? nums : null;
}

/** Quatro limites editáveis; o link só muda quando os quatro formam uma sequência crescente. */
function BandEditor({
  limits,
  unit,
  onValid,
}: {
  limits: readonly number[];
  unit: string;
  onValid: (limits: number[]) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(() => limits.map(showNumber));
  // Só acusa erro depois que o usuário mexe: os percentis do arquivo podem empatar (ex.: DNI
  // com muitas horas nubladas em zero), e isso não é erro de digitação.
  const [dirty, setDirty] = useState(false);
  const valid = !dirty || parseLimits(text) !== null;
  return (
    <div className="field">
      <span className="field-label">{t('data.bands', { unit })}</span>
      <div className="band-inputs">
        {text.map((value, i) => (
          <input
            key={i}
            type="text"
            inputMode="decimal"
            className="angle"
            aria-label={t('data.bandLimit', { n: String(i + 1) })}
            aria-invalid={!valid}
            data-testid={`band-${i + 1}`}
            value={value}
            onChange={(e) => {
              const next = [...text];
              next[i] = e.target.value;
              setText(next);
              setDirty(true);
              const parsed = parseLimits(next);
              if (parsed) onValid(parsed);
            }}
          />
        ))}
      </div>
      {!valid && (
        <p className="error" role="alert">
          {t('data.bandsInvalid')}
        </p>
      )}
    </div>
  );
}

export function DataPanel({
  overlay,
  hasData,
  sourceUrl,
  limits,
  timeZone,
  onChange,
}: {
  overlay: OverlayState;
  /** Há um EPW carregado para o local escolhido. */
  hasData: boolean;
  /** Página de onde baixar o arquivo recente da cidade (TMYx), se houver. */
  sourceUrl?: string;
  /** Limites das faixas em uso (padrão, digitados ou do arquivo). */
  limits: readonly number[] | null;
  timeZone: number;
  onChange: (patch: Record<string, string>) => void;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const key = overlay.key;
  const info = key ? OVERLAY_QUANTITIES[QUANTITY_OF[key]] : undefined;
  const [moreOpen, setMoreOpen] = useState(overlay.mode === 'frequency');
  const tz = `${timeZone < 0 ? '−' : '+'}${formatNumber(Math.abs(timeZone), Number.isInteger(timeZone) ? 0 : 1)}`;

  return (
    <>
      {!hasData ? (
        <p className="note" data-testid="data-need-file">
          {t('data.needFile')} {sourceUrl && <a href={sourceUrl}>{t('data.sourceLink')}</a>}
        </p>
      ) : (
        <>
          <div className="field">
            <label htmlFor={`${id}-v`}>{t('data.variable')}</label>
            <select
              id={`${id}-v`}
              value={key ?? ''}
              onChange={(e) =>
                onChange({
                  dado: e.target.value,
                  faixas: '',
                  limiar: '',
                  modo: overlay.mode === 'frequency' ? 'freq' : '',
                })
              }
            >
              <option value="">{t('data.none')}</option>
              {DATA_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(LABEL[k])}
                </option>
              ))}
            </select>
          </div>
          {key && info && (
            <>
              <div className="field">
                <span className="field-label">{t('data.semester')}</span>
                <div
                  className="segmented"
                  role="radiogroup"
                  aria-label={t('data.semester')}
                  onKeyDown={(e) => onRovingKeyDown(e, 'radio')}
                >
                  {([1, 2] as const).map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      role="radio"
                      tabIndex={overlay.semester === sem ? 0 : -1}
                      aria-checked={overlay.semester === sem}
                      onClick={() => onChange({ sem: sem === 2 ? '2' : '' })}
                    >
                      {t(sem === 1 ? 'data.semester1' : 'data.semester2')}
                    </button>
                  ))}
                </div>
              </div>
              {overlay.bandsInvalid && (
                <p className="error" role="alert">
                  {t('data.bandsLinkInvalid')}
                </p>
              )}
              {overlay.mode === 'mean' && (
                <>
                  {limits && (
                    <BandEditor
                      key={`${key}:${overlay.bands.source}:${formatLimits(limits)}`}
                      limits={limits}
                      unit={info.unit}
                      onValid={(l) => onChange({ faixas: formatLimits(l) })}
                    />
                  )}
                  <div className="button-row">
                    <button
                      type="button"
                      className="btn"
                      aria-pressed={overlay.bands.source === 'default'}
                      onClick={() => onChange({ faixas: '' })}
                    >
                      {t('data.bandsDefault')}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      aria-pressed={overlay.bands.source === 'file'}
                      onClick={() => onChange({ faixas: 'arquivo' })}
                    >
                      {t('data.bandsFile')}
                    </button>
                  </div>
                  <p className="note">
                    {overlay.bands.source === 'file'
                      ? t('data.bandsFileWarning')
                      : t(FROM_62.includes(key) ? 'data.bandsDefault62' : 'data.bandsDefaultNew')}
                  </p>
                </>
              )}
              <p className="note">
                {t('data.cellHelp', {
                  interval: t(
                    info.timing === 'integrated'
                      ? 'data.intervalIntegrated'
                      : 'data.intervalInstant',
                  ),
                  tz,
                  what: t(overlay.mode === 'frequency' ? 'data.colorFrequency' : 'data.colorMean'),
                })}
              </p>
              <details
                className="more"
                open={moreOpen}
                onToggle={(e) => setMoreOpen(e.currentTarget.open)}
              >
                <summary>{t('data.more')}</summary>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={overlay.mode === 'frequency'}
                    onChange={(e) => onChange({ modo: e.target.checked ? 'freq' : '' })}
                  />
                  {t('data.frequency')}
                </label>
                {overlay.mode === 'frequency' && (
                  <div className="field">
                    <label htmlFor={`${id}-t`}>{t('data.threshold', { unit: info.unit })}</label>
                    <input
                      id={`${id}-t`}
                      type="text"
                      inputMode="decimal"
                      data-testid="threshold"
                      defaultValue={showNumber(overlay.threshold)}
                      onChange={(e) => {
                        const v = parseNumber(e.target.value);
                        if (Number.isFinite(v)) onChange({ limiar: String(v) });
                      }}
                    />
                    <p className="note">{t('data.thresholdHelp')}</p>
                  </div>
                )}
              </details>
            </>
          )}
        </>
      )}
    </>
  );
}
