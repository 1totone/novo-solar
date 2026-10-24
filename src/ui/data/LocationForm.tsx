import { useId, useState, type FormEvent } from 'react';
import { LOCATION_LIMITS } from '../../core/epw/hourly';
import type { Solar62Location } from '../../core/epw/parseSolar62';
import { useI18n } from '../i18n/useI18n';

type Key = keyof typeof LOCATION_LIMITS;
const KEYS: readonly Key[] = ['latitude', 'longitude', 'timeZone', 'elevation'];

/** Número digitado: aceita vírgula decimal e o sinal de menos tipográfico. */
function parseInput(text: string): number {
  const t = text.trim().replace(',', '.').replace('−', '-');
  return t === '' ? NaN : Number(t);
}

/**
 * Local de um CSV do SOL-AR sem cabeçalho (os arquivos embarcados no 6.2). Nenhum valor é
 * presumido: o fuso, em especial, nunca vira −3 por padrão (spec 04, seção 4.2).
 */
export function LocationForm({
  fileName,
  suggestion,
  onSubmit,
  onCancel,
}: {
  fileName: string;
  /** Local da cidade escolhida, preenchido só se o usuário pedir. */
  suggestion?: Solar62Location;
  onSubmit: (location: Solar62Location) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [name, setName] = useState(fileName.replace(/\.csv$/i, ''));
  const [values, setValues] = useState<Record<Key, string>>({
    latitude: '',
    longitude: '',
    timeZone: '',
    elevation: '',
  });
  const [checked, setChecked] = useState(false);

  const invalid = (k: Key) => {
    const v = parseInput(values[k]);
    const { min, max } = LOCATION_LIMITS[k];
    return !Number.isFinite(v) || v < min || v > max;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setChecked(true);
    if (KEYS.some(invalid)) return;
    onSubmit({
      name: name.trim() || fileName,
      latitude: parseInput(values.latitude),
      longitude: parseInput(values.longitude),
      timeZone: parseInput(values.timeZone),
      elevation: parseInput(values.elevation),
    });
  };

  return (
    <form className="location-form" onSubmit={submit} noValidate data-testid="location-form">
      <p className="note">{t('locationForm.intro', { file: fileName })}</p>
      {suggestion && (
        <button
          type="button"
          className="btn"
          onClick={() => {
            setName(suggestion.name);
            setValues({
              latitude: String(suggestion.latitude),
              longitude: String(suggestion.longitude),
              timeZone: String(suggestion.timeZone),
              elevation: String(suggestion.elevation),
            });
          }}
        >
          {t('locationForm.useCity', { city: suggestion.name })}
        </button>
      )}
      <div className="field">
        <label htmlFor={`${id}-name`}>{t('locationForm.name')}</label>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {KEYS.map((k) => (
        <div className="field" key={k}>
          <label htmlFor={`${id}-${k}`}>{t(`locationForm.${k}`)}</label>
          <input
            id={`${id}-${k}`}
            type="text"
            inputMode="decimal"
            value={values[k]}
            aria-invalid={checked && invalid(k)}
            aria-describedby={checked && invalid(k) ? `${id}-${k}-error` : undefined}
            onChange={(e) => setValues({ ...values, [k]: e.target.value })}
          />
          {checked && invalid(k) && (
            <p className="error" id={`${id}-${k}-error`}>
              {t('locationForm.invalid', {
                min: LOCATION_LIMITS[k].min,
                max: LOCATION_LIMITS[k].max,
              })}
            </p>
          )}
        </div>
      ))}
      <div className="button-row">
        <button type="submit" className="btn primary">
          {t('locationForm.open')}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          {t('locationForm.cancel')}
        </button>
      </div>
    </form>
  );
}
