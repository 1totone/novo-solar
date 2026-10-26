import type { ReactNode } from 'react';
import {
  BIG_CHART_RING,
  projectRegion,
  type ChartPoint,
  type ProjectedRegion,
  type Projection,
} from '../../core/chart/projection';
import type { Region } from '../../core/mask/mask';
import { pathD } from '../chart/projectionContext';

/**
 * Regiões exatas da carta (árvores de discos, semiplanos e polígonos) como máscaras SVG: usadas
 * pela máscara pelos ângulos (MaskLayer) e pela máscara de um ponto da geometria (ShadingLayer).
 */

// Retângulo que cobre a carta inteira (o viewBox vai de −1,32 a 1,32).
export const BIG = { x: -2, y: -2, width: 4, height: 4 };
/** Passo da hachura, em unidades da carta (raio 1): cerca de 7 px numa carta de 34rem. */
export const HATCH = 0.035;

/** Semiplano {p · n ≥ 0} como polígono grande, em coordenadas do SVG (y para baixo). */
function halfPlanePoints(nx: number, ny: number): string {
  const len = Math.hypot(nx, ny);
  const n = { x: nx / len, y: -ny / len };
  const d = { x: -n.y, y: n.x };
  const L = 3;
  const pts = [
    { x: L * d.x, y: L * d.y },
    { x: L * d.x + 2 * L * n.x, y: L * d.y + 2 * L * n.y },
    { x: -L * d.x + 2 * L * n.x, y: -L * d.y + 2 * L * n.y },
    { x: -L * d.x, y: -L * d.y },
  ];
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

/**
 * Converte a árvore de regiões em máscaras SVG (luminância: branco mostra, preto esconde). União:
 * formas pintadas juntas; interseção: grupos com máscaras aninhadas; complemento: retângulo branco
 * com a região em preto. Assim a borda é sempre a curva exata, sem polígonos aproximados.
 * A cor vai em `style`, porque a folha de estilo da carta zera o preenchimento dos círculos.
 */
export class MaskBuilder {
  defs: ReactNode[] = [];
  private count = 0;
  private readonly prefix: string;
  private readonly projection: Projection | null;

  /**
   * Sem projeção (ou na estereográfica), as regiões são desenhadas com as formas exatas (círculos e
   * semiplanos); nas outras projeções (F4.3), convertidas em polígonos (spec 03, seção 3.5.3).
   */
  constructor(prefix: string, projection: Projection | null = null) {
    this.prefix = prefix;
    this.projection = projection && projection.kind !== 'stereographic' ? projection : null;
  }

  /** Desenha a região na cor dada sobre o que já está na máscara. */
  paint(r: Region, color: 'white' | 'black', key: string): ReactNode {
    switch (r.kind) {
      case 'empty':
        return null;
      case 'all':
        return <rect key={key} {...BIG} style={{ fill: color }} />;
      case 'disc':
        return <circle key={key} cx={r.cx} cy={-r.cy} r={r.r} style={{ fill: color }} />;
      case 'halfPlane':
        return <polygon key={key} points={halfPlanePoints(r.nx, r.ny)} style={{ fill: color }} />;
      case 'polygon':
        return (
          <polygon
            key={key}
            points={r.points.map((p) => `${p.x},${-p.y}`).join(' ')}
            style={{ fill: color }}
          />
        );
      case 'or':
        return <g key={key}>{r.regions.map((c, i) => this.paint(c, color, `${key}.${i}`))}</g>;
      case 'and':
      case 'not':
        return <rect key={key} {...BIG} style={{ fill: color }} mask={`url(#${this.mask(r)})`} />;
    }
  }

  /** Cria a máscara da região e devolve o id. */
  mask(r: Region): string {
    if (this.projection) return this.maskProjected(projectRegion(r, this.projection));
    const id = `${this.prefix}-${this.count++}`;
    let content: ReactNode;
    if (r.kind === 'not') {
      content = (
        <>
          <rect {...BIG} style={{ fill: 'white' }} />
          {this.paint(r.region, 'black', 'n')}
        </>
      );
    } else if (r.kind === 'and') {
      content = r.regions.reduceRight<ReactNode>(
        (inner, child) => <g mask={`url(#${this.mask(child)})`}>{inner}</g>,
        <rect {...BIG} style={{ fill: 'white' }} />,
      );
    } else {
      content = this.paint(r, 'white', 'c');
    }
    this.defs.push(
      <mask key={id} id={id} maskUnits="userSpaceOnUse" {...BIG}>
        {content}
      </mask>,
    );
    return id;
  }

  /** Pinta uma região já convertida para a projeção da carta. */
  private paintProjected(r: ProjectedRegion, color: 'white' | 'black', key: string): ReactNode {
    switch (r.kind) {
      case 'empty':
        return null;
      case 'all':
        return <rect key={key} {...BIG} style={{ fill: color }} />;
      case 'shape': {
        const rings: ChartPoint[][] = r.complement ? [BIG_CHART_RING, ...r.rings] : r.rings;
        return <path key={key} d={pathD(rings, true)} fillRule="evenodd" style={{ fill: color }} />;
      }
      case 'or':
        return (
          <g key={key}>{r.regions.map((c, i) => this.paintProjected(c, color, `${key}.${i}`))}</g>
        );
      case 'and':
      case 'not':
        return (
          <rect
            key={key}
            {...BIG}
            style={{ fill: color }}
            mask={`url(#${this.maskProjected(r)})`}
          />
        );
    }
  }

  private maskProjected(r: ProjectedRegion): string {
    const id = `${this.prefix}-${this.count++}`;
    let content: ReactNode;
    if (r.kind === 'not') {
      content = (
        <>
          <rect {...BIG} style={{ fill: 'white' }} />
          {this.paintProjected(r.region, 'black', 'n')}
        </>
      );
    } else if (r.kind === 'and') {
      content = r.regions.reduceRight<ReactNode>(
        (inner, child) => <g mask={`url(#${this.maskProjected(child)})`}>{inner}</g>,
        <rect {...BIG} style={{ fill: 'white' }} />,
      );
    } else {
      content = this.paintProjected(r, 'white', 'c');
    }
    this.defs.push(
      <mask key={id} id={id} maskUnits="userSpaceOnUse" {...BIG}>
        {content}
      </mask>,
    );
    return id;
  }
}

/** Hash curto (FNV-1a, 32 bits) de um texto, em base 36. */
export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
