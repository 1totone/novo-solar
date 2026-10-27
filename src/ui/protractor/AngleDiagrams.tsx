import type {
  AngleReference,
  AngleValues,
  ProtractorAngles,
} from '../../core/protractor/protractor';
import { onRovingKeyDown } from '../a11y/roving';
import { useI18n } from '../i18n/useI18n';
import { ANGLE_VIEWS, type AngleView } from './angleView';

/**
 * Onde se mede cada ângulo (decisão 0046, item d da 0044): α no corte, β na planta e γ na vista de
 * dentro para fora, na referência escolhida, com os valores digitados da sombra total (spec 01,
 * seção 1.3; as mesmas figuras de `docs/spec/figuras/`, simplificadas). Sem valor, o desenho mostra
 * um exemplo de 45°, mais claro. Os desenhos ilustram o ângulo; a máscara na carta é a conta.
 */

const RAD = Math.PI / 180;
/** Ângulo de exemplo quando o campo está vazio. */
const EXAMPLE = 45;

/** Arco em leque de a0 a a1 (graus no sentido do SVG: 0 = direita, 90 = para baixo). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) =>
    `${(cx + r * Math.cos(a * RAD)).toFixed(2)},${(cy + r * Math.sin(a * RAD)).toFixed(2)}`;
  const sweep = a1 > a0 ? 1 : 0;
  return `M${cx},${cy} L${p(a0)} A${r},${r} 0 0 ${sweep} ${p(a1)} Z`;
}

/** Ponto a `r` de (cx, cy) na direção `a` (graus do SVG). */
const at = (cx: number, cy: number, r: number, a: number) => ({
  x: cx + r * Math.cos(a * RAD),
  y: cy + r * Math.sin(a * RAD),
});

/** Distância de (x, y) até a borda do quadro de 100 × 100, menos 6, na direção `a`. */
function toFrame(x: number, y: number, a: number): number {
  const dx = Math.cos(a * RAD);
  const dy = Math.sin(a * RAD);
  const tx = dx > 1e-9 ? (100 - x) / dx : dx < -1e-9 ? -x / dx : Infinity;
  const ty = dy > 1e-9 ? (100 - y) / dy : dy < -1e-9 ? -y / dy : Infinity;
  return Math.max(0, Math.min(tx, ty) - 6);
}

/** Valor interno (o que define a geometria) a partir do digitado na referência dada. */
const internal = (v: number, reference: AngleReference) => (reference === 'internal' ? v : 90 - v);

interface Shown {
  value: number;
  example: boolean;
}
const shown = (pair: AngleValues | undefined): Shown =>
  pair ? { value: pair[0], example: false } : { value: EXAMPLE, example: true };

function Label({
  x,
  y,
  text,
  example,
  anchor = 'start',
}: {
  x: number;
  y: number;
  text: string;
  example: boolean;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`angle-label${example ? ' example' : ''}`}>
      {text}
    </text>
  );
}

export function AngleDiagrams({
  reference,
  angles,
  view,
  onViewChange,
}: {
  reference: AngleReference;
  angles: ProtractorAngles;
  view: AngleView;
  onViewChange: (view: AngleView) => void;
}) {
  const { t, formatNumber } = useI18n();
  const deg = (s: Shown, symbol: string) =>
    s.example ? symbol : `${symbol} ${formatNumber(s.value, Number.isInteger(s.value) ? 0 : 1)}°`;
  const from = t(reference === 'internal' ? 'angles.fromFacade' : 'angles.fromHorizontal');
  const fromNormal = t(reference === 'internal' ? 'angles.fromFacade' : 'angles.fromNormal');
  const fromVertical = t(
    reference === 'internal' ? 'angles.fromVertical' : 'angles.fromHorizontal',
  );
  const ext = reference === 'external';

  // Corte (α): parede em x = 36, janela do peitoril (B, y = 80) à verga (y = 30), exterior à direita.
  const alpha = shown(angles.alpha);
  const aInt = internal(alpha.value, reference);
  // Sem limite: uma peça longa sai do quadro (o SVG corta), e o ângulo continua o digitado.
  const depth = 50 * Math.tan(Math.min(89.5, aInt) * RAD);
  const B = { x: 36, y: 80 };
  const T = { x: 36 + depth, y: 30 };
  const aRay = (Math.atan2(T.y - B.y, T.x - B.x) * 180) / Math.PI;
  const sunA = at(B.x, B.y, toFrame(B.x, B.y, aRay), aRay);
  const aMid = at(B.x, B.y, 30, ((ext ? 0 : -90) + aRay) / 2);

  // Planta (β): fachada em y = 72, janela de x = 30 a 70 (largura 40), exterior para cima; cada
  // aleta na aresta do seu lado, e o ângulo medido da aresta oposta.
  const right = shown(angles.betaRight);
  const left = angles.betaLeft ? shown(angles.betaLeft) : null;
  const finLen = (s: Shown) => 40 * Math.tan(Math.min(89.5, internal(s.value, reference)) * RAD);
  const fins: { side: 'right' | 'left'; s: Shown; edge: number; from: number }[] = [
    ...(angles.betaRight || !left
      ? [{ side: 'right' as const, s: right, edge: 70, from: 30 }]
      : []),
    ...(left ? [{ side: 'left' as const, s: left, edge: 30, from: 70 }] : []),
  ];

  // Vista de dentro (γ): janela de x = 38 a 62 e de y = 62 a 82; brise em y = 58, 24 acima do
  // peitoril (o γ longo cabe melhor numa janela pequena no quadro).
  const gRight = shown(angles.gammaRight);
  const gLeft = angles.gammaLeft ? shown(angles.gammaLeft) : null;
  const ends: { side: 'right' | 'left'; s: Shown; corner: number }[] = [
    ...(angles.gammaRight || !gLeft ? [{ side: 'right' as const, s: gRight, corner: 62 }] : []),
    ...(gLeft ? [{ side: 'left' as const, s: gLeft, corner: 38 }] : []),
  ];
  const reach = (s: Shown) => 24 * Math.tan(Math.min(89.5, internal(s.value, reference)) * RAD);
  const barLeft =
    38 - (ends.find((e) => e.side === 'left') ? reach(ends.find((e) => e.side === 'left')!.s) : 4);
  const barRight =
    62 +
    (ends.find((e) => e.side === 'right') ? reach(ends.find((e) => e.side === 'right')!.s) : 4);

  const caption: Record<AngleView, string> = {
    alpha: t('angles.section'),
    beta: t('angles.plan'),
    gamma: t('angles.view'),
  };

  return (
    <div className="angle-diagrams" data-testid="angle-diagrams">
      <div
        className="segmented"
        role="radiogroup"
        aria-label={t('angles.choose')}
        onKeyDown={(e) => onRovingKeyDown(e, 'radio')}
      >
        {ANGLE_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={view === v}
            tabIndex={view === v ? 0 : -1}
            data-testid={`angle-view-${v}`}
            onClick={() => onViewChange(v)}
          >
            {caption[v]}
          </button>
        ))}
      </div>
      {view === 'alpha' && (
        <figure>
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={t('angles.alphaDesc', { angle: deg(alpha, 'α'), from })}
            data-testid="angle-diagram-alpha"
            data-depth={depth.toFixed(2)}
          >
            <line x1={36} y1={4} x2={36} y2={30} className="wall" />
            <line x1={36} y1={80} x2={36} y2={97} className="wall" />
            <line x1={36} y1={30} x2={36} y2={80} className="glass" />
            <line
              x1={34}
              y1={30}
              x2={T.x}
              y2={30}
              className={`device${alpha.example ? ' example' : ''}`}
              data-part="device"
            />
            <line x1={B.x} y1={B.y} x2={sunA.x} y2={sunA.y} className="ray" data-part="ray" />
            <circle cx={sunA.x} cy={sunA.y} r={3.5} className="sun" />
            {ext ? (
              <line
                x1={B.x}
                y1={B.y}
                x2={96}
                y2={B.y}
                className="reference"
                data-part="reference"
              />
            ) : (
              <line x1={B.x} y1={B.y} x2={B.x} y2={8} className="reference" data-part="reference" />
            )}
            <path d={arc(B.x, B.y, 18, ext ? 0 : -90, aRay)} className="angle-arc" />
            <Label x={aMid.x + 3} y={aMid.y} text={deg(alpha, 'α')} example={alpha.example} />
            <text x={3} y={96} className="side-label">
              {t('angles.inside')}
            </text>
            <text x={97} y={96} textAnchor="end" className="side-label">
              {t('angles.outside')}
            </text>
          </svg>
        </figure>
      )}
      {view === 'beta' && (
        <figure>
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={t('angles.betaDesc', { from: fromNormal })}
            data-testid="angle-diagram-beta"
          >
            <line x1={2} y1={72} x2={30} y2={72} className="wall" />
            <line x1={70} y1={72} x2={98} y2={72} className="wall" />
            <line x1={30} y1={72} x2={70} y2={72} className="glass" />
            {fins.map(({ side, s, edge, from: origin }) => {
              const len = finLen(s);
              const tip = { x: edge, y: 72 - len };
              const ray = (Math.atan2(tip.y - 72, tip.x - origin) * 180) / Math.PI;
              const base = ext ? -90 : side === 'right' ? 0 : -180;
              const sun = at(origin, 72, toFrame(origin, 72, ray), ray);
              return (
                <g key={side}>
                  <line
                    x1={edge}
                    y1={74}
                    x2={tip.x}
                    y2={tip.y}
                    className={`device${s.example ? ' example' : ''}`}
                    data-part={`device-${side}`}
                  />
                  <line
                    x1={origin}
                    y1={72}
                    x2={sun.x}
                    y2={sun.y}
                    className="ray"
                    data-part={`ray-${side}`}
                  />
                  {ext ? (
                    <line
                      x1={origin}
                      y1={72}
                      x2={origin}
                      y2={6}
                      className="reference"
                      data-part={`reference-${side}`}
                    />
                  ) : null}
                  <path d={arc(origin, 72, 14, base, ray)} className="angle-arc" />
                  {/* O rótulo fica no vértice do ângulo, na aresta oposta à aleta, onde se mede. */}
                  <Label
                    x={origin}
                    y={83}
                    anchor="middle"
                    text={deg(s, side === 'right' ? 'βd' : 'βe')}
                    example={s.example}
                  />
                </g>
              );
            })}
            <text x={50} y={96} textAnchor="middle" className="side-label">
              {t('angles.inside')}
            </text>
            <text x={50} y={8} textAnchor="middle" className="side-label">
              {t('angles.outside')}
            </text>
          </svg>
        </figure>
      )}
      {view === 'gamma' && (
        <figure>
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={t('angles.gammaDesc', { from: fromVertical })}
            data-testid="angle-diagram-gamma"
          >
            <rect x={38} y={62} width={24} height={20} className="window" />
            <line x1={barLeft} y1={58} x2={barRight} y2={58} className="device" />
            {ends.map(({ side, s, corner }) => {
              const end = { x: side === 'right' ? barRight : barLeft, y: 58 };
              const ray = (Math.atan2(end.y - 82, end.x - corner) * 180) / Math.PI;
              const base = ext ? (side === 'right' ? 0 : -180) : -90;
              return (
                <g key={side}>
                  <line
                    x1={corner}
                    y1={82}
                    x2={end.x}
                    y2={end.y}
                    className="ray"
                    data-part={`ray-${side}`}
                  />
                  {ext ? (
                    <line
                      x1={corner}
                      y1={82}
                      x2={side === 'right' ? 97 : 3}
                      y2={82}
                      className="reference"
                      data-part={`reference-${side}`}
                    />
                  ) : (
                    <line
                      x1={corner}
                      y1={82}
                      x2={corner}
                      y2={46}
                      className="reference"
                      data-part={`reference-${side}`}
                    />
                  )}
                  <path d={arc(corner, 82, 12, base, ray)} className="angle-arc" />
                  <Label
                    x={side === 'right' ? 64 : 36}
                    y={93}
                    anchor={side === 'right' ? 'start' : 'end'}
                    text={deg(s, side === 'right' ? 'γd' : 'γe')}
                    example={s.example}
                  />
                </g>
              );
            })}
          </svg>
        </figure>
      )}
    </div>
  );
}
