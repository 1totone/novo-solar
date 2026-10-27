/**
 * Conferência de cores (F4.6, decisão 0030): contraste WCAG 2 e distância de cor em OKLab (×100)
 * com a simulação de daltonismo de Machado, Oliveira e Fernandes (2009), severidade 1,0, como no
 * validador de paletas usado no projeto (tests/acessibilidade/paleta.test.ts).
 */

export type Cvd = 'protan' | 'deutan' | 'tritan';
type Rgb = [number, number, number];

/** Matrizes de Machado, Oliveira e Fernandes (2009), severidade 1,0, sobre RGB linear. */
const MACHADO: Record<Cvd, [Rgb, Rgb, Rgb]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** Cor CSS em sRGB de 0 a 1: #rrggbb ou rgb(r g b / a%), composta sobre o fundo dado. */
export function parseColor(css: string, background: Rgb = [1, 1, 1]): Rgb {
  const s = css.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(s);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16) / 255) as Rgb;
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)%)?\s*\)$/i.exec(s);
  if (!rgb) throw new Error(`cor não reconhecida: ${css}`);
  const c = [rgb[1], rgb[2], rgb[3]].map((v) => Number(v) / 255) as Rgb;
  const a = rgb[4] === undefined ? 1 : Number(rgb[4]) / 100;
  // Composição em sRGB, como o navegador faz por padrão.
  return c.map((v, i) => a * v + (1 - a) * background[i]!) as Rgb;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linear = (c: Rgb) => c.map(toLinear) as Rgb;

export function relativeLuminance(c: Rgb): number {
  const [r, g, b] = linear(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste da WCAG 2. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function oklabFromLinear([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab de uma cor sRGB (L de 0 a 1). */
export const oklab = (c: Rgb): Rgb => oklabFromLinear(linear(c));

/** OKLCH: luminosidade, croma e matiz (graus). */
export function oklch(c: Rgb): Rgb {
  const [L, a, b] = oklab(c);
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

function simulate(c: Rgb, kind: Cvd): Rgb {
  const [r, g, b] = linear(c);
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return MACHADO[kind].map(([x, y, z]) => clamp(x * r + y * g + z * b)) as Rgb;
}

/** Distância em OKLab ×100, na visão normal ou com a simulação do tipo dado. */
export function deltaE(a: Rgb, b: Rgb, kind?: Cvd): number {
  const p = oklabFromLinear(kind ? simulate(a, kind) : linear(a));
  const q = oklabFromLinear(kind ? simulate(b, kind) : linear(b));
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
