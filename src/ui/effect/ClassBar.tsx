import { useId } from 'react';
import { useI18n } from '../i18n/useI18n';
import { CLASS_COLORS, CLASS_ORDER, type ClassName } from './classColors';

/**
 * Barra de 100% com a parte de cada classe (frias, neutras, quentes, sem classe, nessa ordem); o
 * texto alternativo traz os percentuais, e a tabela ao lado, os números.
 */
export function ClassBar({
  shares,
  label,
  testId,
}: {
  /** Fração de cada classe (soma 1). */
  shares: Record<ClassName, number>;
  label: string;
  testId: string;
}) {
  const { t, formatNumber } = useI18n();
  const hatch = `cb${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const W = 300;
  const H = 22;
  const parts: { c: ClassName; x: number; w: number }[] = [];
  let x = 0;
  for (const c of CLASS_ORDER) {
    if (!(shares[c] > 0)) continue;
    parts.push({ c, x, w: shares[c] * W });
    x += shares[c] * W;
  }
  const text = parts
    .map((p) =>
      t('classes.barLabel', {
        name: t(`classes.class.${p.c}`),
        share: formatNumber(Math.round(shares[p.c] * 100)),
      }),
    )
    .join('; ');
  return (
    <svg
      className="class-bar"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${label}: ${text}`}
      data-testid={testId}
    >
      <defs>
        <pattern id={hatch} patternUnits="userSpaceOnUse" width={5} height={5}>
          <rect width={5} height={5} fill="#ffffff" />
          <path d="M-1,1 l2,-2 M0,5 l5,-5 M4,6 l2,-2" stroke="#8c959f" strokeWidth={1} />
        </pattern>
      </defs>
      {parts.map((p) => (
        <rect
          key={p.c}
          x={p.x}
          y={0}
          width={p.w}
          height={H}
          fill={p.c === 'none' ? `url(#${hatch})` : CLASS_COLORS[p.c]}
          data-class={p.c}
        />
      ))}
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="none" stroke="#8c959f" />
    </svg>
  );
}
