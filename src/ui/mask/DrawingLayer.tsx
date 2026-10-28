import type { MouseEvent } from 'react';
import {
  projectDirection,
  unprojectPoint,
  type ChartPoint,
  type Projection,
} from '../../core/chart/projection';
import { project, unproject } from '../../core/chart/stereographic';
import type { SkyPolygon } from '../../core/mask/mask';
import { chartFrame, useChartProjection } from '../chart/projectionContext';

export interface Drawing {
  kind: 'total' | 'partial';
  /** Vértices do polígono em andamento. */
  vertices: SkyPolygon;
}

const round = (v: number) => Math.round(v * 10) / 10;

/**
 * Ponto clicado na carta (coordenadas do SVG) para direção do céu, com 0,1° de resolução, pela
 * inversa da projeção ativa. Fora do horizonte (ou abaixo dele, na cilíndrica), o vértice vai para o
 * horizonte na mesma direção.
 */
function toSky(
  projection: Projection,
  x: number,
  ySvg: number,
): { altitude: number; azimuth: number } {
  let e = x;
  let n = -ySvg;
  if (projection.kind === 'cylindrical') {
    e = Math.max(-1, Math.min(1, e));
    n = Math.max(0, Math.min(1, n));
  } else {
    const r = Math.hypot(e, n);
    if (r > 1) {
      e /= r;
      n /= r;
    }
  }
  const d = unprojectPoint(projection, e, n) ?? unproject(e, n);
  return { altitude: Math.max(0, round(90 - d.zenith)), azimuth: round(d.azimuth) % 360 };
}

/**
 * Pontos do polígono em andamento na carta. As arestas são retas na carta estereográfica (decisão
 * 0025); nas outras projeções, cada aresta é amostrada nessa reta e projetada.
 */
function previewPoints(projection: Projection, vertices: SkyPolygon): ChartPoint[] {
  const stereo = vertices.map((v) => project(90 - v.altitude, v.azimuth));
  if (projection.kind === 'stereographic') return stereo;
  const out: ChartPoint[] = [];
  for (let i = 0; i < stereo.length; i++) {
    const a = stereo[i]!;
    const b = stereo[i + 1];
    if (!b) {
      const v = vertices[i]!;
      out.push(projectDirection(projection, 90 - v.altitude, v.azimuth));
      break;
    }
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.01));
    for (let k = 0; k < steps; k++) {
      const d = unproject(a.x + (k / steps) * (b.x - a.x), a.y + (k / steps) * (b.y - a.y));
      out.push(projectDirection(projection, d.zenith, d.azimuth));
    }
  }
  return out;
}

/**
 * Camada do desenho à mão: recebe os cliques na carta e mostra o polígono em andamento. Fica por
 * cima de tudo enquanto o modo de desenho está ligado.
 */
export function DrawingLayer({
  drawing,
  onAdd,
}: {
  drawing: Drawing;
  onAdd: (vertex: { altitude: number; azimuth: number }) => void;
}) {
  const projection = useChartProjection();
  const [vx, vy, vw, vh] = chartFrame(projection.kind).viewBox;
  const onClick = (e: MouseEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onAdd(toSky(projection, p.x, p.y));
  };
  const line = previewPoints(projection, drawing.vertices).map((c) => ({ x: c.x, y: -c.y }));
  const pts = drawing.vertices.map((v) => {
    const c = projectDirection(projection, 90 - v.altitude, v.azimuth);
    return { x: c.x, y: -c.y };
  });
  return (
    <g className={`drawing ${drawing.kind}`} data-testid="drawing-layer">
      <rect x={vx} y={vy} width={vw} height={vh} className="drawing-capture" onClick={onClick} />
      {line.length > 1 && (
        <polyline points={line.map((p) => `${p.x},${p.y}`).join(' ')} className="drawing-path" />
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.015} className="drawing-vertex" />
      ))}
    </g>
  );
}
