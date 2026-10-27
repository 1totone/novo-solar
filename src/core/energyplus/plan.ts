/**
 * Que objeto do EnergyPlus cada peça do passo 6 vira (F5.2).
 *
 * Especificação: docs/spec/13-exportacao-energyplus.md, seção 13.2. Brise sem recuo nem
 * afastamento: Shading:Overhang:Projection; par de aletas nas mesmas condições:
 * Shading:Fin:Projection; o resto, placa por placa: Shading:Zone:Detailed se encostada na fachada
 * (ou se for o recuo), Shading:Building:Detailed se afastada. Prolongamentos infinitos viram
 * L = 20 · y_máx além da aresta da janela.
 */
import {
  devicePlates,
  reveal,
  type Device,
  type Plate,
  type WindowGeometry,
} from '../shading/geometry';

/** L = INFINITE_FACTOR · y_máx: sombra igual à da peça infinita com |tan ψ| e tan α_perfil ≤ 20. */
export const INFINITE_FACTOR = 20;

const ATTACH_TOL = 1e-9;

export interface FinFields {
  /** Distância da aleta à lateral da janela. */
  extension: number;
  above: number;
  below: number;
  /** Profundidade dividida pela largura da janela. */
  depthFraction: number;
}

export type ExportItem =
  | {
      type: 'Shading:Overhang:Projection';
      name: string;
      /** Índices das peças no passo 6 (a partir de 0). */
      pieces: number[];
      height: number;
      /** Esquerda e direita do EnergyPlus, vistas de fora (spec 13, seção 13.1). */
      leftExtension: number;
      rightExtension: number;
      depthFraction: number;
    }
  | {
      type: 'Shading:Fin:Projection';
      name: string;
      pieces: number[];
      /** Esquerda do EnergyPlus (vista de fora) = aleta à direita de quem está dentro. */
      left: FinFields;
      right: FinFields;
    }
  | {
      type: 'Shading:Zone:Detailed' | 'Shading:Building:Detailed';
      name: string;
      pieces: number[];
      /** Placa no referencial da fachada. */
      plate: Plate;
    };

export interface ExportPlan {
  items: ExportItem[];
  /** Peças com prolongamento infinito exportado com comprimento finito (L, em metros). */
  capped: { piece: number; length: number }[];
}

const LABEL: Record<Device['kind'], string> = {
  overhang: 'Brise',
  fin: 'Aleta',
  horizontalLouvers: 'Laminas horizontais',
  verticalLouvers: 'Laminas verticais',
  plate: 'Placa',
};

const REVEAL_NAMES = ['verga', 'peitoril', 'ombreira esquerda', 'ombreira direita'];

/** Maior distância da peça ao vidro (y das placas; os prolongamentos não mudam y). */
function maxY(window: WindowGeometry, device: Device): number {
  const plates = devicePlates(window.width, window.height, window.setback ?? 0, device);
  return Math.max(...plates.flat().map((v) => v[1]));
}

/** A peça com cada prolongamento infinito trocado por L = 20 · y_máx (spec 13, seção 13.2). */
export function capInfinite(
  window: WindowGeometry,
  device: Device,
): { device: Device; length: number | null } {
  const keys: Partial<Record<Device['kind'], string[]>> = {
    overhang: ['extendLeft', 'extendRight'],
    fin: ['extendAbove', 'extendBelow'],
    horizontalLouvers: ['extendLeft', 'extendRight'],
    verticalLouvers: ['extendAbove', 'extendBelow'],
  };
  const fields = keys[device.kind] ?? [];
  const record = device as unknown as Record<string, unknown>;
  if (!fields.some((k) => record[k] === Infinity)) return { device, length: null };
  const length = INFINITE_FACTOR * maxY(window, device);
  const capped = { ...record };
  for (const k of fields) if (capped[k] === Infinity) capped[k] = length;
  return { device: capped as unknown as Device, length };
}

function attached(plate: Plate, d: number): boolean {
  return plate.filter((v) => Math.abs(v[1] - d) <= ATTACH_TOL).length >= 2;
}

/** Brise ou aleta que um objeto por projeção descreve: sem recuo do vidro e sem afastamento. */
function fitsProjection(window: WindowGeometry, device: Device): boolean {
  if (device.kind !== 'overhang' && device.kind !== 'fin') return false;
  return (window.setback ?? 0) === 0 && (device.gap ?? 0) === 0;
}

/** Plano da exportação: objetos na ordem do passo 6, depois do recuo. */
export function planExport(
  window: WindowGeometry,
  devices: readonly Device[],
  windowName: string,
): ExportPlan {
  const W = window.width;
  const H = window.height;
  const d = window.setback ?? 0;
  const capped: ExportPlan['capped'] = [];
  const list = devices.map((dev, i) => {
    const c = capInfinite(window, dev);
    if (c.length !== null) capped.push({ piece: i, length: c.length });
    return c.device;
  });

  const items: ExportItem[] = reveal(W, H, d).map((plate, k) => ({
    type: 'Shading:Zone:Detailed',
    name: `${windowName} Recuo ${REVEAL_NAMES[k]}`,
    pieces: [],
    plate,
  }));

  // Pares de aletas por projeção, na ordem do passo 6.
  const rights: number[] = [];
  const lefts: number[] = [];
  list.forEach((dev, i) => {
    if (dev.kind === 'fin' && fitsProjection(window, dev)) {
      (dev.side === 'right' ? rights : lefts).push(i);
    }
  });
  const pairOf = new Map<number, [number, number]>();
  for (let k = 0; k < Math.min(rights.length, lefts.length); k++) {
    const pair: [number, number] = [rights[k]!, lefts[k]!];
    pairOf.set(pair[0], pair);
    pairOf.set(pair[1], pair);
  }

  const finFields = (i: number): FinFields => {
    const f = list[i] as Extract<Device, { kind: 'fin' }>;
    return {
      extension: f.offset ?? 0,
      above: f.extendAbove ?? 0,
      below: f.extendBelow ?? 0,
      depthFraction: f.depth / W,
    };
  };

  list.forEach((dev, i) => {
    const n = i + 1;
    if (dev.kind === 'overhang' && fitsProjection(window, dev)) {
      items.push({
        type: 'Shading:Overhang:Projection',
        name: `${windowName} Brise ${n}`,
        pieces: [i],
        height: dev.above,
        leftExtension: dev.extendRight ?? 0,
        rightExtension: dev.extendLeft ?? 0,
        depthFraction: dev.depth / H,
      });
      return;
    }
    const pair = pairOf.get(i);
    if (pair) {
      // O objeto entra na posição da primeira aleta do par.
      if (i === Math.min(...pair)) {
        const [r, l] = pair;
        items.push({
          type: 'Shading:Fin:Projection',
          name: `${windowName} Aletas ${Math.min(r, l) + 1}-${Math.max(r, l) + 1}`,
          pieces: [r, l].sort((a, b) => a - b),
          left: finFields(r),
          right: finFields(l),
        });
      }
      return;
    }
    const plates = devicePlates(W, H, d, dev);
    plates.forEach((plate, k) => {
      items.push({
        type: attached(plate, d) ? 'Shading:Zone:Detailed' : 'Shading:Building:Detailed',
        name: `${windowName} ${LABEL[dev.kind]} ${n}${plates.length > 1 ? ` placa ${k + 1}` : ''}`,
        pieces: [i],
        plate,
      });
    });
  });
  return { items, capped };
}
