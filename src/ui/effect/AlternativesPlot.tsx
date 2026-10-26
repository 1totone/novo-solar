import { useI18n } from '../i18n/useI18n';

export interface PlotPoint {
  id: string;
  label: string;
  /** Admitida nas horas frias (0 a 1). */
  x: number;
  /** Bloqueada nas horas quentes (0 a 1). */
  y: number;
  dominated: boolean;
  current: boolean;
}

const W = 300;
const H = 230;
const M = { left: 40, right: 14, top: 12, bottom: 40 };
const TICKS = [0, 25, 50, 75, 100];

/**
 * As alternativas no plano dos dois percentuais (F3.5): admitida nas horas frias na horizontal e
 * bloqueada nas horas quentes na vertical; o canto de cima à direita é o ideal. Não superadas em
 * azul-petróleo cheio, superadas em cinza vazado, cada uma com o nome ao lado; a tabela traz os
 * números.
 */
export function AlternativesPlot({ points }: { points: readonly PlotPoint[] }) {
  const { t, formatNumber } = useI18n();
  const px = (x: number) => M.left + x * (W - M.left - M.right);
  const py = (y: number) => H - M.bottom - y * (H - M.top - M.bottom);
  return (
    <svg
      className="alternatives-plot"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t('alternatives.plot')}
      data-testid="alternatives-plot"
      fontFamily="inherit"
    >
      {TICKS.map((v) => (
        <g key={v}>
          <line x1={px(v / 100)} x2={px(v / 100)} y1={py(0)} y2={py(1)} stroke="#e1e4e8" />
          <line x1={px(0)} x2={px(1)} y1={py(v / 100)} y2={py(v / 100)} stroke="#e1e4e8" />
          <text x={px(v / 100)} y={py(0) + 14} fontSize={11} textAnchor="middle" fill="#3d444d">
            {formatNumber(v)}
          </text>
          <text x={px(0) - 6} y={py(v / 100) + 4} fontSize={11} textAnchor="end" fill="#3d444d">
            {formatNumber(v)}
          </text>
        </g>
      ))}
      <rect
        x={px(0)}
        y={py(1)}
        width={px(1) - px(0)}
        height={py(0) - py(1)}
        fill="none"
        stroke="#8c959f"
      />
      <text x={px(1) - 4} y={py(1) + 13} fontSize={11} textAnchor="end" fill="#3d444d">
        {t('alternatives.plotIdeal')}
      </text>
      <text x={(px(0) + px(1)) / 2} y={H - 6} fontSize={11} textAnchor="middle" fill="#3d444d">
        {t('alternatives.plotX')}
      </text>
      <text
        transform={`translate(11 ${(py(0) + py(1)) / 2}) rotate(-90)`}
        fontSize={11}
        textAnchor="middle"
        fill="#3d444d"
      >
        {t('alternatives.plotY')}
      </text>
      {points.map((p) => {
        const x = px(p.x);
        const y = py(p.y);
        const left = p.x > 0.6;
        return (
          <g key={p.id} data-point={p.id} data-dominated={p.dominated}>
            <circle
              cx={x}
              cy={y}
              r={p.current ? 6 : 5}
              fill={p.dominated ? '#ffffff' : '#005f73'}
              stroke={p.dominated ? '#6e7781' : '#003a47'}
              strokeWidth={2}
            />
            <text
              x={x + (left ? -9 : 9)}
              y={y + 4}
              fontSize={11}
              textAnchor={left ? 'end' : 'start'}
              fill="#1b1f24"
              stroke="#ffffff"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {p.label.length > 18 ? `${p.label.slice(0, 17)}…` : p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
