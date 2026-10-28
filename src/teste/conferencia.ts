/**
 * Conferência automática das tarefas do teste do F2.9 sem moderador (decisão 0042).
 *
 * Lê o estado da ferramenta pelo endereço do iframe (o '#' guarda local, fachada, ângulos, dados e
 * aba; `src/ui/state/`) e, na tarefa 8, pela impressão aberta (com as opções, que não vão para o
 * endereço) e pelas imagens exportadas no passo 5. Funções puras: o roteiro na página só monta o retrato e mostra o resultado
 * no arquivo de resultados, nunca ao participante.
 */

export type HashParams = Record<string, string>;

/** Opções de impressão lidas da seção da carta no momento da impressão (ou do "Terminei"). */
export interface PrintSnapshot {
  radiusCm: number | null;
  protractor: boolean;
  mask: boolean;
  data: boolean;
  protractorOnly: boolean;
}

export interface Snapshot {
  hash: HashParams;
  /** Tarefa 8: a ferramenta abriu a impressão durante a tarefa, com estas opções. */
  print?: PrintSnapshot | null;
  /** Tarefa 8: a página do teste inteira foi impressa (menu do navegador). */
  printedOuter?: boolean;
  /** Tarefa 8: exportações pedidas no passo 5 durante a tarefa ("svg", "png", "copy", "csv"). */
  exports?: string[];
  /** Tarefa 9: endereço completo da ferramenta no iframe e o link colado pelo participante. */
  appUrl?: string;
  pastedLink?: string;
}

export interface Check {
  /** true: conferiu; false: não conferiu; null: sem conferência automática. */
  ok: boolean | null;
  detail: string;
}

/** Igual ao `parseHash` da aplicação (sem importar dela, para não mexer no build da `main`). */
export function parseHashParams(hash: string): HashParams {
  const out: HashParams = {};
  for (const [k, v] of new URLSearchParams(hash.replace(/^#/, ''))) if (k !== '') out[k] = v;
  return out;
}

function num(text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === '') return undefined;
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Recife no endereço: a cidade do catálogo ou um arquivo com as coordenadas da estação. */
function isRecife(h: HashParams): boolean {
  if (h.local === 'recife') return true;
  const lat = num(h.lat);
  const lon = num(h.lon);
  return (
    h.local === 'arquivo' &&
    lat !== undefined &&
    lon !== undefined &&
    Math.abs(lat + 8.126) < 0.2 &&
    Math.abs(lon + 34.924) < 0.2
  );
}

function facade(h: HashParams): number | undefined {
  const o = num(h.o);
  return o === undefined ? (h.o === undefined ? 0 : undefined) : norm360(o);
}

function result(parts: [string, boolean][]): Check {
  return {
    ok: parts.every(([, ok]) => ok),
    detail: parts.map(([label, ok]) => `${label} ${ok ? 'sim' : 'não'}`).join('; '),
  };
}

export function checkTask(task: string, s: Snapshot): Check {
  const h = s.hash;
  switch (task) {
    case '1':
      return result([['Recife aberta', isRecife(h)]]);
    case '2': {
      const o = facade(h);
      return result([
        ['fachada 315°', o !== undefined && Math.abs(o - 315) < 0.5],
        ['transferidor visível', h.tr !== '0'],
      ]);
    }
    case '3':
      return result([['α = 50°', num(h.a1) === 50]]);
    case '4':
      return result([
        ['referência externa', h.ref === 'e'],
        ['α = 50° mantido', num(h.a1) === 50],
      ]);
    case '5':
      return result([
        ['Recife', h.local === 'recife'],
        ['dados históricos abertos', h.hist === '1'],
        ['temperatura na carta', h.dado === 'tbs'],
      ]);
    case '6': {
      const r = result([
        ['arquivo de Recife carregado', h.local === 'arquivo' && isRecife(h)],
        ['temperatura na carta', h.dado === 'tbs'],
      ]);
      // Informativo: comparou com os dados antigos (decisão 0047), sem mudar o resultado.
      const compared = h.cmp ? `sim${h.dif === '1' ? ', com a diferença na carta' : ''}` : 'não';
      return { ok: r.ok, detail: `${r.detail}; comparou com outros dados ${compared}` };
    }
    case '7':
      return result([
        ['Recife', h.local === 'recife'],
        ['dados históricos abertos', h.hist === '1'],
        ['aba da rosa', h.aba === 'rosa'],
        ['verão (dez a fev)', h.estacao === 'dez-fev'],
      ]);
    case '8':
      return checkSaved(s);
    case '9':
      return checkLink(s);
    case 'extra': {
      const o = facade(h);
      return result([
        ['Florianópolis', h.local === 'florianopolis'],
        ['fachada norte', o !== undefined && Math.abs(o) < 0.5],
        ['β de 30° à direita', num(h.bd1) === 30],
        ['β de 30° à esquerda', num(h.be1) === 30],
      ]);
    }
    default:
      return { ok: null, detail: '' };
  }
}

/**
 * Tarefa 8 (decisão 0044, item j): a carta de Recife salva em PDF (pela impressão da ferramenta,
 * "Salvar como PDF") ou como imagem (PNG, SVG ou copiada no passo 5).
 */
function checkSaved(s: Snapshot): Check {
  const images = (s.exports ?? []).filter((k) => k === 'png' || k === 'svg' || k === 'copy');
  const p = s.print;
  const how = [
    ...(p
      ? [
          `impressão aberta, PDF ou papel (raio ${p.radiusCm ?? '?'} cm${p.protractorOnly ? ', só o transferidor' : ''})`,
        ]
      : []),
    ...images.map((k) => (k === 'copy' ? 'imagem copiada' : `imagem ${k.toUpperCase()}`)),
  ];
  if (how.length === 0) {
    return {
      ok: false,
      detail: s.printedOuter
        ? 'imprimiu a página do teste inteira, não a ferramenta'
        : 'não salvou: nem a impressão (PDF) nem uma imagem',
    };
  }
  // "Só o transferidor" tira a carta da folha: vale se houve também uma imagem.
  const chart = images.length > 0 || !p?.protractorOnly;
  const r = result([
    ['Recife', isRecife(s.hash)],
    ['com a carta', chart],
  ]);
  return { ok: r.ok, detail: `${how.join('; ')}; ${r.detail}` };
}

function checkLink(s: Snapshot): Check {
  const pasted = (s.pastedLink ?? '').trim();
  if (pasted === '') return { ok: false, detail: 'nenhum link colado' };
  let url: URL;
  let app: URL;
  try {
    url = new URL(pasted);
    app = new URL(s.appUrl ?? '');
  } catch {
    return { ok: false, detail: 'o texto colado não é um endereço' };
  }
  const samePage = url.origin === app.origin && url.pathname === app.pathname;
  const a = parseHashParams(url.hash);
  const b = parseHashParams(app.hash);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const diff = [...keys].filter((k) => a[k] !== b[k]);
  return {
    ok: samePage && diff.length === 0,
    detail:
      `mesma página ${samePage ? 'sim' : 'não'}; mesmo estado ${diff.length === 0 ? 'sim' : 'não'}` +
      (diff.length ? ` (difere em: ${diff.sort().join(', ')})` : ''),
  };
}

/**
 * Conferência das respostas com referência objetiva (roteiro, seção 5). As outras ficam para
 * a consolidação. Nunca é mostrada ao participante.
 */
export function checkAnswer(task: string, answers: Record<string, string>): Check {
  const degrees = (t: string | undefined) => num((t ?? '').replace(/[°º\s]|graus?/gi, ''));
  switch (task) {
    case '1': {
      const dirText = (answers.direcao ?? '').toLowerCase();
      const az = degrees(dirText);
      const alt = degrees(answers.altura);
      const r = result([
        ['altura', alt !== undefined && Math.abs(alt - 36) <= 3],
        ['direção', az !== undefined ? Math.abs(az - 53) <= 3 : /\bne\b|nordeste/.test(dirText)],
      ]);
      return {
        ok: r.ok,
        detail: `${r.detail}; referência: altura 36°, azimute 53° (nordeste), ±3°`,
      };
    }
    case '3':
      return { ok: answers.sombreada === 'sim', detail: 'referência: sim' };
    case '5': {
      const t = answers.periodo ?? '';
      return {
        ok: t.includes('1951') && t.includes('1970'),
        detail: 'período; referência: 1951 a 1970',
      };
    }
    case '7': {
      const t = (answers.direcao ?? '').toLowerCase().trim();
      const az = degrees(t);
      return {
        ok: az !== undefined ? Math.abs(az - 90) <= 22.5 : /^(e|l)$|\bleste\b|\beste\b/.test(t),
        detail: 'referência: leste',
      };
    }
    default:
      return { ok: null, detail: '' };
  }
}
