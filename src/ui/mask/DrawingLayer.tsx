import type { MouseEvent } from 'react';
import { project, unproject } from '../../core/chart/stereographic';
import type { SkyPolygon } from '../../core/mask/mask';

export interface Drawing {
  kind: 'total' | 'partial';
  /** Vértices do polígono em andamento. */
  vertices: SkyPolygon;
}

/** Ponto clicado na carta (coordenadas do SVG) para direção do céu, com 0,1° de resolução. */
function toSky(x: number, ySvg: number): { altitude: number; azimuth: number } {
  let e = x;
  let n = -ySvg;
  const r = Math.hypot(e, n);
  if (r > 1) {
    // fora do horizonte: o vértice vai para o horizonte na mesma direção
    e /= r;
    n /= r;
  }
  const { zenith, azimuth } = unproject(e, n);
  const round = (v: number) => Math.round(v * 10) / 10;
  return { altitude: Math.max(0, round(90 - zenith)), azimuth: round(azimuth) % 360 };
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
  const onClick = (e: MouseEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onAdd(toSky(p.x, p.y));
  };
  const pts = drawing.vertices.map((v) => {
    const c = project(90 - v.altitude, v.azimuth);
    return { x: c.x, y: -c.y };
  });
  return (
    <g className={`drawing ${drawing.kind}`} data-testid="drawing-layer">
      <rect
        x={-1.32}
        y={-1.32}
        width={2.64}
        height={2.64}
        className="drawing-capture"
        onClick={onClick}
      />
      {pts.length > 1 && (
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="drawing-path" />
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.015} className="drawing-vertex" />
      ))}
    </g>
  );
}
