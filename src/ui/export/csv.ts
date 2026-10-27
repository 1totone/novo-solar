/**
 * CSV dos dados mostrados (F2.6): vírgula como separador e ponto decimal, para abrir em qualquer
 * programa; o cabeçalho (linhas iniciadas por #) diz isso e traz local, arquivo e hipóteses
 * (spec 01, seção 1.5).
 */

/** Campo de CSV: aspas quando há vírgula, aspas ou quebra de linha. */
export function csvField(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? (Number.isFinite(v) ? String(round(v)) : '') : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Arredonda para no máximo 6 casas, sem zeros à direita nem notação científica de 1e-7. */
function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * Documento CSV. O cabeçalho termina com a frase do separador no idioma da interface
 * (csv.separator): vírgula entre os campos e ponto decimal em qualquer idioma.
 */
export function csvDocument(
  header: string[],
  columns: string[],
  rows: (string | number | null)[][],
): string {
  const lines = [
    ...header.map((h) => `# ${h}`),
    columns.map(csvField).join(','),
    ...rows.map((r) => r.map(csvField).join(',')),
  ];
  // BOM: acentos certos no Excel.
  return '﻿' + lines.join('\n') + '\n';
}
