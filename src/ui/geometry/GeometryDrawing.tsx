import { forwardRef, useId, useMemo, type MouseEvent } from 'react';
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
    /** Ponto da máscara de um ponto (F3.2), marcado no corte e na vista. */
    point?: { x: number; z: number } | null;
    /** Clique na janela da vista de fora: novo ponto (x da lateral esquerda de quem está dentro). */
    onPick?: (point: { x: number; z: number }) => void;
  }
>(function GeometryDrawing(
  { window, devices, title, font, parts = 'both', size, testId, className, point, onPick },
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
  const W = window.width;
  const H = window.height;
  // Marcador do ponto: círculo com cruz, do tamanho da letra.
  const marker = (cx: number, cy: number) => (
    <g className="gd-point" data-testid="gd-point">
      <circle cx={cx} cy={cy} r={0.45 * font} />
      <path
        d={`M${cx - 0.75 * font},${cy}H${cx + 0.75 * font}M${cx},${cy - 0.75 * font}V${cy + 0.75 * font}`}
      />
    </g>
  );
  const pick = (e: MouseEvent<SVGRectElement>) => {
    const m = e.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!m || !onPick) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    // Vista de fora: X = W − x; y do SVG = −z. Arredondado a 5 cm (o clique tem a precisão de um
    // pixel, que passa de 1 cm no celular); valores exatos se digitam nos campos.
    const round = (v: number) => Math.round(v * 20) / 20;
    onPick({
      x: round(Math.min(W, Math.max(0, W - (p.x - offset)))),
      z: round(Math.min(H, Math.max(0, -p.y))),
    });
  };
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
          {point && marker(0, -point.z)}
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
          {point && marker(W - point.x + offset, -point.z)}
          {onPick && (
            <rect
              x={offset}
              y={-H}
              width={W}
              height={H}
              className="gd-pick"
              data-testid="gd-pick"
              onClick={pick}
            />
          )}
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
