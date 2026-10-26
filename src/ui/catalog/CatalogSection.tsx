import { useId, useMemo, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import {
  displayName,
  nearestStations,
  projectPointToHash,
  searchStations,
  type Catalog,
  type ProjectPoint,
  type Station,
} from './catalog';
import { SideSlot } from '../layout/SideResults';
import { CatalogMap } from './CatalogMap';
import type { UfMap } from './useCatalog';

const MAX_RESULTS = 10;

interface PointText {
  lat: string;
  lon: string;
  alt: string;
}

const textOf = (p: ProjectPoint | null): PointText => ({
  lat: p ? String(p.lat) : '',
  lon: p ? String(p.lon) : '',
  alt: p && p.alt !== null ? String(p.alt) : '',
});

const parseNumber = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

/** Texto dos campos para o valor de `perto` ('' sem local; null se incompleto ou inválido). */
function pointValue(text: PointText): string | null {
  if (text.lat.trim() === '' && text.lon.trim() === '') return '';
  const lat = parseNumber(text.lat);
  const lon = parseNumber(text.lon);
  const alt = parseNumber(text.alt);
  if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) return null;
  return projectPointToHash({ lat, lon, alt: Number.isFinite(alt) ? alt : null });
}

/**
 * Catálogo nacional no passo 1 (F4.1, decisão 0034): busca, local da obra (estações mais próximas,
 * com a distância e o desnível) e mapa. Recolhido por padrão, para não complicar o caminho básico.
 */
export function CatalogSection({
  catalog,
  map,
  failed,
  selectedId,
  point,
  current,
  open,
  onOpenChange,
  onPointChange,
  onChoose,
}: {
  catalog: Catalog | null;
  map: UfMap | null;
  failed: boolean;
  selectedId: string | null;
  point: ProjectPoint | null;
  /** Local atual (cidade, arquivo ou estação), para "Usar o local atual". */
  current: { latitude: number; longitude: number; elevation: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPointChange: (value: string) => void;
  onChoose: (station: Station) => void;
}) {
  const { t, formatNumber } = useI18n();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [text, setText] = useState<PointText>(() => textOf(point));
  // O local também muda pelo mapa e pelo link: os campos acompanham.
  const external = point ? projectPointToHash(point) : '';
  const [seen, setSeen] = useState(external);
  if (external !== seen) {
    setSeen(external);
    if (pointValue(text) !== external) setText(textOf(point));
  }

  const ufNames = useMemo(
    () => Object.fromEntries((map?.ufs ?? []).map((u) => [u.uf, u.nome])),
    [map],
  );
  const stations = useMemo(() => catalog?.estacoes ?? [], [catalog]);
  const results = useMemo(
    () => searchStations(stations, query, ufNames),
    [stations, query, ufNames],
  );
  const nearest = useMemo(() => (point ? nearestStations(stations, point) : []), [stations, point]);

  const edit = (patch: Partial<PointText>) => {
    const next = { ...text, ...patch };
    setText(next);
    const value = pointValue(next);
    if (value !== null) {
      setSeen(value);
      onPointChange(value);
    }
  };

  const fmtKm = (km: number) => formatNumber(km, km < 10 ? 1 : 0);
  const stationButton = (s: Station, extra?: string) => (
    <button
      type="button"
      className="station-choice"
      aria-pressed={s.id === selectedId}
      onClick={() => onChoose(s)}
    >
      <span className="station-name">
        {displayName(s)} ({s.uf})
      </span>
      <span className="note">
        {[t('catalog.years', { count: s.anos }), extra].filter(Boolean).join(' · ')}
      </span>
    </button>
  );

  return (
    <details
      className="catalog"
      open={open}
      onToggle={(e) => onOpenChange(e.currentTarget.open)}
      data-testid="catalog"
    >
      <summary>{t('catalog.heading', { count: catalog ? stations.length : 579 })}</summary>
      <p className="note">{t('catalog.intro')}</p>
      {failed && (
        <p className="error" role="alert">
          {t('catalog.failed')}
        </p>
      )}
      {!catalog && !failed && (
        <p className="note" role="status">
          {t('catalog.loading')}
        </p>
      )}
      {catalog && (
        <>
          <div className="field">
            <label htmlFor={searchId}>{t('catalog.search')}</label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="catalog-search"
            />
          </div>
          {query.trim() !== '' && (
            <div role="region" aria-label={t('catalog.resultsLabel')} data-testid="catalog-results">
              <p className="note" role="status">
                {results.length === 0
                  ? t('catalog.noResults')
                  : t('catalog.results', { count: results.length })}
              </p>
              <ul className="station-list">
                {results.slice(0, MAX_RESULTS).map((s) => (
                  <li key={s.id}>{stationButton(s)}</li>
                ))}
              </ul>
              {results.length > MAX_RESULTS && (
                <p className="note">{t('catalog.more', { count: results.length - MAX_RESULTS })}</p>
              )}
            </div>
          )}
          <fieldset className="field plain catalog-point">
            <legend className="field-label">{t('catalog.point')}</legend>
            <p className="note">{t('catalog.pointHelp')}</p>
            <div className="piece-grid">
              {(
                [
                  ['lat', 'catalog.pointLat'],
                  ['lon', 'catalog.pointLon'],
                  ['alt', 'catalog.pointAlt'],
                ] as const
              ).map(([k, label]) => {
                const invalid = text[k].trim() !== '' && !Number.isFinite(parseNumber(text[k]));
                return (
                  <label key={k} className="field">
                    <span>{t(label)}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={text[k]}
                      aria-invalid={invalid || undefined}
                      onChange={(e) => edit({ [k]: e.target.value })}
                      data-testid={`catalog-point-${k}`}
                    />
                  </label>
                );
              })}
            </div>
            <div className="button-row">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  edit({
                    lat: String(current.latitude),
                    lon: String(current.longitude),
                    alt: String(current.elevation),
                  })
                }
              >
                {t('catalog.pointUseCurrent')}
              </button>
              {point && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => edit({ lat: '', lon: '', alt: '' })}
                >
                  {t('catalog.pointClear')}
                </button>
              )}
            </div>
          </fieldset>
          {point && (
            <div role="region" aria-label={t('catalog.nearest')} data-testid="catalog-nearest">
              <h3 className="sub-heading">{t('catalog.nearest')}</h3>
              <ul className="station-list">
                {nearest.map(({ station, km, dz }) => (
                  <li key={station.id}>
                    {stationButton(
                      station,
                      [
                        t('catalog.distance', { km: fmtKm(km) }),
                        dz === null
                          ? null
                          : t(dz >= 0 ? 'catalog.dzAbove' : 'catalog.dzBelow', {
                              m: formatNumber(Math.abs(dz), 0),
                            }),
                      ]
                        .filter(Boolean)
                        .join(', '),
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {map && (
            <SideSlot
              slot="catalog"
              active={open}
              step={1}
              stepName={t('site.heading')}
              title={t('side.catalog')}
            >
              <CatalogMap
                map={map}
                stations={stations}
                selectedId={selectedId}
                point={point}
                onPoint={(lat, lon) => edit({ lat: String(lat), lon: String(lon) })}
              />
            </SideSlot>
          )}
        </>
      )}
    </details>
  );
}
