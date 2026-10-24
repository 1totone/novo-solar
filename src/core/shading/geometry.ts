/**
 * Janela e proteções como placas finas (núcleo do F3.1 e do F3.2).
 *
 * Especificação: docs/spec/07-mascara-pela-geometria.md, seção 7.1. Referencial da fachada
 * (spec 01, seção 1.2): x à direita de quem está dentro olhando para fora, y na normal externa,
 * z para cima; a janela fica no plano do vidro, y = 0, com x de 0 a W e z de 0 (peitoril) a H.
 * Comprimentos em metros, ângulos em graus.
 *
 * Validação: placas iguais às montadas em Python a partir dos mesmos parâmetros
 * (tests/referencia/mascaraGeometria.test.ts) e geometry.test.ts.
 */

const RAD = Math.PI / 180;

/** Prolongamento infinito, em metros (spec 07, seção 7.1). */
export const INFINITE_EXTENT = 1e6;

export type Vec3 = readonly [number, number, number];

/** Polígono plano e convexo, de espessura nula, com todos os vértices diante do vidro (y ≥ 0). */
export type Plate = readonly Vec3[];

export interface WindowGeometry {
  width: number;
  height: number;
  /** Distância do vidro ao plano externo da fachada (padrão 0); gera verga, peitoril e ombreiras. */
  setback?: number;
}

/** Brise horizontal: placa horizontal acima da janela. Prolongamentos podem ser Infinity. */
export interface Overhang {
  kind: 'overhang';
  depth: number;
  /** Altura da placa acima da verga (≥ 0). */
  above: number;
  /** Afastamento da fachada (padrão 0). */
  gap?: number;
  /** Prolongamento além da lateral esquerda da janela (padrão 0). */
  extendLeft?: number;
  extendRight?: number;
}

/** Aleta (brise vertical): placa vertical perpendicular à fachada, ao lado da janela. */
export interface Fin {
  kind: 'fin';
  side: 'right' | 'left';
  depth: number;
  /** Distância entre a aleta e a lateral da janela (padrão 0). */
  offset?: number;
  gap?: number;
  /** Prolongamento acima da verga (padrão 0). */
  extendAbove?: number;
  /** Prolongamento abaixo do peitoril (padrão 0). */
  extendBelow?: number;
}

/** Lâminas horizontais paralelas, de cima para baixo, girando em torno da borda interna. */
export interface HorizontalLouvers {
  kind: 'horizontalLouvers';
  count: number;
  /** Largura da lâmina (corda). */
  chord: number;
  /** Distância vertical entre lâminas vizinhas. */
  pitch: number;
  /** Inclinação de −90° a 90°, positiva com a borda externa para baixo (padrão 0). */
  angle?: number;
  /** Afastamento da borda interna em relação à fachada (padrão 0). */
  gap?: number;
  /** Altura da borda interna da primeira lâmina acima da verga (pode ser negativa). */
  above: number;
  extendLeft?: number;
  extendRight?: number;
}

/** Lâminas verticais paralelas, da esquerda para a direita, girando em torno da borda interna. */
export interface VerticalLouvers {
  kind: 'verticalLouvers';
  count: number;
  chord: number;
  /** Distância horizontal entre lâminas vizinhas. */
  pitch: number;
  /** Rotação de −90° a 90°, positiva com a borda externa para a direita (padrão 0). */
  angle?: number;
  gap?: number;
  /** Posição da borda interna da primeira lâmina, a partir da lateral esquerda da janela. */
  start: number;
  extendAbove?: number;
  extendBelow?: number;
}

/** Placa dada pelos vértices (plana e convexa). */
export interface FreePlate {
  kind: 'plate';
  vertices: readonly Vec3[];
}

export type Device = Overhang | Fin | HorizontalLouvers | VerticalLouvers | FreePlate;

/** Janela e placas, prontas para o cálculo da sombra. */
export interface Scene {
  width: number;
  height: number;
  plates: Plate[];
}

function positive(value: number, what: string): number {
  if (!(Number.isFinite(value) && value > 0)) throw new RangeError(`${what} must be positive`);
  return value;
}

function nonNegative(value: number | undefined, what: string): number {
  const v = value ?? 0;
  if (!(Number.isFinite(v) && v >= 0)) throw new RangeError(`${what} must be zero or positive`);
  return v;
}

function finite(value: number, what: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${what} must be a finite number`);
  return value;
}

/** Prolongamento: zero, positivo ou Infinity (vira INFINITE_EXTENT). */
function extent(value: number | undefined, what: string): number {
  const v = value ?? 0;
  if (v === Infinity) return INFINITE_EXTENT;
  return nonNegative(v, what);
}

function tilt(value: number | undefined): number {
  const v = finite(value ?? 0, 'angle');
  if (Math.abs(v) > 90) throw new RangeError('angle must be between -90 and 90 degrees');
  return v * RAD;
}

function count(value: number): number {
  if (!(Number.isInteger(value) && value >= 1))
    throw new RangeError('count must be a positive integer');
  return value;
}

/** Verga, peitoril e ombreiras de uma janela recuada d atrás do plano da fachada. */
function reveal(W: number, H: number, d: number): Plate[] {
  if (d === 0) return [];
  return [
    [
      [0, 0, H],
      [W, 0, H],
      [W, d, H],
      [0, d, H],
    ],
    [
      [0, 0, 0],
      [W, 0, 0],
      [W, d, 0],
      [0, d, 0],
    ],
    [
      [0, 0, 0],
      [0, d, 0],
      [0, d, H],
      [0, 0, H],
    ],
    [
      [W, 0, 0],
      [W, d, 0],
      [W, d, H],
      [W, 0, H],
    ],
  ];
}

/** Placas de um dispositivo; d é o recuo (as proteções são medidas do plano da fachada, y = d). */
function devicePlates(W: number, H: number, d: number, device: Device): Plate[] {
  switch (device.kind) {
    case 'overhang': {
      const z = H + nonNegative(device.above, 'above');
      const y0 = d + nonNegative(device.gap, 'gap');
      const y1 = y0 + positive(device.depth, 'depth');
      const x0 = -extent(device.extendLeft, 'extendLeft');
      const x1 = W + extent(device.extendRight, 'extendRight');
      return [
        [
          [x0, y0, z],
          [x1, y0, z],
          [x1, y1, z],
          [x0, y1, z],
        ],
      ];
    }
    case 'fin': {
      const offset = nonNegative(device.offset, 'offset');
      const x = device.side === 'right' ? W + offset : -offset;
      const y0 = d + nonNegative(device.gap, 'gap');
      const y1 = y0 + positive(device.depth, 'depth');
      const z0 = -extent(device.extendBelow, 'extendBelow');
      const z1 = H + extent(device.extendAbove, 'extendAbove');
      return [
        [
          [x, y0, z0],
          [x, y1, z0],
          [x, y1, z1],
          [x, y0, z1],
        ],
      ];
    }
    case 'horizontalLouvers': {
      const t = tilt(device.angle);
      const c = positive(device.chord, 'chord');
      const pitch = positive(device.pitch, 'pitch');
      const above = finite(device.above, 'above');
      const x0 = -extent(device.extendLeft, 'extendLeft');
      const x1 = W + extent(device.extendRight, 'extendRight');
      const yIn = d + nonNegative(device.gap, 'gap');
      const yOut = yIn + c * Math.cos(t);
      return Array.from({ length: count(device.count) }, (_, k): Plate => {
        const zIn = H + above - k * pitch;
        const zOut = zIn - c * Math.sin(t);
        return [
          [x0, yIn, zIn],
          [x1, yIn, zIn],
          [x1, yOut, zOut],
          [x0, yOut, zOut],
        ];
      });
    }
    case 'verticalLouvers': {
      const t = tilt(device.angle);
      const c = positive(device.chord, 'chord');
      const pitch = positive(device.pitch, 'pitch');
      const start = finite(device.start, 'start');
      const z0 = -extent(device.extendBelow, 'extendBelow');
      const z1 = H + extent(device.extendAbove, 'extendAbove');
      const yIn = d + nonNegative(device.gap, 'gap');
      const yOut = yIn + c * Math.cos(t);
      return Array.from({ length: count(device.count) }, (_, k): Plate => {
        const xIn = start + k * pitch;
        const xOut = xIn + c * Math.sin(t);
        return [
          [xIn, yIn, z0],
          [xOut, yOut, z0],
          [xOut, yOut, z1],
          [xIn, yIn, z1],
        ];
      });
    }
    case 'plate': {
      if (device.vertices.length < 3) throw new RangeError('a plate needs at least 3 vertices');
      for (const v of device.vertices) {
        v.forEach((c) => finite(c, 'vertex'));
        if (v[1] < 0) throw new RangeError('plates must be in front of the glass (y >= 0)');
      }
      return [device.vertices.map((v): Vec3 => [v[0], v[1], v[2]])];
    }
  }
}

/** Cena: placas do recuo (se houver) e depois as de cada dispositivo, na ordem dada. */
export function buildScene(window: WindowGeometry, devices: readonly Device[]): Scene {
  const W = positive(window.width, 'width');
  const H = positive(window.height, 'height');
  const d = nonNegative(window.setback, 'setback');
  return {
    width: W,
    height: H,
    plates: [...reveal(W, H, d), ...devices.flatMap((device) => devicePlates(W, H, d, device))],
  };
}
