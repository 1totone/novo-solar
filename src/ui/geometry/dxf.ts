/**
 * Corte e vista em DXF (F5.2; spec 13, seção 13.5): os mesmos desenhos do passo 6
 * (sectionDrawing e elevationDrawing, spec 07, seção 7.11), em metros, num DXF R12 em ASCII.
 * Corte com o vidro em X = 0 e o peitoril em Y = 0; vista à direita, a 1 m do corte, com o
 * peitoril em Y = 0. Validação: o ezdxf lê e audita os arquivos das cenas de teste
 * (docs/validacao/scripts/energyplus_exportacao.py; tests/referencia/energyplusExportacao.test.ts).
 */
import type { Device, WindowGeometry } from '../../core/shading/geometry';
import { elevationDrawing, sectionDrawing, type Drawing, type Point2 } from './drawings';

/** Camadas: nome, cor (ACI) e tipo de linha. */
export const DXF_LAYERS = [
  ['CORTE-PECA', 7, 'CONTINUOUS'],
  ['CORTE-ALEM', 8, 'DASHED'],
  ['CORTE-PAREDE', 9, 'CONTINUOUS'],
  ['CORTE-VIDRO', 5, 'CONTINUOUS'],
  ['VISTA-PECA', 7, 'CONTINUOUS'],
  ['VISTA-PAREDE', 9, 'CONTINUOUS'],
  ['VISTA-VIDRO', 5, 'CONTINUOUS'],
  ['COTAS', 1, 'CONTINUOUS'],
  ['TEXTOS', 7, 'CONTINUOUS'],
] as const;

type Layer = (typeof DXF_LAYERS)[number][0];

const GAP = 1;

/** Número com até 6 casas (micrômetro), sem "-0". */
function n(x: number): string {
  if (Math.abs(x) < 5e-7) return '0';
  return String(Number(x.toFixed(6)));
}

/** Texto do DXF: só ASCII; o grau é %%d. */
function dxfText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/°/g, '%%d')
    .replace(/[^\x20-\x7e]/g, '?');
}

const decimal = (x: number, digits: number) => x.toFixed(digits).replace('.', ',');

class Writer {
  readonly lines: string[] = [];
  pair(code: number, value: string | number) {
    this.lines.push(String(code), typeof value === 'number' ? n(value) : value);
  }
  line(layer: Layer, a: Point2, b: Point2) {
    this.pair(0, 'LINE');
    this.pair(8, layer);
    this.pair(10, a[0]);
    this.pair(20, a[1]);
    this.pair(30, 0);
    this.pair(11, b[0]);
    this.pair(21, b[1]);
    this.pair(31, 0);
  }
  polyline(layer: Layer, points: readonly Point2[], closed: boolean) {
    this.pair(0, 'POLYLINE');
    this.pair(8, layer);
    this.pair(66, '1');
    this.pair(10, 0);
    this.pair(20, 0);
    this.pair(30, 0);
    this.pair(70, closed ? '1' : '0');
    for (const p of points) {
      this.pair(0, 'VERTEX');
      this.pair(8, layer);
      this.pair(10, p[0]);
      this.pair(20, p[1]);
      this.pair(30, 0);
    }
    this.pair(0, 'SEQEND');
    this.pair(8, layer);
  }
  text(at: Point2, height: number, text: string, center = false) {
    this.pair(0, 'TEXT');
    this.pair(8, 'TEXTOS');
    this.pair(10, at[0]);
    this.pair(20, at[1]);
    this.pair(30, 0);
    this.pair(40, height);
    this.pair(1, dxfText(text));
    if (center) {
      this.pair(72, '1');
      this.pair(11, at[0]);
      this.pair(21, at[1]);
      this.pair(31, 0);
    }
  }
}

const ROLE_LAYER = { piece: 'PECA', beyond: 'ALEM', wall: 'PAREDE', glass: 'VIDRO' } as const;

const ANGLE_TEXT = { alpha: 'alfa', gammaRight: 'gama dir.', gammaLeft: 'gama esq.' } as const;

function drawingEntities(
  w: Writer,
  drawing: Drawing,
  dx: number,
  prefix: 'CORTE' | 'VISTA',
  title: string,
  h: number,
) {
  const at = (p: Point2): Point2 => [p[0] + dx, p[1]];
  for (const s of drawing.shapes) {
    const layer = `${prefix}-${ROLE_LAYER[s.role]}` as Layer;
    const pts = s.points.map(at);
    if (s.edge || pts.length === 2) {
      // Placa de perfil: os pontos são colineares; uma linha entre os dois mais afastados.
      let best: [Point2, Point2] = [pts[0]!, pts[pts.length - 1]!];
      for (const a of pts) {
        for (const b of pts) {
          if (
            Math.hypot(a[0] - b[0], a[1] - b[1]) >
            Math.hypot(best[0][0] - best[1][0], best[0][1] - best[1][1])
          ) {
            best = [a, b];
          }
        }
      }
      w.line(layer, best[0], best[1]);
    } else {
      w.polyline(layer, pts, true);
    }
  }
  for (const dim of drawing.dimensions) {
    const a = at(dim.from);
    const b = at(dim.to);
    w.line('COTAS', a, b);
    w.text([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.3 * h], h, decimal(dim.value, 2), true);
  }
  for (const ang of drawing.angles) {
    const a = at(ang.from);
    const b = at(ang.to);
    w.line('COTAS', a, b);
    w.text([b[0], b[1] + 0.3 * h], h, `${ANGLE_TEXT[ang.kind]} ${decimal(ang.degrees, 1)}°`);
  }
  for (const p of drawing.infinite) w.text(at(p), 0.8 * h, '(infinito)');
  const b = drawing.bounds;
  w.text([(b.minX + b.maxX) / 2 + dx, b.minY - 2 * h], 1.4 * h, title, true);
}

/** DXF R12 com o corte e a vista da janela e das peças, em metros. */
export function drawingsDxf(
  window: WindowGeometry,
  devices: readonly Device[],
  opts: { title: string },
): string {
  const section = sectionDrawing(window, devices);
  const elevation = elevationDrawing(window, devices);
  const dx = section.bounds.maxX - elevation.bounds.minX + GAP;
  const h = Math.max(0.03, 0.025 * Math.max(window.width, window.height));
  const minX = section.bounds.minX;
  const maxX = elevation.bounds.maxX + dx;
  const minY = Math.min(section.bounds.minY, elevation.bounds.minY) - 4 * h;
  const maxY = Math.max(section.bounds.maxY, elevation.bounds.maxY);

  const w = new Writer();
  w.pair(999, dxfText(`SOL-AR: corte e vista, ${opts.title} (metros)`));
  w.pair(0, 'SECTION');
  w.pair(2, 'HEADER');
  w.pair(9, '$ACADVER');
  w.pair(1, 'AC1009');
  w.pair(9, '$INSUNITS');
  w.pair(70, '6');
  w.pair(9, '$EXTMIN');
  w.pair(10, minX);
  w.pair(20, minY);
  w.pair(30, 0);
  w.pair(9, '$EXTMAX');
  w.pair(10, maxX);
  w.pair(20, maxY);
  w.pair(30, 0);
  w.pair(0, 'ENDSEC');

  w.pair(0, 'SECTION');
  w.pair(2, 'TABLES');
  w.pair(0, 'TABLE');
  w.pair(2, 'LTYPE');
  w.pair(70, '2');
  for (const [name, desc, pattern] of [
    ['CONTINUOUS', 'Solid line', [] as number[]],
    ['DASHED', '__ __ __', [0.1, -0.05]],
  ] as const) {
    w.pair(0, 'LTYPE');
    w.pair(2, name);
    w.pair(70, '0');
    w.pair(3, desc);
    w.pair(72, '65');
    w.pair(73, String(pattern.length));
    w.pair(
      40,
      pattern.reduce((s, v) => s + Math.abs(v), 0),
    );
    for (const v of pattern) w.pair(49, v);
  }
  w.pair(0, 'ENDTAB');
  w.pair(0, 'TABLE');
  w.pair(2, 'LAYER');
  w.pair(70, String(DXF_LAYERS.length));
  for (const [name, color, ltype] of DXF_LAYERS) {
    w.pair(0, 'LAYER');
    w.pair(2, name);
    w.pair(70, '0');
    w.pair(62, String(color));
    w.pair(6, ltype);
  }
  w.pair(0, 'ENDTAB');
  w.pair(0, 'TABLE');
  w.pair(2, 'STYLE');
  w.pair(70, '1');
  w.pair(0, 'STYLE');
  w.pair(2, 'STANDARD');
  w.pair(70, '0');
  w.pair(40, 0);
  w.pair(41, 1);
  w.pair(50, 0);
  w.pair(71, '0');
  w.pair(42, 0.2);
  w.pair(3, 'txt');
  w.pair(4, '');
  w.pair(0, 'ENDTAB');
  w.pair(0, 'ENDSEC');

  w.pair(0, 'SECTION');
  w.pair(2, 'BLOCKS');
  w.pair(0, 'ENDSEC');

  w.pair(0, 'SECTION');
  w.pair(2, 'ENTITIES');
  drawingEntities(w, section, 0, 'CORTE', 'CORTE', h);
  drawingEntities(
    w,
    elevation,
    dx,
    'VISTA',
    'VISTA DE FORA (a direita de quem esta dentro aparece a esquerda)',
    h,
  );
  w.pair(0, 'ENDSEC');
  w.pair(0, 'EOF');
  return w.lines.join('\r\n') + '\r\n';
}
