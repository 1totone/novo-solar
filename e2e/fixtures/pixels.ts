import { inflateSync } from 'node:zlib';
import type { Locator, Page } from '@playwright/test';

/**
 * Leitura de cores da carta nos testes de ponta a ponta: decodifica o PNG da captura de tela
 * (8 bits, RGB ou RGBA, sem entrelaçamento, como o Chromium gera) sem dependências externas.
 */
interface Image {
  width: number;
  height: number;
  channels: number;
  data: Uint8Array;
}

function decodePng(png: Buffer): Image {
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString('ascii', pos + 4, pos + 8);
    const body = png.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const colorType = body[9];
      if (body[8] !== 8 || body[12] !== 0 || (colorType !== 2 && colorType !== 6)) {
        throw new Error('PNG não suportado no teste');
      }
      channels = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      idat.push(body);
    }
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const src = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= channels ? data[y * stride + x - channels]! : 0;
      const b = y > 0 ? data[(y - 1) * stride + x]! : 0;
      const c = x >= channels && y > 0 ? data[(y - 1) * stride + x - channels]! : 0;
      let v: number;
      if (filter === 0) v = src;
      else if (filter === 1) v = src + a;
      else if (filter === 2) v = src + b;
      else if (filter === 3) v = src + ((a + b) >> 1);
      else {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = src + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      data[y * stride + x] = v & 0xff;
    }
  }
  return { width, height, channels, data };
}

export type Tint = 'total' | 'partial' | 'none';

/**
 * Classifica a cor de um bloco de 7 × 7 px (CSS) pela mediana de cada canal, que ignora linhas finas
 * da carta: vermelho da sombra total, amarelo da parcial ou outra.
 */
function classify(img: Image, cx: number, cy: number, scale: number): Tint {
  const half = Math.round(3.5 * scale);
  const channels: number[][] = [[], [], []];
  for (let y = cy - half; y <= cy + half; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      const i = (y * img.width + x) * img.channels;
      for (let k = 0; k < 3; k++) channels[k]!.push(img.data[i + k]!);
    }
  }
  const [r, g, b] = channels.map((c) => c.sort((u, v) => u - v)[c.length >> 1]!) as [
    number,
    number,
    number,
  ];
  if (process.env.PIXELS_DEBUG) console.log('mediana', r, g, b);
  // Sobre o branco: vermelho a 35% dá cerca de (238, 178, 182); amarelo a 45%, (242, 221, 169).
  if (r - g > 35 && Math.abs(g - b) < 25) return 'total';
  if (r - b > 45 && g - b > 25) return 'partial';
  return 'none';
}

/**
 * Tom da máscara em cada direção do céu (altura e azimute em graus), lido de uma captura de tela
 * da carta. A posição na tela vem da projeção estereográfica e da matriz do próprio SVG.
 */
export async function maskTints(
  page: Page,
  directions: { altitude: number; azimuth: number }[],
): Promise<Tint[]> {
  const chart = page.getByTestId('sun-chart');
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  if (!box) throw new Error('carta não visível');
  const points = await chart.evaluate((svg, dirs) => {
    const m = (svg as SVGSVGElement).getScreenCTM()!;
    return dirs.map(({ altitude, azimuth }) => {
      const r = Math.tan(((90 - altitude) * Math.PI) / 180 / 2);
      const a = (azimuth * Math.PI) / 180;
      const p = new DOMPoint(r * Math.sin(a), -r * Math.cos(a)).matrixTransform(m);
      return { x: p.x, y: p.y };
    });
  }, directions);
  const shot = decodePng(await chart.screenshot());
  const scale = shot.width / box.width;
  return points.map((p) =>
    classify(shot, Math.round((p.x - box.x) * scale), Math.round((p.y - box.y) * scale), scale),
  );
}

/**
 * Cor mediana (RGB) de um bloco de 7 × 7 px (CSS) em pontos de um SVG qualquer, dados em
 * coordenadas do próprio SVG (as do viewBox). Serve para conferir que um desenho aparece de fato,
 * e não só que o elemento existe. `halfPx` muda o tamanho do bloco (1 dá 3 × 3 px, para linhas).
 */
export async function svgColors(
  svg: Locator,
  points: { x: number; y: number }[],
  halfPx = 3.5,
): Promise<[number, number, number][]> {
  await svg.scrollIntoViewIfNeeded();
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG não visível');
  const screen = await svg.evaluate((el, pts) => {
    const m = (el as SVGSVGElement).getScreenCTM()!;
    return pts.map(({ x, y }) => {
      const q = new DOMPoint(x, y).matrixTransform(m);
      return { x: q.x, y: q.y };
    });
  }, points);
  const img = decodePng(await svg.screenshot());
  const scale = img.width / box.width;
  const half = Math.round(halfPx * scale);
  return screen.map((p) => {
    const cx = Math.round((p.x - box.x) * scale);
    const cy = Math.round((p.y - box.y) * scale);
    const channels: number[][] = [[], [], []];
    for (let y = cy - half; y <= cy + half; y++) {
      for (let x = cx - half; x <= cx + half; x++) {
        const i = (y * img.width + x) * img.channels;
        for (let k = 0; k < 3; k++) channels[k]!.push(img.data[i + k]!);
      }
    }
    return channels.map((c) => c.sort((u, v) => u - v)[c.length >> 1]!) as [number, number, number];
  });
}
