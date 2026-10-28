import type { MouseEvent } from 'react';
import { useI18n } from '../i18n/useI18n';
import type { ProjectPoint, Station } from './catalog';
import type { UfMap } from './useCatalog';

/**
 * Mapa das estações (F4.1): UFs do Natural Earth 1:50m projetadas no build (equiretangular com o
 * fator do paralelo central, x = λ · cos φ0, y = −φ) e um ponto por estação. Clicar marca o local
 * da obra; a escolha da estação é pela lista (acessível pelo teclado).
 */
export function CatalogMap({
  map,
  stations,
  selectedId,
  point,
  onPoint,
}: {
  map: UfMap;
  stations: readonly Station[];
  selectedId: string | null;
  point: ProjectPoint | null;
  onPoint: (lat: number, lon: number) => void;
}) {
  const { t } = useI18n();
  const cos0 = Math.cos((map.projecao.lat0 * Math.PI) / 180);
  const [x0, y0, w, h] = map.viewBox;
  const pad = 0.6;
  const selected = stations.find((s) => s.id === selectedId) ?? null;

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const m = svg.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onPoint(Math.round(-p.y * 1e4) / 1e4, Math.round((p.x / cos0) * 1e4) / 1e4);
  };

  return (
    <figure className="catalog-map">
      <svg
        viewBox={`${x0 - pad} ${y0 - pad} ${w + 2 * pad} ${h + 2 * pad}`}
        role="img"
        aria-label={t('catalog.map')}
        data-testid="catalog-map"
        onClick={onClick}
      >
        <g className="ufs">
          {map.ufs.map((u) => (
            <path key={u.uf} d={u.d}>
              <title>{u.nome}</title>
            </path>
          ))}
        </g>
        <g className="stations">
          {stations.map((s) => (
            <circle
              key={s.id}
              cx={s.lon * cos0}
              cy={-s.lat}
              r={0.2}
              className={s.fonte === 'era5' ? 'era5' : undefined}
            />
          ))}
        </g>
        {selected && (
          <circle
            className="selected"
            cx={selected.lon * cos0}
            cy={-selected.lat}
            r={0.55}
            data-testid="catalog-map-selected"
          />
        )}
        {point && (
          <path
            className="project-point"
            d={`M${point.lon * cos0 - 0.7},${-point.lat}h1.4M${point.lon * cos0},${-point.lat - 0.7}v1.4`}
            data-testid="catalog-map-point"
          />
        )}
      </svg>
      <figcaption className="note">{t('catalog.mapCredit')}</figcaption>
    </figure>
  );
}
