import { useId, useState, type ChangeEvent, type ReactNode } from 'react';
import { EPW_FIELD_NAMES, epwPeriodOfRecord, EpwParseError } from '../core/epw/parseEpw';
import { parseSolar62, solar62Header, type Solar62Location } from '../core/epw/parseSolar62';
import { CITIES, type City } from './cities';
import { fileSite, readClimateFile, type LoadedFile } from './data/climateFile';
import type { HistoricalState } from './data/historical';
import { LocationForm } from './data/LocationForm';
import { decodeText } from './data/readText';
import { epwErrorMessage } from './epwErrorMessage';
import { useI18n } from './i18n/useI18n';
import type { SelectedSite } from './state/siteHash';

export type { LoadedFile } from './data/climateFile';

interface Props {
  selected: SelectedSite;
  loadedFile: LoadedFile | null;
  historical: HistoricalState;
  onSelect: (selected: SelectedSite, file: LoadedFile | null) => void;
}

function formatTimeZone(tz: number, format: (n: number) => string): string {
  if (tz === 0) return 'UTC';
  return `UTC${tz < 0 ? '−' : '+'}${format(Math.abs(tz))}`;
}

const placeOf = (city: City): Solar62Location => ({
  name: city.name,
  latitude: city.latitude,
  longitude: city.longitude,
  timeZone: city.timeZone,
  elevation: city.elevation,
});

export function SitePanel({ selected, loadedFile, historical, onSelect }: Props) {
  const { t, formatNumber } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ fileName: string; text: string } | null>(null);
  const selectId = useId();
  const fileId = useId();
  const site = selected.site;
  const city = selected.kind === 'city' ? selected.site : null;
  const fmt = (n: number, digits: number) => formatNumber(n, digits);

  const openFile = (
    fileName: string,
    format: 'epw' | 'csv',
    text: string,
    location?: Solar62Location,
  ) => {
    const file = readClimateFile(fileName, format, text, location);
    setError(null);
    setPending(null);
    onSelect(fileSite(file), file);
  };

  const onCityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const next = CITIES.find((s) => s.id === e.target.value);
    if (!next) return;
    setError(null);
    setPending(null);
    onSelect({ kind: 'city', site: next, historical: false }, null);
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPending(null);
    let format: 'epw' | 'csv' = 'epw';
    try {
      const text = decodeText(await file.arrayBuffer());
      if (/^\uFEFF?\s*LOCATION/i.test(text) || /\.epw$/i.test(file.name)) {
        openFile(file.name, 'epw', text);
        return;
      }
      if (!/\.csv$/i.test(file.name)) {
        setError(t('site.unknownFormat'));
        return;
      }
      format = 'csv';
      if (solar62Header(text)) {
        openFile(file.name, 'csv', text);
        return;
      }
      // Sem cabeçalho: confere os dados antes de pedir o local (qualquer local válido serve).
      parseSolar62(text, { name: '', latitude: 0, longitude: 0, timeZone: 0, elevation: 0 });
      setError(null);
      setPending({ fileName: file.name, text });
    } catch (err) {
      setError(
        err instanceof EpwParseError ? epwErrorMessage(err, t, format) : t('site.readError'),
      );
    }
  };

  let source: ReactNode;
  let period: string | null = null;
  const notices: string[] = [];
  const data =
    selected.kind === 'file'
      ? loadedFile?.data
      : historical.status === 'ready'
        ? historical.data
        : undefined;
  if (city && selected.kind === 'city' && selected.historical && city.historical) {
    const h = city.historical;
    source = (
      <>
        <span className="badge">{t('site.historicalBadge')}</span>{' '}
        {t(h.kind === 'try' ? 'site.sourceTry' : 'site.sourceIwec')}
      </>
    );
    period = h.period
      ? t('site.periodTry', { start: h.period[0], end: h.period[1] })
      : t('site.periodUnknown');
    if (h.kind === 'try') notices.push(t('site.noticeModelled'));
    if (Math.abs(h.radiationLagMin) >= 5) {
      notices.push(
        t(h.radiationLagMin > 0 ? 'site.noticeLag' : 'site.noticeLead', {
          minutes: Math.abs(h.radiationLagMin),
        }),
      );
    }
    if (h.inconsistentGlobalHours > 0) {
      notices.push(
        t('site.noticeInconsistent', { hours: formatNumber(h.inconsistentGlobalHours) }),
      );
    }
  } else if (city) {
    source = t('site.sourceCity', { station: city.station, wmo: city.wmo });
  } else if (loadedFile) {
    const hours = formatNumber(loadedFile.hours);
    if (loadedFile.format === 'csv') {
      source = t('site.sourceCsv', { file: loadedFile.fileName, hours });
      period = t('site.periodUnknown');
    } else {
      source = t(loadedFile.hasLeapDay ? 'site.sourceFileLeap' : 'site.sourceFile', {
        file: loadedFile.fileName,
        hours,
      });
      const record = epwPeriodOfRecord(loadedFile.comments);
      period = record
        ? t('site.periodRecord', { start: record[0], end: record[1] })
        : t('site.periodUnknown');
    }
  } else source = t('site.sourceLink');

  if (data) {
    const missing = EPW_FIELD_NAMES.filter((f) => data.missing[f] > 0).map((f) =>
      t('site.missingField', {
        field: t(`epw.field.${f}`),
        hours: formatNumber(data.missing[f]),
      }),
    );
    if (missing.length > 0) notices.push(t('site.noticeMissing', { fields: missing.join('; ') }));
  }

  return (
    <section className="site-panel step-panel" aria-labelledby="site-heading">
      <h2 id="site-heading">
        <span className="step-n">1</span>
        {t('site.heading')}
      </h2>
      <div className="field">
        <label htmlFor={selectId}>{t('site.cityLabel')}</label>
        <select id={selectId} value={city ? city.id : 'arquivo'} onChange={onCityChange}>
          {selected.kind === 'file' && (
            <option value="arquivo">{t('site.fileOption', { name: selected.site.name })}</option>
          )}
          {CITIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {city && (
        <div className="field" data-testid="city-data">
          <span className="field-label">{t('site.cityData')}</span>
          {city.historical && (
            <button
              type="button"
              className="btn"
              aria-pressed={selected.kind === 'city' && selected.historical}
              onClick={() =>
                onSelect(
                  {
                    kind: 'city',
                    site: city,
                    historical: !(selected.kind === 'city' && selected.historical),
                  },
                  null,
                )
              }
            >
              {selected.kind === 'city' && selected.historical
                ? t('site.closeHistorical')
                : t('site.openHistorical')}
            </button>
          )}
          {historical.status === 'loading' && (
            <p className="note" role="status">
              {t('site.loadingHistorical')}
            </p>
          )}
          {historical.status === 'error' && (
            <p className="error" role="alert">
              {t('site.historicalError')}
            </p>
          )}
          <p className="note">
            <a href={city.sourceUrl}>{t('site.recentLink')}</a>. {t('site.recentHelp')}
          </p>
        </div>
      )}
      <div className="field">
        <label htmlFor={fileId}>{t('site.fileLabel')}</label>
        <input id={fileId} type="file" accept=".epw,.csv" onChange={onFileChange} />
        <p className="note">{t('site.fileHelp')}</p>
      </div>
      {pending && (
        <LocationForm
          key={pending.fileName}
          fileName={pending.fileName}
          suggestion={city ? placeOf(city) : undefined}
          onCancel={() => setPending(null)}
          onSubmit={(location) => {
            try {
              openFile(pending.fileName, 'csv', pending.text, location);
            } catch (err) {
              setError(
                err instanceof EpwParseError ? epwErrorMessage(err, t, 'csv') : t('site.readError'),
              );
            }
          }}
        />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <dl className="site-info" data-testid="site-info">
        <dt>{t('site.latitude')}</dt>
        <dd>{fmt(site.latitude, 3)}°</dd>
        <dt>{t('site.longitude')}</dt>
        <dd>{fmt(site.longitude, 3)}°</dd>
        <dt>{t('site.timeZone')}</dt>
        <dd>
          {formatTimeZone(site.timeZone, (n) => formatNumber(n, Number.isInteger(n) ? 0 : 1))}
        </dd>
        <dt>{t('site.elevation')}</dt>
        <dd>{fmt(site.elevation, 1)} m</dd>
        <dt>{t('site.source')}</dt>
        <dd data-testid="site-source">{source}</dd>
        {period && (
          <>
            <dt>{t('site.period')}</dt>
            <dd data-testid="site-period">{period}</dd>
          </>
        )}
        {notices.length > 0 && (
          <>
            <dt>{t('site.notices')}</dt>
            <dd data-testid="site-notices">
              <ul className="notices">
                {notices.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        {selected.kind === 'file' && loadedFile?.comments[0] && (
          <>
            <dt>{t('site.comments')}</dt>
            <dd className="comment">{loadedFile.comments[0]}</dd>
          </>
        )}
      </dl>
    </section>
  );
}
