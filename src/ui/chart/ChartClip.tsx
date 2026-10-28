import { useChartProjection } from './projectionContext';

/**
 * Recorte da carta: o horizonte nas projeções azimutais; na cilíndrica, a faixa de 0° a 90° de
 * altura e uma volta de azimute.
 */
export function ChartClip({ id }: { id: string }) {
  const p = useChartProjection();
  return (
    <clipPath id={id}>
      {p.kind === 'cylindrical' ? <rect x={-1} y={-1} width={2} height={1} /> : <circle r={1} />}
    </clipPath>
  );
}
