/**
 * Dimensionamento inverso: do período a sombrear para os ângulos α, β e γ e as dimensões do brise e
 * das aletas que sombreiam 100% da janela, e subdivisão em lâminas mantendo os ângulos (F3.6).
 *
 * Especificação: docs/spec/10-dimensionamento-inverso.md (proposta, decisão 0022). Ângulos do sol
 * externos (spec 01, seção 1.3): perfil α = atan2(s_z, s_y), ψ = atan2(s_x, s_y) e
 * γ = atan2(s_z, |s_x|), no referencial da fachada. As peças saem no formato de geometry.ts.
 *
 * Validação: ângulos contra o pvlib, ida e volta e minimalidade com a máscara pela geometria
 * (tests/referencia/dimensionamentoInverso.test.ts) e inverse.test.ts.
 */
import type { Site } from '../chart/sunChart';
import { REFERENCE_YEAR } from '../solar/constants';
import { solarPosition } from '../solar/spa';
import { localStandardToUtc } from '../solar/time';
import type { Fin, HorizontalLouvers, Overhang, VerticalLouvers } from './geometry';
import { facadeVector, sunOnWindow, type FacadeVector } from './shadedFraction';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const MS_PER_HOUR = 3_600_000;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface DayOfYear {
  month: number;
  day: number;
}

export interface ShadingPeriod {
  /** Primeiro e último dia, inclusive; o intervalo pode passar pelo fim do ano. */
  start: DayOfYear;
  end: DayOfYear;
  /** Primeira e última hora do dia, inclusive (hora decimal). */
  startHour: number;
  endHour: number;
  /** Hora solar verdadeira (padrão, a das linhas da carta) ou hora legal do fuso do local. */
  timeBase?: 'solar' | 'legal';
  /** Intervalo entre amostras (padrão 5 min). */
  stepMinutes?: number;
}

/** Amostra do período com o sol na janela; ângulos externos em graus. */
export interface PeriodSample {
  month: number;
  day: number;
  hour: number;
  s: FacadeVector;
  /** Ângulo azimutal relativo, positivo à direita de quem olha para fora. */
  psi: number;
  /** Ângulo de perfil (α externo do sol). */
  profile: number;
  /** Ângulo do sol no plano da fachada (γ externo do sol). */
  gamma: number;
}

export interface Extreme {
  external: number;
  internal: number;
  /** Amostra que determina o ângulo (o ponto da carta por onde passa a curva). */
  sample: PeriodSample;
}

/** Ângulos exigidos (seção 10.2); null quando não há amostra que os determine. */
export interface RequiredAngles {
  /** α1 do brise: menor perfil. */
  alpha: Extreme | null;
  /** α2 do brise afastado: maior perfil. */
  alphaMax: Extreme | null;
  /** γ do brise de cada lado: menor γ das amostras daquele lado. */
  gammaRight: Extreme | null;
  gammaLeft: Extreme | null;
  /** β da aleta de cada lado: menor |ψ| das amostras daquele lado. */
  betaRight: Extreme | null;
  betaLeft: Extreme | null;
  /** γ do topo da aleta de cada lado: maior γ das amostras daquele lado. */
  finGammaRight: Extreme | null;
  finGammaLeft: Extreme | null;
}

export interface WindowSize {
  width: number;
  height: number;
}

function checkDay({ month, day }: DayOfYear): void {
  if (!(Number.isInteger(month) && month >= 1 && month <= 12))
    throw new RangeError('invalid month');
  if (!(Number.isInteger(day) && day >= 1 && day <= DAYS_IN_MONTH[month - 1]!)) {
    throw new RangeError('invalid day');
  }
}

const dayOfYear = ({ month, day }: DayOfYear) =>
  DAYS_IN_MONTH.slice(0, month - 1).reduce((a, b) => a + b, 0) + day;

/** Dias do período, em ordem, passando pelo fim do ano se preciso. */
function periodDays(start: DayOfYear, end: DayOfYear): DayOfYear[] {
  checkDay(start);
  checkDay(end);
  const all: DayOfYear[] = [];
  DAYS_IN_MONTH.forEach((n, m) => {
    for (let d = 1; d <= n; d++) all.push({ month: m + 1, day: d });
  });
  const a = dayOfYear(start) - 1;
  const b = dayOfYear(end) - 1;
  return a <= b ? all.slice(a, b + 1) : [...all.slice(a), ...all.slice(0, b + 1)];
}

const wrap180 = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * Instante (ms UTC) em que o ângulo horário do SPA vale 15° · (hora − 12), por Newton a partir de
 * `guess` (como as linhas horárias da carta, spec 02, seção 2.5).
 */
function solarTimeInstant(site: Site, solarHour: number, guess: number): number {
  const target = 15 * (solarHour - 12);
  let t = guess;
  for (let i = 0; i < 8; i++) {
    const h = solarPosition(t, site.latitude, site.longitude, site.elevation).hourAngle;
    const dt = (wrap180(h - target) / 15) * MS_PER_HOUR;
    t -= dt;
    if (Math.abs(dt) < 1) break;
  }
  return t;
}

/**
 * Amostras do período com o sol na janela (seção 10.1). `total` conta todas as amostras, inclusive as
 * com o sol abaixo do horizonte ou atrás da fachada.
 */
export function periodSamples(
  site: Site,
  orientation: number,
  period: ShadingPeriod,
): { samples: PeriodSample[]; total: number } {
  const step = period.stepMinutes ?? 5;
  const { startHour, endHour } = period;
  if (!(step > 0)) throw new RangeError('stepMinutes must be positive');
  if (!(startHour >= 0 && endHour <= 24 && startHour <= endHour)) {
    throw new RangeError('hours must satisfy 0 <= startHour <= endHour <= 24');
  }
  const count = Math.round(((endHour - startHour) * 60) / step);
  const hours = Array.from({ length: count + 1 }, (_, k) => startHour + (k * step) / 60);
  const solar = (period.timeBase ?? 'solar') === 'solar';
  const samples: PeriodSample[] = [];
  let total = 0;
  for (const { month, day } of periodDays(period.start, period.end)) {
    // Palpite inicial pela longitude (equação do tempo nula); depois, a amostra anterior mais o passo.
    let guess =
      Date.UTC(REFERENCE_YEAR, month - 1, day) + (hours[0]! - site.longitude / 15) * MS_PER_HOUR;
    for (const hour of hours) {
      total++;
      let t: number;
      if (solar) {
        t = solarTimeInstant(site, hour, guess);
        guess = t + step * 60_000;
      } else {
        t = localStandardToUtc(REFERENCE_YEAR, month, day, hour, site.timeZone);
      }
      const p = solarPosition(t, site.latitude, site.longitude, site.elevation);
      const s = facadeVector(p.elevation, p.azimuth, orientation);
      if (!sunOnWindow(s)) continue;
      samples.push({
        month,
        day,
        hour,
        s,
        psi: Math.atan2(s.x, s.y) * DEG,
        profile: Math.atan2(s.z, s.y) * DEG,
        gamma: Math.atan2(s.z, Math.abs(s.x)) * DEG,
      });
    }
  }
  return { samples, total };
}

function extreme(
  samples: readonly PeriodSample[],
  value: (p: PeriodSample) => number,
  pick: 'min' | 'max',
): Extreme | null {
  let best: PeriodSample | null = null;
  let bestValue = pick === 'min' ? Infinity : -Infinity;
  for (const p of samples) {
    const v = value(p);
    if (pick === 'min' ? v < bestValue : v > bestValue) {
      best = p;
      bestValue = v;
    }
  }
  return best ? { external: bestValue, internal: 90 - bestValue, sample: best } : null;
}

/** Ângulos que sombreiam todas as amostras com a menor proteção (seção 10.2). */
export function requiredAngles(samples: readonly PeriodSample[]): RequiredAngles {
  const right = samples.filter((p) => p.psi > 0);
  const left = samples.filter((p) => p.psi < 0);
  return {
    alpha: extreme(samples, (p) => p.profile, 'min'),
    alphaMax: extreme(samples, (p) => p.profile, 'max'),
    gammaRight: extreme(right, (p) => p.gamma, 'min'),
    gammaLeft: extreme(left, (p) => p.gamma, 'min'),
    betaRight: extreme(right, (p) => p.psi, 'min'),
    betaLeft: extreme(left, (p) => -p.psi, 'min'),
    finGammaRight: extreme(right, (p) => p.gamma, 'max'),
    finGammaLeft: extreme(left, (p) => p.gamma, 'max'),
  };
}

/** Cateto oposto a um ângulo externo θ sobre o cateto adjacente `side`: side · cot θ. */
const cotTimes = (side: number, externalDeg: number) =>
  (side * Math.cos(externalDeg * RAD)) / Math.sin(externalDeg * RAD);

export interface SizedOverhang extends Overhang {
  above: number;
  gap: number;
  extendLeft: number;
  extendRight: number;
}

export type OverhangResult =
  { ok: true; device: SizedOverhang } | { ok: false; reason: 'noSun' | 'gapTooLarge' };

/**
 * Brise horizontal que sombreia todas as amostras (seção 10.3): na altura `above` acima da verga
 * (padrão 0) ou, com afastamento `gap`, na altura que fecha a fresta para o sol mais alto do período.
 */
export function sizeOverhang(
  window: WindowSize,
  angles: RequiredAngles,
  options: { above?: number; gap?: number } = {},
): OverhangResult {
  const { alpha, alphaMax, gammaRight, gammaLeft } = angles;
  if (!alpha || !alphaMax) return { ok: false, reason: 'noSun' };
  const gap = options.gap ?? 0;
  if (!(gap >= 0)) throw new RangeError('gap must be zero or positive');
  let above = options.above ?? 0;
  // Com o sol perto do plano da fachada no período, α2 tende a 90° e a altura a valores absurdos: a
  // fresta não serve para aquele período (a interface avisa).
  if (gap > 0) above = gap * Math.tan(alphaMax.external * RAD);
  if (!(above >= 0)) throw new RangeError('above must be zero or positive');
  const rise = window.height + above;
  // Com e = g · tan α2, D = (H + e) · cot α1 − g > 0 sempre, porque α2 ≥ α1 (seção 10.3).
  const depth = cotTimes(rise, alpha.external) - gap;
  return {
    ok: true,
    device: {
      kind: 'overhang',
      depth,
      above,
      gap,
      extendRight: gammaRight ? cotTimes(rise, gammaRight.external) : 0,
      extendLeft: gammaLeft ? cotTimes(rise, gammaLeft.external) : 0,
    },
  };
}

export interface SizedFin extends Fin {
  depth: number;
  extendAbove: number;
}

/**
 * Aletas encostadas nas laterais da janela que sombreiam as amostras de cada lado (seção 10.3);
 * null do lado sem sol. Com o sol perto da normal, a profundidade tende ao infinito.
 */
export function sizeFins(
  window: WindowSize,
  angles: RequiredAngles,
): { right: SizedFin | null; left: SizedFin | null } {
  const fin = (side: 'right' | 'left', beta: Extreme | null, top: Extreme | null) =>
    beta && top
      ? {
          kind: 'fin' as const,
          side,
          depth: cotTimes(window.width, beta.external),
          offset: 0,
          gap: 0,
          extendAbove: window.width * Math.tan(top.external * RAD),
          extendBelow: 0,
        }
      : null;
  return {
    right: fin('right', angles.betaRight, angles.finGammaRight),
    left: fin('left', angles.betaLeft, angles.finGammaLeft),
  };
}

function checkCount(n: number): void {
  if (!(Number.isInteger(n) && n >= 1)) throw new RangeError('count must be a positive integer');
}

/**
 * n lâminas horizontais com os mesmos α e γ do brise (sem afastamento): corda D / n, passo
 * (H + e) / n, a primeira na altura do brise, prolongamentos divididos por n (seção 10.4).
 */
export function subdivideOverhang(
  window: WindowSize,
  overhang: SizedOverhang,
  n: number,
): HorizontalLouvers {
  checkCount(n);
  if (overhang.gap !== 0) throw new RangeError('only overhangs without a gap can be subdivided');
  return {
    kind: 'horizontalLouvers',
    count: n,
    chord: overhang.depth / n,
    pitch: (window.height + overhang.above) / n,
    angle: 0,
    gap: 0,
    above: overhang.above,
    extendLeft: overhang.extendLeft / n,
    extendRight: overhang.extendRight / n,
  };
}

/**
 * n + 1 lâminas verticais que dividem a janela em n faixas, com o β e o γ de aleta mais exigentes
 * dos dois lados (seção 10.4).
 */
export function subdivideFins(
  window: WindowSize,
  fins: { right: SizedFin | null; left: SizedFin | null },
  n: number,
): VerticalLouvers {
  checkCount(n);
  const list = [fins.right, fins.left].filter((f): f is SizedFin => f !== null);
  if (list.length === 0) throw new RangeError('no fins to subdivide');
  return {
    kind: 'verticalLouvers',
    count: n + 1,
    chord: Math.max(...list.map((f) => f.depth)) / n,
    pitch: window.width / n,
    angle: 0,
    gap: 0,
    start: 0,
    extendAbove: Math.max(...list.map((f) => f.extendAbove)) / n,
    extendBelow: 0,
  };
}
