import { lazy, Suspense, useId, useState, type ChangeEvent, type ReactNode } from 'react';
import { EPW_FIELD_NAMES, epwPeriodOfRecord, EpwParseError } from '../core/epw/parseEpw';
import { parseSolar62, solar62Header, type Solar62Location } from '../core/epw/parseSolar62';
import {
  catalogIdFromFileName,
  displayName,
  LAG_MIN,
  stationWarnings,
  type ProjectPoint,
  type Station,
} from './catalog/catalog';
import { useCatalog } from './catalog/useCatalog';
import { CITIES, type City } from './cities';
import { cityOfFile, fileMatches, sameFile, type Place } from './data/sources';
import { fileSite, readClimateFile, type LoadedFile } from './data/climateFile';
import type { HistoricalState } from './data/historical';
import { LocationForm } from './data/LocationForm';
import { decodeText } from './data/readText';
import { epwFromZip, looksLikeZip, ZipFileError } from './data/zipFile';
import { epwErrorMessage } from './epwErrorMessage';
import { useI18n } from './i18n/useI18n';
import { RestoreStepFocus } from './layout/AdvancedStepStub';
import { rememberFocus } from './layout/focusAfterLoad';
import { InfoButton, InfoText } from './layout/InfoTip';
import { useInfo } from './layout/useInfo';
import { NextStep, Step } from './layout/Step';
import { fileRadiationLag } from './overlay/radiationLag';
import { DATA_KEYS } from './state/overlayHash';
import type { SelectedSite } from './state/siteHash';

// Catálogo nacional (F4.1): o código da busca e do mapa só chega com o catálogo aberto (decisão 0039).
const CatalogSection = lazy(() =>
  import('./catalog/CatalogSection').then((m) => ({ default: m.CatalogSection })),
);

export type { LoadedFile } from './data/climateFile';

interface Props {
  selected: SelectedSite;
  loadedFile: LoadedFile | null;
  /** Arquivos carregados nesta sessão (decisão 0047): continuam à escolha ao trocar de cidade. */
  files: readonly LoadedFile[];
  /** Variável pintada na carta (`dado` no link) e a escolha dela aqui mesmo (item e da 0044). */
  paintKey: string | undefined;
  onPaint: (key: string) => void;
  /** Leva ao passo 4 (semestre, faixas, frequência); sem ele, o passo 4 já está à vista. */
  onMoreData?: () => void;
  /** Comparação com outros dados (item h da 0044): A guarda os dados de agora. */
  comparing: boolean;
  /** De onde vêm os dados da A, na frase da impressão. */
  compareSource: string;
  onCompare: (start: boolean) => void;
  historical: HistoricalState;
  onSelect: (selected: SelectedSite, file: LoadedFile | null) => void;
  /** Local da obra do catálogo (F4.1), `perto` no link. */
  projectPoint: ProjectPoint | null;
  onProjectPointChange: (value: string) => void;
  /** Passo aberto no acordeão (decisão 0044). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sempre aberto, sem acordeão (computador, decisão 0050). */
  fixed?: boolean;
  /** Botão "Próximo" (só no acordeão). */
  onNext?: () => void;
}

/** Arquivos futuros do LabEEE e do INPE (BrazFuture), no Zenodo (decisão 0034). */
const BRAZFUTURE_URL = 'https://doi.org/10.5281/zenodo.13744587';

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

export function SitePanel({
  selected,
  loadedFile,
  files,
  paintKey,
  onPaint,
  onMoreData,
  comparing,
  compareSource,
  onCompare,
  historical,
  onSelect,
  projectPoint,
  onProjectPointChange,
  open,
  onOpenChange,
  fixed = false,
  onNext,
}: Props) {
  const { t, formatNumber } = useI18n();
  const sourcesInfo = useInfo();
  const [catalogOpen, setCatalogOpen] = useState(
    () => selected.kind === 'station' || projectPoint !== null,
  );
  // Estação do catálogo: a escolhida ou a do arquivo TMYx carregado (pelo nome do arquivo).
  const stationId =
    selected.kind === 'station'
      ? selected.id
      : selected.kind === 'file' && loadedFile
        ? catalogIdFromFileName(loadedFile.fileName)
        : null;
  const { catalog, map, failed } = useCatalog(catalogOpen || stationId !== null);
  const catalogStation: Station | null =
    stationId === null ? null : (catalog?.estacoes.find((x) => x.id === stationId) ?? null);
  const station = selected.kind === 'station' ? catalogStation : null;
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
    const index = /^arquivo:(\d+)$/.exec(e.target.value);
    const file = index ? files[Number(index[1])] : undefined;
    const next = CITIES.find((s) => s.id === e.target.value);
    if (!file && !next) return;
    setError(null);
    setPending(null);
    if (file) onSelect(fileSite(file), file);
    else onSelect({ kind: 'city', site: next!, historical: false }, null);
  };

  // Fontes de dados do lugar (decisão 0047): um arquivo de uma cidade da lista aparece com ela, ao
  // lado dos dados históricos; os de outros lugares entram na lista de cidades.
  const fileCity = selected.kind === 'file' && loadedFile ? cityOfFile(loadedFile) : null;
  const placeCity = city ?? fileCity;
  const fileIndex = loadedFile ? files.findIndex((f) => sameFile(f, loadedFile)) : -1;
  const place: Place | null = placeCity
    ? placeCity
    : selected.kind === 'station'
      ? { wmo: selected.id, ...selected.site }
      : selected.kind === 'file' && loadedFile
        ? loadedFile.data.location
        : null;
  const otherFiles = files.map((f, i) => ({ f, i })).filter(({ f }) => cityOfFile(f) === null);
  const sourceOptions: { key: string; label: string; checked: boolean; choose: () => void }[] = [];
  if (placeCity || selected.kind === 'station') {
    sourceOptions.push({
      key: 'none',
      label: t('sources.none'),
      checked: (selected.kind === 'city' && !selected.historical) || selected.kind === 'station',
      choose: () => {
        if (placeCity) onSelect({ kind: 'city', site: placeCity, historical: false }, null);
      },
    });
  }
  const placeHistorical = placeCity?.historical;
  if (placeCity && placeHistorical) {
    sourceOptions.push({
      key: 'hist',
      label: placeHistorical.period
        ? t('sources.historical', {
            start: placeHistorical.period[0],
            end: placeHistorical.period[1],
          })
        : t('sources.historicalIwec'),
      checked: selected.kind === 'city' && selected.historical,
      choose: () => onSelect({ kind: 'city', site: placeCity, historical: true }, null),
    });
  }
  if (place) {
    files.forEach((f, i) => {
      if (!fileMatches(f, place)) return;
      const record = f.format === 'epw' ? epwPeriodOfRecord(f.comments) : null;
      sourceOptions.push({
        key: `file:${i}`,
        label: record
          ? t('sources.fileRecord', { file: f.fileName, start: record[0], end: record[1] })
          : t('sources.file', { file: f.fileName }),
        checked: selected.kind === 'file' && i === fileIndex,
        choose: () => onSelect(fileSite(f), f),
      });
    });
  }

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPending(null);
    let format: 'epw' | 'csv' = 'epw';
    try {
      let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());
      let fileName = file.name;
      // .zip do TMYx direto, sem descompactar (decisão 0048): vale o .epw de dentro.
      if (looksLikeZip(bytes)) {
        const inner = await epwFromZip(bytes);
        bytes = inner.content;
        fileName = inner.fileName;
      }
      const text = decodeText(bytes);
      if (/^\uFEFF?\s*LOCATION/i.test(text) || /\.epw$/i.test(fileName)) {
        openFile(fileName, 'epw', text);
        return;
      }
      if (!/\.csv$/i.test(fileName)) {
        setError(t('site.unknownFormat'));
        return;
      }
      format = 'csv';
      if (solar62Header(text)) {
        openFile(fileName, 'csv', text);
        return;
      }
      // Sem cabeçalho: confere os dados antes de pedir o local (qualquer local válido serve).
      parseSolar62(text, { name: '', latitude: 0, longitude: 0, timeZone: 0, elevation: 0 });
      setError(null);
      setPending({ fileName, text });
    } catch (err) {
      setError(
        err instanceof ZipFileError
          ? t(`site.zip.${err.problem}`)
          : err instanceof EpwParseError
            ? epwErrorMessage(err, t, format)
            : t('site.readError'),
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
  } else if (selected.kind === 'station') {
    source = station
      ? t(station.fonte === 'era5' ? 'station.sourceEra5' : 'station.source', {
          name: displayName(station),
          uf: station.uf,
        })
      : t('site.sourceLink');
    if (station) {
      period = t('station.period', {
        start: station.periodo[0],
        end: station.periodo[1],
        years: station.anos,
      });
      const w = stationWarnings(station, projectPoint);
      if (w.reanalysis) notices.push(t('station.warnReanalysis'));
      if (w.fewYears) notices.push(t('station.warnFewYears', { years: station.anos }));
      if (w.far !== null) notices.push(t('station.warnFar', { km: formatNumber(w.far, 0) }));
      if (w.height !== null) {
        notices.push(
          t(w.height > 0 ? 'station.warnAbove' : 'station.warnBelow', {
            m: formatNumber(Math.abs(w.height), 0),
          }),
        );
      }
      if (w.lag !== null) {
        notices.push(
          t(w.lag > 0 ? 'station.warnLagLate' : 'station.warnLagEarly', {
            minutes: formatNumber(Math.abs(w.lag), 0),
          }),
        );
      }
      if (station.ufArquivo) {
        notices.push(t('station.warnUf', { fileUf: station.ufArquivo, uf: station.uf }));
      }
    }
  } else source = t('site.sourceLink');

  // Arquivo TMYx do catálogo carregado: os avisos que o próprio arquivo não dá.
  if (selected.kind === 'file' && catalogStation) {
    const w = stationWarnings(catalogStation, projectPoint);
    if (w.reanalysis) notices.push(t('station.warnReanalysis'));
    if (w.lag !== null) {
      notices.push(
        t(w.lag > 0 ? 'station.warnLagLate' : 'station.warnLagEarly', {
          minutes: formatNumber(Math.abs(w.lag), 0),
        }),
      );
    }
  }

  // Outro arquivo carregado (BrazFuture, INMET ou próprio): o tempo da radiação calculado aqui,
  // pelo mesmo método do catálogo (spec 04, seção 4.3), com o mesmo aviso.
  if (selected.kind === 'file' && data && stationId === null) {
    const lag = fileRadiationLag(data);
    if (lag !== null && Math.abs(lag) >= LAG_MIN) {
      notices.push(
        t(lag > 0 ? 'station.warnLagLate' : 'station.warnLagEarly', {
          minutes: formatNumber(Math.abs(lag), 0),
        }),
      );
    }
  }

  if (data) {
    const missing = EPW_FIELD_NAMES.filter((f) => data.missing[f] > 0).map((f) =>
      t('site.missingField', {
        field: t(`epw.field.${f}`),
        hours: formatNumber(data.missing[f]),
      }),
    );
    if (missing.length > 0) notices.push(t('site.noticeMissing', { fields: missing.join('; ') }));
  }

  // Resumo do passo fechado (decisão 0044): o local e de onde vêm os dados horários.
  let dataSummary: string;
  if (selected.kind === 'city') {
    const h = selected.historical ? city?.historical : undefined;
    if (!h) dataSummary = t('steps.site.chartOnly');
    else if (historical.status === 'loading') dataSummary = t('steps.site.loading');
    else if (historical.status === 'error') dataSummary = t('steps.site.error');
    else if (h.period) {
      dataSummary = t('steps.site.historical', { start: h.period[0], end: h.period[1] });
    } else dataSummary = t('steps.site.historicalIwec');
  } else if (selected.kind === 'file') {
    const record =
      loadedFile && loadedFile.format === 'epw' ? epwPeriodOfRecord(loadedFile.comments) : null;
    dataSummary = !loadedFile
      ? t('steps.site.fileMissing')
      : record
        ? t('steps.site.fileRecord', { start: record[0], end: record[1] })
        : t('steps.site.file', { file: loadedFile.fileName });
  } else dataSummary = t('steps.site.station');

  // Catálogo recolhido: só o resumo, sem baixar o código dele (decisão 0039).
  const catalogStub = (
    <details
      className="catalog"
      open={catalogOpen}
      onToggle={(e) => {
        const opening = e.currentTarget.open;
        if (opening && e.currentTarget.contains(document.activeElement)) rememberFocus('catalog');
        setCatalogOpen(opening);
      }}
      data-testid="catalog"
    >
      <summary>{t('catalog.heading', { count: catalog ? catalog.estacoes.length : 579 })}</summary>
      {catalogOpen && (
        <p className="note" role="status">
          {t('catalog.loading')}
        </p>
      )}
    </details>
  );

  // Origem em poucas palavras, para a linha de resumo do local (decisão 0050).
  let origin: string;
  if (city && selected.kind === 'city' && selected.historical && city.historical) {
    origin = t(city.historical.kind === 'try' ? 'site.originTry' : 'site.originIwec');
  } else if (city) origin = t('site.originCity', { station: city.station });
  else if (loadedFile) origin = t('site.originFile', { file: loadedFile.fileName });
  else if (selected.kind === 'station') origin = t('site.originStation');
  else origin = t('site.originLink');
  const checkedSource = sourceOptions.find((o) => o.checked);

  return (
    <Step
      n={1}
      heading={t('site.heading')}
      summary={`${site.name} · ${dataSummary}`}
      summaryTestId="site-summary"
      open={open}
      onOpenChange={onOpenChange}
      fixed={fixed}
      testId="site-panel"
      dataStep="1"
    >
      <div className="field row">
        <label htmlFor={selectId}>{t('site.cityLabel')}</label>
        <select
          id={selectId}
          value={
            placeCity
              ? placeCity.id
              : selected.kind === 'station'
                ? 'estacao'
                : fileIndex >= 0
                  ? `arquivo:${fileIndex}`
                  : 'arquivo'
          }
          onChange={onCityChange}
        >
          {selected.kind === 'file' && !placeCity && fileIndex < 0 && (
            <option value="arquivo">{t('site.fileOption', { name: selected.site.name })}</option>
          )}
          {selected.kind === 'station' && (
            <option value="estacao">{t('station.option', { name: selected.site.name })}</option>
          )}
          {CITIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          {otherFiles.length > 0 && (
            <optgroup label={t('sources.otherFiles')}>
              {otherFiles.map(({ f, i }) => (
                <option key={i} value={`arquivo:${i}`}>
                  {t('site.fileOption', { name: fileSite(f).site.name || f.fileName })}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      {catalogOpen ? (
        <Suspense fallback={catalogStub}>
          <CatalogSection
            catalog={catalog}
            map={map}
            failed={failed}
            selectedId={selected.kind === 'station' ? selected.id : null}
            point={projectPoint}
            current={site}
            open={catalogOpen}
            onOpenChange={setCatalogOpen}
            onPointChange={onProjectPointChange}
            onChoose={(s) => {
              setError(null);
              setPending(null);
              onSelect(
                {
                  kind: 'station',
                  id: s.id,
                  site: {
                    name: `${displayName(s)} (${s.uf})`,
                    latitude: s.lat,
                    longitude: s.lon,
                    timeZone: s.fuso,
                    elevation: s.alt,
                  },
                },
                null,
              );
            }}
          />
          <RestoreStepFocus testId="catalog" summary='[data-testid="catalog"] > summary' />
        </Suspense>
      ) : (
        catalogStub
      )}
      {/* Fontes de dados num controle só (decisão 0050): a lista das fontes do lugar e o botão
          que abre um arquivo; o resto da explicação fica atrás do "i". */}
      <div className="field sources" data-testid="data-sources">
        <div className="row">
          <label htmlFor={`${fileId}-src`}>{t('sources.label')}</label>
          <select
            id={`${fileId}-src`}
            value={checkedSource?.key ?? ''}
            disabled={sourceOptions.length === 0}
            onChange={(e) => {
              const option = sourceOptions.find((o) => o.key === e.target.value);
              if (!option) return;
              setError(null);
              setPending(null);
              option.choose();
            }}
          >
            {sourceOptions.length === 0 && <option value="">{t('steps.site.fileMissing')}</option>}
            {sourceOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {station && catalog && (
          <p className="note">
            <a href={`${catalog.base}${station.url}`} data-testid="station-download">
              {t('station.download')}
            </a>
            . {t('station.downloadHelp')}
          </p>
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
        {/* Abrir um arquivo e comparar com outros dados: ações das fontes, na mesma linha. */}
        <div className="button-row source-actions">
          <label className="btn file-btn">
            {t('site.fileButton')}
            <span className="visually-hidden">{t('site.fileButtonDetail')}</span>
            <input
              id={fileId}
              type="file"
              className="visually-hidden"
              accept=".epw,.zip,.csv"
              onChange={onFileChange}
            />
          </label>
          {(data || comparing) && (
            <button
              type="button"
              className="btn"
              aria-pressed={comparing}
              aria-label={comparing ? undefined : t('sources.compare')}
              data-testid="compare-data"
              onClick={() => onCompare(!comparing)}
            >
              {comparing ? t('outputs.compareStop') : t('sources.compareShort')}
            </button>
          )}
          <InfoButton
            info={sourcesInfo}
            label={t('info.label', { topic: t('sources.label') })}
            testId="sources-info"
          />
        </div>
        <InfoText info={sourcesInfo} testId="sources-help">
          {placeCity && (
            <p className="note">
              <a href={placeCity.sourceUrl}>{t('site.recentLink')}</a>. {t('site.recentHelp')}
            </p>
          )}
          <p className="note">{t('site.fileHelp')}</p>
          {(data || comparing) && !comparing && (
            <p className="note" data-testid="compare-data-note">
              {t('sources.compareHelp')}
            </p>
          )}
        </InfoText>
        {comparing && (
          <p className="note" data-testid="compare-data-note">
            {t('sources.comparing', { source: compareSource || t('sources.noData') })}
          </p>
        )}
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
      {data && (
        <div className="field" data-testid="paint">
          <div className="row">
            <label htmlFor={`${fileId}-paint`}>{t('sources.paint')}</label>
            <select
              id={`${fileId}-paint`}
              value={paintKey ?? ''}
              onChange={(e) => onPaint(e.target.value)}
            >
              <option value="">{t('data.none')}</option>
              {DATA_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`data.${k}`)}
                </option>
              ))}
            </select>
          </div>
          {onMoreData && (
            <p className="note">
              {t('sources.paintMore')}{' '}
              <button type="button" className="btn small" onClick={onMoreData}>
                {t('sources.paintMoreLink')}
              </button>
            </p>
          )}
        </div>
      )}
      {/* Coordenadas, fuso, elevação e origem numa linha; o resto sob demanda (decisão 0050). */}
      <details className="site-details" data-testid="site-details">
        <summary data-testid="site-line">
          <span className="visually-hidden">{t('site.detailsLabel')} </span>
          {[
            `${fmt(site.latitude, 3)}°, ${fmt(site.longitude, 3)}°`,
            formatTimeZone(site.timeZone, (n) => formatNumber(n, Number.isInteger(n) ? 0 : 1)),
            `${fmt(site.elevation, 0)} m`,
            origin,
          ].join(' · ')}
          {notices.length > 0 && (
            <>
              {' · '}
              <span className="site-line-notices">
                {notices.length === 1
                  ? t('site.lineNotice')
                  : t('site.lineNotices', { count: notices.length })}
              </span>
            </>
          )}
        </summary>
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
          <dt className="wide">{t('site.source')}</dt>
          <dd className="wide" data-testid="site-source">
            {source}
          </dd>
          {period && (
            <>
              <dt>{t('site.period')}</dt>
              <dd data-testid="site-period">{period}</dd>
            </>
          )}
          {notices.length > 0 && (
            <>
              <dt className="wide">{t('site.notices')}</dt>
              <dd className="wide" data-testid="site-notices">
                <ul className="notices">
                  {notices.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}
          {catalogStation && (
            <>
              <dt className="wide">{t('station.quality')}</dt>
              <dd className="wide" data-testid="station-quality">
                <ul className="notices">
                  <li>
                    {t('station.q.missing', { count: formatNumber(catalogStation.q.ausentes) })}
                  </li>
                  <li>
                    {t('station.q.calm', { pct: formatNumber(catalogStation.q.calmaria, 1) })}
                  </li>
                  <li>{t('station.q.kt', { count: formatNumber(catalogStation.q.kt) })}</li>
                  {catalogStation.q.atraso !== null && (
                    <li>
                      {t('station.q.lag', {
                        minutes: `${catalogStation.q.atraso > 0 ? '+' : catalogStation.q.atraso < 0 ? '−' : ''}${formatNumber(Math.abs(catalogStation.q.atraso), 0)}`,
                      })}
                    </li>
                  )}
                  {catalogStation.q.fechamento !== null && (
                    <li>
                      {t('station.q.closure', {
                        wh: formatNumber(catalogStation.q.fechamento, 0),
                      })}
                    </li>
                  )}
                  <li>
                    {t('station.q.radiation', {
                      ghi: formatNumber(catalogStation.q.ghi, 0),
                      dni: formatNumber(catalogStation.q.dni, 0),
                      dhi: formatNumber(catalogStation.q.dhi, 0),
                    })}
                  </li>
                  <li>
                    {t('station.q.temperature', {
                      min: formatNumber(catalogStation.q.tbs[0], 1),
                      mean: formatNumber(catalogStation.q.tbs[1], 1),
                      max: formatNumber(catalogStation.q.tbs[2], 1),
                    })}
                  </li>
                </ul>
              </dd>
              {catalogStation.futuro && (
                <>
                  <dt className="wide">{t('station.futureLabel')}</dt>
                  <dd className="wide">
                    {t('station.future')} <a href={BRAZFUTURE_URL}>{t('station.futureLink')}</a>
                  </dd>
                </>
              )}
            </>
          )}
          {selected.kind === 'file' && loadedFile?.comments[0] && (
            <>
              <dt>{t('site.comments')}</dt>
              <dd className="comment">{loadedFile.comments[0]}</dd>
            </>
          )}
        </dl>
      </details>
      {onNext && <NextStep n={2} heading={t('facade.heading')} onClick={onNext} />}
    </Step>
  );
}
