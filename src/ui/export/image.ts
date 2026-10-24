/**
 * Exportação de imagens (F2.6): SVG independente, com os estilos da página embutidos em cada
 * elemento (o arquivo abre igual fora do navegador), PNG desenhado a partir dele e download.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Propriedades de estilo copiadas da folha de estilo para o atributo style. */
const STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-linejoin',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
  'vector-effect',
  'display',
] as const;

/**
 * SVG independente do elemento dado. Com `size`, largura e altura ficam nessa medida (ex.:
 * "15.84cm" para a escala de impressão, ou "2400" para o PNG).
 */
export function standaloneSvg(svg: SVGSVGElement, description: string, size?: string): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const source = [svg, ...Array.from(svg.querySelectorAll('*'))];
  const target = [clone, ...Array.from(clone.querySelectorAll('*'))];
  source.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const computed = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    // O style original vem por último e prevalece (cores das máscaras, das células etc.).
    target[i]!.setAttribute('style', `${computed};${el.getAttribute('style') ?? ''}`);
  });
  clone.setAttribute('xmlns', SVG_NS);
  if (size) {
    clone.setAttribute('width', size);
    clone.setAttribute('height', size);
  }
  const desc = document.createElementNS(SVG_NS, 'desc');
  desc.textContent = description;
  clone.insertBefore(desc, clone.firstChild);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}\n`;
}

/** PNG quadrado de `pixels` de lado, com fundo branco, a partir do texto SVG. */
export async function svgToPng(svgText: string, pixels: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = pixels;
    canvas.height = pixels;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pixels, pixels);
    ctx.drawImage(img, 0, 0, pixels, pixels);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Nome de arquivo sem acentos nem espaços. */
export function fileSlug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'carta'
  );
}
