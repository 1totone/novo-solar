// Orçamento do JavaScript inicial (decisão 0039): soma o que o navegador baixa antes da primeira
// pintura (o script de entrada do dist/index.html, os modulepreload e os blocos que eles
// importam de forma estática) e falha se passar do limite, com e sem gzip (o GitHub Pages serve
// com gzip). Os blocos carregados sob demanda (import()) ficam de fora.
//
// Uso: npm run build && npm run orcamento
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Limites do JavaScript inicial, em kB (1 kB = 1000 bytes, como o relatório do Vite): alguns kB
 * acima do medido na integração da Fase 4 (472 kB, 152 kB com gzip, em 26/10/2026). Para subir,
 * mude o número no mesmo PR que acrescenta código ao caminho básico, com o motivo.
 */
export const BUDGET = { raw: 480, gzip: 156 };

const dist = process.argv[2] ?? 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const entries = [
  ...html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
].map((m) => normalize(join(dist, m[1])));

const seen = new Set();
const queue = [...entries];
while (queue.length > 0) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  const code = readFileSync(file, 'utf8');
  // Importações estáticas entre blocos: `import ... from "./x.js"` e `import "./x.js"`.
  for (const m of code.matchAll(
    /(?:^|[;\n}])\s*import\s*(?:[^'"()]*?\bfrom\s*)?["'](\.[^"']+\.js)["']/g,
  )) {
    queue.push(normalize(join(dirname(file), m[1])));
  }
}

let raw = 0;
let gzip = 0;
const rows = [...seen].map((file) => {
  const bytes = readFileSync(file);
  const z = gzipSync(bytes).length;
  raw += bytes.length;
  gzip += z;
  return [file.slice(normalize(dist).length + 1), bytes.length / 1000, z / 1000];
});
for (const [name, r, z] of rows)
  console.log(`${r.toFixed(1).padStart(8)} kB ${z.toFixed(1).padStart(7)} kB gzip  ${name}`);
const kb = (v) => (v / 1000).toFixed(1);
console.log(
  `JavaScript inicial: ${kb(raw)} kB (${kb(gzip)} kB com gzip); orçamento ${BUDGET.raw} kB (${BUDGET.gzip} kB com gzip).`,
);
if (raw / 1000 > BUDGET.raw || gzip / 1000 > BUDGET.gzip) {
  console.error('Acima do orçamento: carregue sob demanda o que não é do caminho básico.');
  process.exit(1);
}
