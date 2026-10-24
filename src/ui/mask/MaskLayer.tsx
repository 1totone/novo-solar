import { useId, type ReactNode } from 'react';
import type { MaskRegions, Region } from '../../core/mask/mask';

// Retângulo que cobre a carta inteira (o viewBox vai de −1,32 a 1,32).
const BIG = { x: -2, y: -2, width: 4, height: 4 };
/** Passo da hachura, em unidades da carta (raio 1): cerca de 7 px numa carta de 34rem. */
const HATCH = 0.035;

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
class MaskBuilder {
  defs: ReactNode[] = [];
  private count = 0;
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
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
}

/** Hash curto (FNV-1a, 32 bits) de um texto, em base 36. */
function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Máscara de sombra pintada na carta: total em vermelho, parcial em amarelo (decisão 0013). */
export function MaskLayer({
  regions,
  hatched = false,
}: {
  regions: MaskRegions;
  /** Com dados sobre a carta, a máscara vira hachura (45° total, 135° parcial) e deixa ver as cores. */
  hatched?: boolean;
}) {
  // Os ids mudam com o conteúdo: o Chrome não redesenha direito uma máscara aninhada cujo
  // conteúdo muda mantendo o mesmo id (fica uma mistura do desenho antigo com o novo).
  // useId pode ter caracteres que não servem em url(#...).
  const signature = shortHash(JSON.stringify([regions.total, regions.partial]));
  const prefix = `mask${useId().replace(/[^a-zA-Z0-9_-]/g, '')}${signature}`;
  const builder = new MaskBuilder(prefix);
  const layers: ReactNode[] = [];
  const hatches: ReactNode[] = [];
  for (const [kind, region, angle] of [
    ['total', regions.total, 45],
    ['partial', regions.partial, 135],
  ] as const) {
    if (region.kind === 'empty') continue;
    const hatchId = `${prefix}-h${kind}`;
    if (hatched) {
      // Faixas finas como retângulos (as regras de traço da carta valem para line/circle).
      hatches.push(
        <pattern
          key={hatchId}
          id={hatchId}
          patternUnits="userSpaceOnUse"
          width={HATCH}
          height={HATCH}
          patternTransform={`rotate(${angle})`}
        >
          <rect x={0} y={0} width={HATCH * 0.28} height={HATCH} className={`hatch-${kind}`} />
        </pattern>,
      );
    }
    layers.push(
      <rect
        key={kind}
        {...BIG}
        className={`mask-${kind}${hatched ? ' hatched' : ''}`}
        style={hatched ? { fill: `url(#${hatchId})` } : undefined}
        mask={`url(#${builder.mask(region)})`}
        data-testid={`mask-${kind}`}
      />,
    );
  }
  if (layers.length === 0) return null;
  // Recorte no horizonte: as regiões ficam dentro dele, e o recorte evita que o Chrome deixe
  // vazar a hachura na borda do SVG ao gerar PDF.
  const clipId = `${prefix}-clip`;
  return (
    <g className="mask" data-testid="mask">
      <defs>
        <clipPath id={clipId}>
          <circle r={1} />
        </clipPath>
        {builder.defs}
        {hatches}
      </defs>
      <g clipPath={`url(#${clipId})`}>{layers}</g>
    </g>
  );
}
