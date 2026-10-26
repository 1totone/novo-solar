import { useId, type ReactNode } from 'react';
import type { MaskRegions } from '../../core/mask/mask';
import { ChartClip } from '../chart/ChartClip';
import { useChartProjection } from '../chart/projectionContext';
import { BIG, HATCH, MaskBuilder, shortHash } from './maskBuilder';

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
  const projection = useChartProjection();
  const signature = shortHash(
    JSON.stringify([regions.total, regions.partial, projection.kind, projection.center]),
  );
  const prefix = `mask${useId().replace(/[^a-zA-Z0-9_-]/g, '')}${signature}`;
  const builder = new MaskBuilder(prefix, projection);
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
        <ChartClip id={clipId} />
        {builder.defs}
        {hatches}
      </defs>
      <g clipPath={`url(#${clipId})`}>{layers}</g>
    </g>
  );
}
