import { forwardRef, useId, useMemo } from 'react';
import type { Device, WindowGeometry } from '../../core/shading/geometry';
import { useI18n } from '../i18n/useI18n';
import type { Dimension, Drawing, Point2, Shape } from './drawings';
import { drawingLayout, type DrawingParts } from './layout';

const pathOf = (points: readonly Point2[], dx = 0) =>
  points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p[0] + dx).toFixed(4)},${(-p[1]).toFixed(4)}`)
    .join(' ');

function ShapeView({ shape, dx }: { shape: Shape; dx: number }) {
  const d = pathOf(shape.points, dx) + (shape.edge ? '' : ' Z');
  return <path d={d} className={`gd-${shape.role}${shape.edge ? ' gd-edge' : ''}`} />;
}

const ANGLE_KEY = {
  alpha: 'geometry.angle.alpha',
  gammaRight: 'geometry.angle.gammaRight',
  gammaLeft: 'geometry.angle.gammaLeft',
} as const;

export const GeometryDrawing = forwardRef<
  SVGSVGElement,
  {
    window: WindowGeometry;
    devices: readonly Device[];
    title: string;
    /** Altura da letra em metros do desenho. */
    font: number;
    parts?: DrawingParts;
    /** Tamanho fixo (impressão e exportação em escala); sem ele, ocupa a largura disponível. */
    size?: { width: string; height: string };
    testId?: string;
    className?: string;
  }
>(function GeometryDrawing(
  { window, devices, title, font, parts = 'both', size, testId, className },
  ref,
) {
  const { t, formatNumber } = useI18n();
  const titleId = `gd${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const layout = useMemo(
    () => drawingLayout(window, devices, font, parts),
    [window, devices, font, parts],
  );
  const { section, elevation, offset, viewBox } = layout;
  const fmt = (v: number) => formatNumber(v, 2);
  const deg = (v: number) => formatNumber(v, 1);
  const baseY = viewBox.y + viewBox.height - 0.7 * font;

  const dimension = (dim: Dimension, dx: number, key: string) => {
    const [a, b] = [dim.from, dim.to];
    const mx = (a[0] + b[0]) / 2 + dx;
    const my = -(a[1] + b[1]) / 2;
    const vertical = Math.abs(a[0] - b[0]) < 1e-9;
    const after = dim.label === 'after';
    return (
      <g key={key} className="gd-dim" data-testid={`gd-dim-${dim.kind}`}>
        <path d={pathOf([a, b], dx)} />
        <text
          x={vertical ? mx + (after ? 0.35 : -0.35) * font : mx}
          y={vertical ? my : my + (after ? 1.1 : -0.3) * font}
          fontSize={font}
          textAnchor={vertical ? (after ? 'start' : 'end') : 'middle'}
          dominantBaseline={vertical ? 'middle' : 'auto'}
        >
          {fmt(dim.value)}
        </text>
      </g>
    );
  };

  const marks = (drawing: Drawing, dx: number, prefix: string) => (
    <>
      {drawing.angles.map((a, i) => {
        const mx = a.from[0] + 0.55 * (a.to[0] - a.from[0]) + dx;
        const my = -(a.from[1] + 0.55 * (a.to[1] - a.from[1]));
        const leftward = a.to[0] < a.from[0];
        return (
          <g key={`${prefix}a${i}`} className="gd-angle" data-testid={`gd-angle-${a.kind}`}>
            <path d={pathOf([a.from, a.to], dx)} />
            <text
              x={mx + (leftward ? -0.3 : 0.3) * font}
              y={my}
              fontSize={font}
              textAnchor={leftward ? 'end' : 'start'}
              dominantBaseline="middle"
            >
              {t(ANGLE_KEY[a.kind], { value: deg(a.degrees) })}
            </text>
          </g>
        );
      })}
      {drawing.dimensions.map((dim, i) => dimension(dim, dx, `${prefix}d${i}`))}
      {drawing.infinite.map((p, i) => (
        <text
          key={`${prefix}i${i}`}
          x={p[0] + dx}
          y={-p[1] - 0.3 * font}
          fontSize={1.4 * font}
          textAnchor="middle"
          className="gd-infinite"
        >
          ∞
        </text>
      ))}
    </>
  );

  const showSection = parts !== 'elevation';
  const showElevation = parts !== 'section';
  return (
    <svg
      ref={ref}
      className={className ?? 'geometry-drawing'}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      role="img"
      aria-labelledby={titleId}
      data-testid={testId ?? 'geometry-drawing'}
      {...(size
        ? {
            width: size.width,
            height: size.height,
            style: { width: size.width, height: size.height },
          }
        : {})}
    >
      <title id={titleId}>{title}</title>
      {showSection && (
        <g data-testid="gd-section">
          {section.shapes.map((s, i) => (
            <ShapeView key={`s${i}`} shape={s} dx={0} />
          ))}
          {marks(section, 0, 's')}
          <text
            x={(section.bounds.minX + section.bounds.maxX) / 2}
            y={baseY}
            fontSize={1.1 * font}
            textAnchor="middle"
            className="gd-title"
          >
            {t('geometry.section')}
          </text>
        </g>
      )}
      {showElevation && (
        <g data-testid="gd-elevation">
          {elevation.shapes.map((s, i) => (
            <ShapeView key={`e${i}`} shape={s} dx={offset} />
          ))}
          {marks(elevation, offset, 'e')}
          <text
            x={(elevation.bounds.minX + elevation.bounds.maxX) / 2 + offset}
            y={baseY}
            fontSize={1.1 * font}
            textAnchor="middle"
            className="gd-title"
          >
            {t('geometry.elevation')}
          </text>
        </g>
      )}
    </svg>
  );
});
