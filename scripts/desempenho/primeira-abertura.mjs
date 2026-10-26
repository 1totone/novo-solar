// Primeira abertura no celular (achado 2c da inspeção da Fase 4; método da revisão do F2.9,
// seção 6): Pixel 7 emulado, CPU 4 vezes mais lenta e rede "Slow 4G" (150 ms, 1,6 Mbit/s),
// como no Lighthouse. Serve a pasta do build com ou sem gzip (o GitHub Pages serve com gzip) e
// mede, da navegação até a carta: primeira pintura, carta na tela, JavaScript baixado e tarefas
// longas. Mediana de N aberturas, cada uma com o cache vazio.
//
// Uso: node scripts/desempenho/primeira-abertura.mjs [pasta do build] [aberturas] [hash]
//   ex.: npm run build && node scripts/desempenho/primeira-abertura.mjs dist 5
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, devices } from '@playwright/test';

const root = process.argv[2] ?? 'dist';
const runs = Number(process.argv[3] ?? 5);
const hash = process.argv[4] ?? '#local=florianopolis';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.csv': 'text/csv',
};

function serve(gzip) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(root, path.replace(/^\/app\//, '/')));
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      let body = await readFile(file);
      const type = TYPES[extname(file)] ?? 'application/octet-stream';
      const headers = { 'content-type': type, 'cache-control': 'no-store' };
      if (gzip && /text|javascript|json|svg|csv|manifest/.test(type)) {
        body = gzipSync(body, { level: 9 });
        headers['content-encoding'] = 'gzip';
      }
      res.writeHead(200, headers).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function openOnce(browser, port) {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    locale: 'pt-BR',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let jsBytes = 0;
  cdp.on('Network.loadingFinished', (e) => (jsBytes += e.encodedDataLength));
  const jsRequests = new Map();
  cdp.on('Network.responseReceived', (e) => {
    if (e.type === 'Script') jsRequests.set(e.requestId, e.response.url);
  });
  let scriptBytes = 0;
  cdp.on('Network.loadingFinished', (e) => {
    if (jsRequests.has(e.requestId)) scriptBytes += e.encodedDataLength;
  });
  await page.addInitScript(() => {
    window.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__longTasks.push(e.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto(`http://127.0.0.1:${port}/app/${hash}`, { waitUntil: 'commit' });
  await page.getByTestId('sun-chart').first().waitFor({ state: 'visible', timeout: 60000 });
  const chartAt = await page.evaluate(() => performance.now());
  await page.waitForTimeout(1500);
  const result = await page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const tasks = window.__longTasks;
    return {
      fcp: fcp ? fcp.startTime : null,
      longTasks: tasks.length,
      longest: tasks.length ? Math.max(...tasks) : 0,
      blocking: tasks.reduce((s, d) => s + Math.max(0, d - 50), 0),
    };
  });
  await context.close();
  return { ...result, chart: chartAt, scriptKb: scriptBytes / 1024, totalKb: jsBytes / 1024 };
}

const median = (v) => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const browser = await chromium.launch();
for (const gzip of [false, true]) {
  const server = await serve(gzip);
  const { port } = server.address();
  const all = [];
  for (let i = 0; i < runs; i++) all.push(await openOnce(browser, port));
  server.close();
  const m = (k) => median(all.map((r) => r[k]));
  console.log(
    `${gzip ? 'com gzip' : 'sem gzip'}: primeira pintura ${(m('fcp') / 1000).toFixed(2)} s; ` +
      `carta na tela ${(m('chart') / 1000).toFixed(2)} s; JavaScript ${m('scriptKb').toFixed(0)} kB ` +
      `transferidos (tudo: ${m('totalKb').toFixed(0)} kB); tarefas longas ${m('longTasks')}, ` +
      `a maior ${m('longest').toFixed(0)} ms, bloqueio total ${m('blocking').toFixed(0)} ms ` +
      `(mediana de ${runs})`,
  );
}
await browser.close();
