// Servidor estático mínimo para os testes de ponta a ponta.
// Publica a pasta do build sob um prefixo arbitrário (ex.: /qualquer/pasta/), para provar
// que o build funciona fora da raiz do domínio, como no GitHub Pages ou numa pasta do LabEEE.
// Uso: node scripts/serve-static.mjs <pasta> <prefixo> <porta>
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const [dir = 'dist', prefix = '/', port = '4173'] = process.argv.slice(2);
const root = resolve(dir);
const base = prefix.endsWith('/') ? prefix : `${prefix}/`;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.epw': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (!path.startsWith(base)) {
    res.writeHead(404).end('fora do prefixo');
    return;
  }
  let file = normalize(join(root, path.slice(base.length)));
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    statSync(file);
  } catch {
    res.writeHead(404).end('não encontrado');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(Number(port), '127.0.0.1', () => {
  console.log(`Servindo ${root} em http://127.0.0.1:${port}${base}`);
});
