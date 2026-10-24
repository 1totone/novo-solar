import type { WindRose } from '../../core/wind/windRose';
import { useI18n } from '../i18n/useI18n';
import { SPEED_COLORS, SPEED_MODE_COLOR } from './colors';

/** Raio do círculo da calmaria, no centro (a rosa vai de 0 a 1). */
const R0 = 0.14;

/** Passo "redondo" para os anéis, entre 3 e 6 anéis até o máximo. */
function ringStep(max: number, candidates: number[]): number {
  for (const s of candidates) if (max / s <= 5) return s;
  return candidates[candidates.length - 1]!;
}

/** Setor de coroa circular entre os raios a e b, centrado no azimute az, com largura w (graus). */
function wedge(az: number, w: number, a: number, b: number): string {
  const rad = Math.PI / 180;
  const t1 = (az - w / 2) * rad;
  const t2 = (az + w / 2) * rad;
  const p = (r: number, t: number) =>
    `${(r * Math.sin(t)).toFixed(5)},${(-r * Math.cos(t)).toFixed(5)}`;
  const large = w > 180 ? 1 : 0;
  return `M${p(a, t1)} L${p(b, t1)} A${b},${b} 0 ${large} 1 ${p(b, t2)} L${p(a, t2)} A${a},${a} 0 ${large} 0 ${p(a, t1)} Z`;
}

export function WindRoseChart({
  rose,
  show,
  labels,
  title,
}: {
  rose: WindRose;
  show: 'frequency' | 'speed';
  /** Rótulos dos pontos cardeais, um por setor de 16 (N, NNE, ...). */
  labels: string[];
  title: string;
}) {
  const { formatNumber } = useI18n();
  const n = rose.sectors;
  const w = 360 / n;
  const totals = rose.frequency.map((row) => row.reduce((a, b) => a + b, 0));
  const speeds = rose.meanSpeed.map((v) => v ?? 0);
  const max = show === 'frequency' ? Math.max(...totals, 1e-9) : Math.max(...speeds, 1e-9);
  const step =
    show === 'frequency' ? ringStep(max, [1, 2, 5, 10, 20, 25, 50]) : ringStep(max, [0.5, 1, 2, 5]);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const radius = (v: number) => R0 + (1 - R0) * (v / top);
  const rings = Array.from({ length: Math.round(top / step) }, (_, i) => (i + 1) * step);
  const gap = Math.min(4, w * 0.15);

  return (
    <svg
      className="wind-rose"
      viewBox="-1.3 -1.3 2.6 2.6"
      role="img"
      aria-label={title}
      data-testid="wind-rose"
    >
      <title>{title}</title>
      <g className="rose-grid">
        {rings.map((v) => (
          <circle key={v} r={radius(v)} />
        ))}
        {Array.from({ length: n }, (_, k) => {
          const t = (k * w * Math.PI) / 180;
          return (
            <line
              key={k}
              x1={R0 * Math.sin(t)}
              y1={-R0 * Math.cos(t)}
              x2={Math.sin(t)}
              y2={-Math.cos(t)}
            />
          );
        })}
      </g>
      <g className="rose-wedges">
        {Array.from({ length: n }, (_, k) => {
          const az = k * w;
          if (show === 'speed') {
            const v = rose.meanSpeed[k];
            if (v === null || v === undefined) return null;
            return (
              <path
                key={k}
                d={wedge(az, w - gap, R0, radius(v))}
                style={{ fill: SPEED_MODE_COLOR }}
                data-sector={k}
              />
            );
          }
          let acc = 0;
          return (
            <g key={k} data-sector={k}>
              {rose.frequency[k]!.map((f, c) => {
                if (f <= 0) return null;
                const a = radius(acc);
                acc += f;
                return (
                  <path
                    key={c}
                    d={wedge(az, w - gap, a, radius(acc))}
                    style={{ fill: SPEED_COLORS[c] }}
                  />
                );
              })}
            </g>
          );
        })}
      </g>
      <g className="rose-labels">
        {rings.map((v) => {
          const t = ((w / 2) * Math.PI) / 180;
          const r = radius(v);
          return (
            <text key={v} x={r * Math.sin(t) + 0.02} y={-r * Math.cos(t)} className="ring-label">
              {show === 'frequency'
                ? `${formatNumber(v)}%`
                : `${formatNumber(v, Number.isInteger(v) ? 0 : 1)} m/s`}
            </text>
          );
        })}
        {Array.from({ length: n }, (_, k) => {
          const t = (k * w * Math.PI) / 180;
          return (
            <text
              key={k}
              x={1.13 * Math.sin(t)}
              y={-1.13 * Math.cos(t)}
              className={k % (n / 4) === 0 ? 'cardinal' : 'point'}
            >
              {labels[(k * 16) / n]}
            </text>
          );
        })}
        {show === 'frequency' && (
          <>
            <circle r={R0} className="calm" />
            <text x={0} y={0} className="calm-label" data-testid="calm-label">
              {`${formatNumber(rose.calm, rose.calm < 10 ? 1 : 0)}%`}
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
