/**
 * Página do teste do F2.9 sem moderador (decisão 0042): o roteiro ao lado (no celular, em cima) e
 * a ferramenta da mesma publicação num iframe. Sem React e sem importar nada de `src/ui/`, para que
 * o build da aplicação não mude (o teste mede a ferramenta como ela está na `main`).
 *
 * Nada sai do navegador: as respostas ficam no localStorage até o participante baixar ou copiar
 * os resultados e mandá-los ao Anthony.
 */
import { parseHashParams, type PrintSnapshot, type Snapshot } from './conferencia';
import {
  newSession,
  openQuestionsFor,
  resultsCsv,
  resultsFileName,
  tasksFor,
  type Profile,
  type Session,
  type TaskRecord,
} from './resultados';
import {
  CONFUSION_QUESTION,
  OPEN_QUESTIONS,
  RECIFE_ZIP,
  SCENARIO,
  SEQ_HIGH,
  SEQ_LOW,
  SEQ_QUESTION,
  SUS_ITEMS,
  type TaskDef,
} from './roteiro';
import './teste.css';

// Por caminho: a página da main e a de uma prévia (/pr/<n>/teste/) não dividem as respostas.
const STORAGE_KEY = `solar-teste-f29:${location.pathname}`;
const CODES = ['P1', 'P2', 'P3', 'P4', 'P5'];
const BUILD = `${__APP_VERSION__} · ${__BUILD_LABEL__} · ${__BUILD_COMMIT__}`;

// ---------- estado ----------

function load(): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Session;
      if (s.version === 1) return s;
    }
  } catch {
    // armazenamento bloqueado ou corrompido: começa do zero
  }
  return newSession(BUILD, new Date());
}

let session = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // sem armazenamento: o teste segue, só não sobrevive a recarregar a página
  }
}

const codeFromLink = parseHashParams(location.hash).p?.toUpperCase();
if (!session.participant && codeFromLink && CODES.includes(codeFromLink)) {
  session.participant = codeFromLink;
}

type Screen =
  | { kind: 'inicio' }
  | { kind: 'perfil' }
  | { kind: 'instrucoes' }
  | { kind: 'tarefa'; task: TaskDef; n: number; total: number; last: boolean }
  | { kind: 'sus' }
  | { kind: 'abertas' }
  | { kind: 'fim' };

function flow(): Screen[] {
  const tasks = tasksFor(session.profile);
  return [
    { kind: 'inicio' },
    { kind: 'perfil' },
    { kind: 'instrucoes' },
    ...tasks.map((task, i) => ({
      kind: 'tarefa' as const,
      task,
      n: i + 1,
      // A tarefa extra (professores) não entra na contagem "de 9".
      total: tasks.filter((t) => t.id !== 'extra').length,
      last: i === tasks.length - 1,
    })),
    { kind: 'sus' },
    { kind: 'abertas' },
    { kind: 'fim' },
  ];
}

function record(id: string): TaskRecord {
  return (session.tasks[id] ??= { answers: {}, confusion: '' });
}

type Phase = 'ler' | 'fazer' | 'avaliar';

function phaseOf(r: TaskRecord | undefined): Phase {
  if (!r || r.start === undefined) return 'ler';
  if (!r.outcome) return 'fazer';
  return 'avaliar';
}

function currentScreen(): Screen {
  const f = flow();
  return f[Math.min(session.screen, f.length - 1)]!;
}

function activeTask(): string | null {
  const s = currentScreen();
  return s.kind === 'tarefa' && phaseOf(session.tasks[s.task.id]) === 'fazer' ? s.task.id : null;
}

// ---------- elementos ----------

type Child = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | ((e: Event) => void)> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false) el.setAttribute(k, v);
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const panel = $<HTMLDivElement>('tela');
const progress = $<HTMLSpanElement>('progresso');
const frame = $<HTMLIFrameElement>('app');
const cover = $<HTMLDivElement>('cobertura');
const address = $<HTMLInputElement>('endereco');
const appBase = new URL('../', location.href).href;

function radios(
  name: string,
  options: readonly string[],
  value: string,
  onChange: (v: string) => void,
  labels: readonly string[] = options,
) {
  return h(
    'div',
    { class: 'opcoes', role: 'radiogroup' },
    ...options.map((o, i) =>
      h(
        'label',
        { class: 'opcao' },
        h('input', {
          type: 'radio',
          name,
          value: o,
          checked: value === o,
          onchange: () => onChange(o),
        }),
        labels[i] ?? o,
      ),
    ),
  );
}

function textField(label: string, value: string, onInput: (v: string) => void, long = false) {
  const id = `f-${Math.random().toString(36).slice(2, 8)}`;
  const input = long
    ? h('textarea', { id, rows: '3' })
    : h('input', { id, type: 'text', autocomplete: 'off' });
  input.value = value;
  input.addEventListener('input', () => onInput(input.value));
  return h('div', { class: 'campo' }, h('label', { for: id }, label), input);
}

function button(label: string, onClick: () => void, primary = false, testId?: string) {
  return h(
    'button',
    {
      type: 'button',
      class: primary ? 'btn primario' : 'btn',
      onclick: onClick,
      ...(testId ? { 'data-testid': testId } : {}),
    },
    label,
  );
}

function errorBox(text: string) {
  return h('p', { class: 'erro', role: 'alert' }, text);
}

function go(delta: number) {
  session.screen = Math.max(0, Math.min(flow().length - 1, session.screen + delta));
  save();
  render();
  panel.scrollTop = 0;
  panel.querySelector<HTMLElement>('h2')?.focus();
}

// ---------- telas ----------

function screenInicio() {
  let error: HTMLElement | null = null;
  const box = h(
    'div',
    {},
    h('h2', { tabindex: '-1' }, 'Teste do novo SOL-AR'),
    h(
      'p',
      {},
      'Obrigado por ajudar. Você vai fazer 9 tarefas curtas na ferramenta, que aparece ao lado (no celular, abaixo), e responder a um questionário. Leva de 30 a 45 minutos.',
    ),
    h('h3', {}, 'Antes de começar'),
    h(
      'ul',
      {},
      h('li', {}, 'Estamos testando a ferramenta, não você. Não existe resposta errada.'),
      h('li', {}, 'A participação é voluntária, e você pode parar a qualquer momento.'),
      h('li', {}, 'Não há gravação de tela, de som ou de imagem.'),
      h(
        'li',
        {},
        'Você é identificado só pelo código que recebeu (P1 a P5). Não escreva seu nome nas respostas.',
      ),
      h(
        'li',
        {},
        'As respostas ficam só neste navegador. Nada é enviado pela internet: no fim, você baixa ou copia os resultados e manda para o Anthony.',
      ),
      h(
        'li',
        {},
        'Os resultados servem para melhorar a ferramenta, não para publicação científica.',
      ),
    ),
    h(
      'div',
      { class: 'campo' },
      h('label', { for: 'codigo' }, 'Seu código'),
      (() => {
        const sel = h(
          'select',
          { id: 'codigo' },
          h('option', { value: '' }, 'escolha'),
          ...CODES.map((c) => h('option', { value: c, selected: session.participant === c }, c)),
        );
        sel.addEventListener('change', () => {
          session.participant = sel.value;
          save();
        });
        return sel;
      })(),
    ),
    h(
      'label',
      { class: 'opcao' },
      h('input', {
        type: 'checkbox',
        id: 'consentimento',
        checked: session.consent,
        onchange: (e: Event) => {
          session.consent = (e.target as HTMLInputElement).checked;
          save();
        },
      }),
      'Li o que está acima e concordo em participar.',
    ),
  );
  box.append(
    h(
      'div',
      { class: 'acoes' },
      button(
        'Continuar',
        () => {
          const missing = !session.participant
            ? 'Escolha o seu código.'
            : !session.consent
              ? 'Para continuar, marque que concorda em participar.'
              : null;
          error?.remove();
          if (missing) {
            error = errorBox(missing);
            box.append(error);
          } else go(1);
        },
        true,
      ),
    ),
  );
  return box;
}

function guessBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return '';
}

function screenPerfil() {
  const p = session.profile;
  if (!p.browser) p.browser = guessBrowser();
  const set = <K extends keyof Profile>(k: K, v: Profile[K], rerender = false) => {
    p[k] = v;
    save();
    if (rerender) render();
  };
  let error: HTMLElement | null = null;
  const box = h(
    'div',
    {},
    h('h2', { tabindex: '-1' }, 'Sobre você'),
    h('p', { class: 'campo-titulo' }, 'Você é'),
    radios('perfil', ['aluno', 'professor'], p.role, (v) =>
      set('role', v as Profile['role'], true),
    ),
    p.role === 'aluno' &&
      textField('Semestre do curso (número)', p.semester, (v) => set('semester', v)),
    h('p', { class: 'campo-titulo' }, 'Já usou carta solar em aula?'),
    radios('aula', ['sim', 'não'], p.chartInClass, (v) =>
      set('chartInClass', v as Profile['chartInClass']),
    ),
    h('p', { class: 'campo-titulo' }, 'Já usou o SOL-AR 6.2 (o programa antigo, para Windows)?'),
    radios('usou62', ['sim', 'não', 'não lembra'], p.used62, (v) =>
      set('used62', v as Profile['used62']),
    ),
    h('p', { class: 'campo-titulo' }, 'Em que aparelho você está fazendo o teste?'),
    radios('aparelho', ['computador', 'tablet', 'celular'], p.device, (v) =>
      set('device', v as Profile['device']),
    ),
    textField('Navegador', p.browser, (v) => set('browser', v)),
  );
  box.append(
    h(
      'div',
      { class: 'acoes' },
      button('Voltar', () => go(-1)),
      button(
        'Continuar',
        () => {
          error?.remove();
          if (!p.role || !p.used62 || !p.device || !p.chartInClass) {
            error = errorBox('Responda às quatro perguntas de múltipla escolha.');
            box.append(error);
          } else go(1);
        },
        true,
      ),
    ),
  );
  return box;
}

function screenInstrucoes() {
  return h(
    'div',
    {},
    h('h2', { tabindex: '-1' }, 'Como funciona'),
    h('p', { class: 'cenario' }, SCENARIO),
    h(
      'ol',
      {},
      h('li', {}, 'Leia a tarefa e clique em "Comecei". A ferramenta fica livre para usar.'),
      h(
        'li',
        {},
        'Faça a tarefa na ferramenta, sem pressa e sem ajuda de ninguém. Use só a ferramenta (nada de pesquisar na internet).',
      ),
      h(
        'li',
        {},
        'Escreva a resposta, se a tarefa pedir, e clique em "Terminei". Se ficar travado por mais de 3 minutos, clique em "Desisti" e siga em frente: isso também é um resultado útil.',
      ),
      h(
        'li',
        {},
        'Depois de cada tarefa, diga quão fácil foi e o que te confundiu. Isso substitui o "pensar em voz alta" de um teste com alguém do lado, então conte tudo: onde procurou, o que esperava, o que te surpreendeu.',
      ),
    ),
    h(
      'p',
      { class: 'nota' },
      'As tarefas seguem uma da outra: não recarregue a ferramenta entre elas. Se a página recarregar sem querer, as respostas continuam guardadas.',
    ),
    h(
      'div',
      { class: 'acoes' },
      button('Voltar', () => go(-1)),
      button('Ir para a tarefa 1', () => go(1), true),
    ),
  );
}

function readPrintOptions(): PrintSnapshot | null {
  try {
    const sec = frame.contentDocument?.querySelector<HTMLElement>('.chart-section');
    if (!sec) return null;
    const r = parseFloat(sec.style.getPropertyValue('--print-radius'));
    const cls = sec.classList;
    return {
      radiusCm: Number.isFinite(r) ? r : null,
      protractor: !cls.contains('print-no-protractor'),
      mask: !cls.contains('print-no-mask'),
      data: !cls.contains('print-no-data'),
      protractorOnly: cls.contains('print-protractor-only'),
    };
  } catch {
    return null;
  }
}

function appHref(): string | null {
  try {
    return frame.contentWindow?.location.href ?? null;
  } catch {
    return null;
  }
}

function snapshot(task: string, r: TaskRecord): Snapshot {
  const href = appHref();
  const hash = parseHashParams(href ? new URL(href).hash : session.appHash);
  const snap: Snapshot = { hash };
  if (task === '8') {
    snap.print = r.print ?? null;
    snap.printedOuter = r.printedOuter ?? false;
    snap.exports = r.exports ?? [];
  }
  if (task === '9') {
    snap.appUrl = href ?? appBase + session.appHash;
    snap.pastedLink = r.answers.link ?? '';
  }
  return snap;
}

function screenTarefa(s: Extract<Screen, { kind: 'tarefa' }>) {
  const { task } = s;
  const r = record(task.id);
  const phase = phaseOf(r);
  const box = h(
    'div',
    { 'data-testid': `tarefa-${task.id}`, 'data-fase': phase },
    h(
      'h2',
      { tabindex: '-1' },
      task.id === 'extra' ? 'Tarefa extra (professores)' : `Tarefa ${s.n} de ${s.total}`,
    ),
    task.id !== 'extra' && h('p', { class: 'cenario' }, SCENARIO),
    h('p', { class: 'cartao', 'data-testid': 'cartao' }, task.card),
  );

  if (phase === 'ler') {
    if (task.prep) {
      const [intro, ...steps] = task.prep;
      box.append(
        h(
          'div',
          { class: 'preparo' },
          h('h3', {}, 'Preparação'),
          h('p', {}, intro ?? ''),
          h(
            'ol',
            {},
            ...steps.map((t, i) =>
              h(
                'li',
                {},
                t,
                i === 0 &&
                  h(
                    'p',
                    {},
                    h(
                      'a',
                      { href: RECIFE_ZIP, target: '_blank', rel: 'noopener' },
                      'Baixar o arquivo recente de Recife (.zip)',
                    ),
                  ),
              ),
            ),
          ),
        ),
      );
    }
    box.append(
      h(
        'div',
        { class: 'acoes' },
        button(
          'Comecei',
          () => {
            r.start = Date.now();
            delete r.print;
            delete r.printedOuter;
            delete r.exports;
            save();
            render();
          },
          true,
          'comecei',
        ),
      ),
    );
  } else if (phase === 'fazer') {
    for (const f of task.fields) {
      if (f.kind === 'yesno') {
        box.append(
          h('p', { class: 'campo-titulo' }, f.label),
          radios(`${task.id}-${f.id}`, ['sim', 'não', 'não sei'], r.answers[f.id] ?? '', (v) => {
            r.answers[f.id] = v;
            save();
          }),
        );
      } else {
        box.append(
          textField(
            f.label,
            r.answers[f.id] ?? '',
            (v) => {
              r.answers[f.id] = v;
              save();
            },
            f.kind === 'long',
          ),
        );
      }
    }
    const finish = (outcome: 'S' | 'N') => {
      r.end = Date.now();
      r.outcome = outcome;
      r.snapshot = snapshot(task.id, r);
      save();
      render();
    };
    box.append(
      h(
        'div',
        { class: 'acoes' },
        button('Terminei', () => finish('S'), true, 'terminei'),
        button('Desisti', () => finish('N'), false, 'desisti'),
      ),
    );
  } else {
    let error: HTMLElement | null = null;
    const seq = h(
      'fieldset',
      { class: 'seq' },
      h('legend', {}, SEQ_QUESTION),
      h(
        'div',
        { class: 'escala' },
        h('span', { class: 'escala-ponta' }, `1 = ${SEQ_LOW}`),
        radios(
          `${task.id}-seq`,
          ['1', '2', '3', '4', '5', '6', '7'],
          r.seq === undefined ? '' : String(r.seq),
          (v) => {
            r.seq = Number(v);
            save();
          },
        ),
        h('span', { class: 'escala-ponta' }, `7 = ${SEQ_HIGH}`),
      ),
    );
    box.append(
      h(
        'p',
        { class: 'nota' },
        r.outcome === 'S' ? 'Você terminou a tarefa.' : 'Você desistiu da tarefa; tudo bem.',
      ),
      seq,
      textField(
        CONFUSION_QUESTION,
        r.confusion,
        (v) => {
          r.confusion = v;
          save();
        },
        true,
      ),
    );
    box.append(
      h(
        'div',
        { class: 'acoes' },
        button(
          s.last ? 'Ir para o questionário' : 'Próxima tarefa',
          () => {
            error?.remove();
            if (r.seq === undefined) {
              error = errorBox('Marque de 1 a 7 quão fácil foi a tarefa.');
              box.append(error);
            } else go(1);
          },
          true,
          'proxima',
        ),
      ),
    );
  }
  return box;
}

function screenSus() {
  let error: HTMLElement | null = null;
  const box = h(
    'div',
    {},
    h('h2', { tabindex: '-1' }, 'Questionário'),
    h(
      'p',
      {},
      'Marque de 1 (discordo totalmente) a 5 (concordo totalmente). Responda pela primeira impressão.',
    ),
    ...SUS_ITEMS.map((item, i) =>
      h(
        'fieldset',
        { class: 'sus', 'data-testid': `sus-${i + 1}` },
        h('legend', {}, `${i + 1}. ${item}`),
        h(
          'div',
          { class: 'escala' },
          h('span', { class: 'escala-ponta' }, 'discordo'),
          radios(
            `sus-${i}`,
            ['1', '2', '3', '4', '5'],
            session.sus[i] === null || session.sus[i] === undefined ? '' : String(session.sus[i]),
            (v) => {
              session.sus[i] = Number(v);
              save();
            },
          ),
          h('span', { class: 'escala-ponta' }, 'concordo'),
        ),
      ),
    ),
  );
  box.append(
    h(
      'div',
      { class: 'acoes' },
      button(
        'Continuar',
        () => {
          error?.remove();
          const missing = session.sus.flatMap((a, i) => (a === null ? [i + 1] : []));
          if (missing.length) {
            error = errorBox(`Falta responder: ${missing.join(', ')}.`);
            box.append(error);
          } else go(1);
        },
        true,
      ),
    ),
  );
  return box;
}

function screenAbertas() {
  return h(
    'div',
    {},
    h('h2', { tabindex: '-1' }, 'Para terminar'),
    h('p', {}, 'Responda o que quiser; pode ser curto.'),
    ...openQuestionsFor(session.profile).map((i) =>
      textField(
        OPEN_QUESTIONS[i]!.text,
        session.open[i] ?? '',
        (v) => {
          session.open[i] = v;
          save();
        },
        true,
      ),
    ),
    h(
      'div',
      { class: 'acoes' },
      button('Voltar', () => go(-1)),
      button('Ver os resultados', () => go(1), true),
    ),
  );
}

function download(text: string, name: string) {
  // BOM para o Excel reconhecer os acentos.
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

function screenFim() {
  const csv = resultsCsv(session);
  const status = h('p', { class: 'nota', role: 'status', 'data-testid': 'status-fim' });
  const text = h('textarea', { rows: '8', readonly: true, 'data-testid': 'texto-resultados' });
  text.value = csv;
  return h(
    'div',
    {},
    h('h2', { tabindex: '-1' }, 'Obrigado!'),
    h(
      'p',
      {},
      'Mande os resultados para o Anthony pelo WhatsApp ou por e-mail: baixe o arquivo e anexe, ou copie o texto e cole na mensagem.',
    ),
    h(
      'div',
      { class: 'acoes' },
      button(
        'Baixar resultados',
        () => {
          download(csv, resultsFileName(session));
          status.textContent = `Arquivo ${resultsFileName(session)} baixado.`;
        },
        true,
        'baixar',
      ),
      button(
        'Copiar resultados',
        () => {
          navigator.clipboard.writeText(csv).then(
            () => (status.textContent = 'Resultados copiados. Cole na mensagem para o Anthony.'),
            () => {
              text.focus();
              text.select();
              status.textContent =
                'O navegador não deixou copiar sozinho: o texto abaixo está selecionado; copie com Ctrl+C (ou toque e segure).';
            },
          );
        },
        false,
        'copiar',
      ),
    ),
    status,
    h('details', {}, h('summary', {}, 'Ver o texto dos resultados'), text),
    h('p', { class: 'nota' }, 'Depois de mandar, você pode apagar as respostas deste navegador.'),
    h(
      'div',
      { class: 'acoes' },
      button('Voltar', () => go(-1)),
      button('Apagar respostas', () => {
        if (confirm('Apagar as respostas deste navegador? Mande os resultados antes.')) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // nada a apagar
          }
          session = newSession(BUILD, new Date());
          session.appHash = '';
          frame.src = appBase;
          render();
        }
      }),
    ),
  );
}

// ---------- ferramenta no iframe ----------

let lastHref = '';

function syncAddress() {
  const href = appHref();
  if (href === 'about:blank') return;
  const away = href === null || new URL(href).pathname !== new URL(appBase).pathname;
  document.body.classList.toggle('fora', away);
  if (away || href === lastHref) return;
  lastHref = href;
  address.value = href;
  const hash = new URL(href).hash;
  if (hash !== session.appHash) {
    session.appHash = hash;
    save();
  }
}

function onPrint() {
  const id = activeTask();
  if (!id) return;
  const r = record(id);
  r.print = readPrintOptions();
  save();
}

/** Exportação pedida no passo 5 da ferramenta (SVG, PNG, CSV ou copiar a imagem). */
function onExport(e: Event) {
  const id = activeTask();
  const target = e.target as Element | null;
  const kind = target?.closest?.('[data-testid^="export-"]')?.getAttribute('data-testid');
  if (!id || !kind) return;
  const r = record(id);
  r.exports = [...(r.exports ?? []), kind.slice('export-'.length)];
  save();
}

function interceptCtrlP(target: Window) {
  target.addEventListener(
    'keydown',
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        // Ctrl+P imprime a ferramenta, não a página do teste com o roteiro.
        e.preventDefault();
        frame.contentWindow?.print();
      }
    },
    true,
  );
}

frame.addEventListener('load', () => {
  try {
    const w = frame.contentWindow;
    if (w && w.location.href.startsWith(appBase)) {
      w.addEventListener('beforeprint', onPrint);
      w.document.addEventListener('click', onExport, true);
      interceptCtrlP(w);
    }
  } catch {
    // saiu da ferramenta (outro domínio): a barra de endereço avisa
  }
  syncAddress();
});
interceptCtrlP(window);
window.addEventListener('beforeprint', () => {
  const id = activeTask();
  if (id) {
    record(id).printedOuter = true;
    save();
  }
});
setInterval(syncAddress, 400);

$<HTMLButtonElement>('voltar-ferramenta').addEventListener('click', () => {
  frame.src = appBase + session.appHash;
});
$<HTMLButtonElement>('copiar-endereco').addEventListener('click', () => {
  address.select();
  navigator.clipboard?.writeText(address.value).catch(() => undefined);
});
$<HTMLButtonElement>('recolher').addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('recolhido');
  $<HTMLButtonElement>('recolher').textContent = collapsed ? 'Mostrar roteiro' : 'Esconder roteiro';
  $<HTMLButtonElement>('recolher').setAttribute('aria-expanded', String(!collapsed));
});

// ---------- desenho ----------

function render() {
  const s = currentScreen();
  panel.replaceChildren(
    s.kind === 'inicio'
      ? screenInicio()
      : s.kind === 'perfil'
        ? screenPerfil()
        : s.kind === 'instrucoes'
          ? screenInstrucoes()
          : s.kind === 'tarefa'
            ? screenTarefa(s)
            : s.kind === 'sus'
              ? screenSus()
              : s.kind === 'abertas'
                ? screenAbertas()
                : screenFim(),
  );
  progress.textContent =
    s.kind === 'tarefa' && s.task.id !== 'extra'
      ? `tarefa ${s.n} de ${s.total}`
      : s.kind === 'sus' || s.kind === 'abertas'
        ? 'questionário'
        : '';
  const free = activeTask() !== null;
  cover.hidden = free;
  frame.inert = !free;
  cover.textContent =
    s.kind === 'tarefa'
      ? phaseOf(session.tasks[s.task.id]) === 'ler'
        ? 'Leia a tarefa e clique em "Comecei" para usar a ferramenta.'
        : 'Responda às perguntas do roteiro para seguir.'
      : 'A ferramenta fica livre durante as tarefas. Siga o roteiro.';
}

frame.src = appBase + session.appHash;
render();
