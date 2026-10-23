import { useId, useState, type ChangeEvent } from 'react';
import { EpwParseError, parseEpw } from '../core/epw/parseEpw';
import { epwErrorMessage } from './epwErrorMessage';
import { useI18n } from './i18n/useI18n';
import type { SelectedSite } from './state/siteHash';
import { TEST_SITES } from './testSites';

/** Informações do arquivo carregado nesta sessão (não vão para a URL). */
export interface LoadedFile {
  fileName: string;
  hours: number;
  hasLeapDay: boolean;
  comments: string[];
}

interface Props {
  selected: SelectedSite;
  loadedFile: LoadedFile | null;
  onSelect: (selected: SelectedSite, file: LoadedFile | null) => void;
}

function formatTimeZone(tz: number, format: (n: number) => string): string {
  if (tz === 0) return 'UTC';
  return `UTC${tz < 0 ? '−' : '+'}${format(Math.abs(tz))}`;
}

export function SitePanel({ selected, loadedFile, onSelect }: Props) {
  const { t, formatNumber } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const selectId = useId();
  const fileId = useId();
  const site = selected.site;
  const fmt = (n: number, digits: number) => formatNumber(n, digits);

  const onTestChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const test = TEST_SITES.find((s) => s.id === e.target.value);
    if (!test) return;
    setError(null);
    onSelect({ kind: 'test', site: test }, null);
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const epw = parseEpw(await file.text());
      const loc = epw.location;
      setError(null);
      onSelect(
        {
          kind: 'file',
          site: {
            name: [loc.city, loc.state, loc.country].filter(Boolean).join(', '),
            latitude: loc.latitude,
            longitude: loc.longitude,
            timeZone: loc.timeZone,
            elevation: loc.elevation,
          },
        },
        {
          fileName: file.name,
          hours: epw.hours,
          hasLeapDay: epw.hasLeapDay,
          comments: epw.comments,
        },
      );
    } catch (err) {
      setError(err instanceof EpwParseError ? epwErrorMessage(err, t) : t('site.readError'));
    }
  };

  let source: string;
  if (selected.kind === 'test') source = t('site.sourceTest');
  else if (loadedFile) {
    source = t(loadedFile.hasLeapDay ? 'site.sourceFileLeap' : 'site.sourceFile', {
      file: loadedFile.fileName,
      hours: formatNumber(loadedFile.hours),
    });
  } else source = t('site.sourceLink');

  return (
    <section className="site-panel" aria-labelledby="site-heading">
      <h2 id="site-heading">{t('site.heading')}</h2>
      <div className="field">
        <label htmlFor={selectId}>{t('site.testLabel')}</label>
        <select
          id={selectId}
          value={selected.kind === 'test' ? selected.site.id : 'arquivo'}
          onChange={onTestChange}
        >
          {selected.kind === 'file' && (
            <option value="arquivo">{t('site.fileOption', { name: selected.site.name })}</option>
          )}
          {TEST_SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={fileId}>{t('site.fileLabel')}</label>
        <input id={fileId} type="file" accept=".epw" onChange={onFileChange} />
        <p className="note">{t('site.fileHelp')}</p>
      </div>
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
        <dd>{source}</dd>
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
