/**
 * Sessão do teste sem moderador e arquivo de resultados nas colunas de `docs/ux/F2.9-registro.csv`
 * (decisão 0042). Funções puras, testadas em `resultados.test.ts`.
 */
import {
  checkAnswer,
  checkTask,
  type Check,
  type PrintSnapshot,
  type Snapshot,
} from './conferencia';
import { OPEN_QUESTIONS, TASKS } from './roteiro';

export const CSV_COLUMNS = [
  'participante',
  'perfil',
  'ja_usou_6_2',
  'aparelho',
  'tarefa',
  'resultado',
  'tempo_min',
  'resposta',
  'observacao',
  'gravidade',
] as const;

export interface Profile {
  role: '' | 'aluno' | 'professor';
  semester: string;
  chartInClass: '' | 'sim' | 'não';
  used62: '' | 'sim' | 'não' | 'não lembra';
  device: '' | 'computador' | 'tablet' | 'celular';
  browser: string;
}

export interface TaskRecord {
  /** Instantes em ms (Date.now()). */
  start?: number;
  end?: number;
  /** Terminei (S) ou Desisti (N). */
  outcome?: 'S' | 'N';
  answers: Record<string, string>;
  /** Retrato do estado da ferramenta no "Terminei" ou "Desisti". */
  snapshot?: Snapshot;
  /** Tarefa 8: opções da última impressão aberta na ferramenta durante a tarefa. */
  print?: PrintSnapshot | null;
  /** Tarefa 8: a página do teste inteira foi impressa durante a tarefa. */
  printedOuter?: boolean;
  seq?: number;
  confusion: string;
}

export interface Session {
  version: 1;
  participant: string;
  consent: boolean;
  profile: Profile;
  /** ISO 8601, início da sessão. */
  startedAt: string;
  tasks: Record<string, TaskRecord>;
  sus: (number | null)[];
  open: string[];
  /** Tela atual do roteiro (índice em `flow`). */
  screen: number;
  /** Último '#' da ferramenta, para reabrir no mesmo estado se a página recarregar. */
  appHash: string;
  /** Versão da ferramenta (rodapé). */
  build: string;
}

export function newSession(build: string, now: Date): Session {
  return {
    version: 1,
    participant: '',
    consent: false,
    profile: { role: '', semester: '', chartInClass: '', used62: '', device: '', browser: '' },
    startedAt: now.toISOString(),
    tasks: {},
    sus: Array(10).fill(null),
    open: Array(OPEN_QUESTIONS.length).fill(''),
    screen: 0,
    appHash: '',
    build,
  };
}

/** Nota SUS de 0 a 100 (Brooke, 1996), ou null se faltar resposta. */
export function susScore(answers: readonly (number | null)[]): number | null {
  if (answers.length !== 10 || answers.some((a) => a === null || a < 1 || a > 5)) return null;
  const sum = answers.reduce<number>((acc, a, i) => acc + (i % 2 === 0 ? a! - 1 : 5 - a!), 0);
  return sum * 2.5;
}

export function profileLabel(p: Profile): string {
  if (p.role === 'professor') return 'professor';
  if (p.role === 'aluno')
    return p.semester.trim() ? `aluno ${p.semester.trim()}º semestre` : 'aluno';
  return '';
}

/** Tarefas que este participante vê (a extra só para professores). */
export function tasksFor(p: Profile) {
  return TASKS.filter((t) => !t.onlyProfessor || p.role === 'professor');
}

/** Perguntas abertas que este participante vê (índices em OPEN_QUESTIONS). */
export function openQuestionsFor(p: Profile): number[] {
  return OPEN_QUESTIONS.flatMap((q, i) =>
    q.only === 'usou62' && p.used62 !== 'sim'
      ? []
      : q.only === 'professor' && p.role !== 'professor'
        ? []
        : [i],
  );
}

const oneLine = (s: string) => s.replace(/\s*[\r\n]+\s*/g, ' / ').trim();

function csvField(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function checkText(label: string, c: Check): string {
  if (c.ok === null) return '';
  return `${label}: ${c.ok ? 'ok' : 'falhou'} (${c.detail})`;
}

/** Tempo em minutos com uma casa (ponto decimal, como os CSV da ferramenta). */
export function minutes(r: TaskRecord): string {
  if (r.start === undefined || r.end === undefined) return '';
  return (Math.max(0, r.end - r.start) / 60000).toFixed(1);
}

function taskRow(id: string, r: TaskRecord | undefined): string[] {
  if (!r || !r.outcome) return [id, '', '', '', 'não feita', ''];
  const def = TASKS.find((t) => t.id === id);
  const resposta = (def?.fields ?? [])
    .map((f) => [f.label, oneLine(r.answers[f.id] ?? '')] as const)
    .filter(([, v]) => v !== '')
    .map(([l, v]) => `${l}: ${v}`)
    .join('; ');
  const snap = r.snapshot;
  const obs = [
    snap ? checkText('conferência', checkTask(id, snap)) : '',
    r.outcome === 'S' ? checkText('resposta', checkAnswer(id, r.answers)) : '',
    r.seq !== undefined ? `SEQ ${r.seq}` : '',
    r.confusion.trim() ? `confundiu: ${oneLine(r.confusion)}` : '',
    snap ? `estado: #${new URLSearchParams(snap.hash).toString()}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
  return [id, r.outcome, minutes(r), resposta, obs, ''];
}

/** Resultados em CSV, nas colunas do registro consolidado, uma linha por registro. */
export function resultsCsv(s: Session): string {
  const p = s.profile;
  const head = [s.participant, profileLabel(p), p.used62, p.device];
  const rows: string[][] = [];
  rows.push([
    ...head,
    'sessao',
    '',
    '',
    `consentimento: ${s.consent ? 'sim' : 'não'}; gravação: não (teste sem moderador)`,
    [
      `carta solar em aula: ${p.chartInClass || '?'}`,
      `navegador: ${oneLine(p.browser) || '?'}`,
      `versão: ${s.build}`,
      `início: ${s.startedAt}`,
      'teste sem moderador (decisão 0042)',
    ].join(' | '),
    '',
  ]);
  for (const t of tasksFor(p)) rows.push([...head, ...taskRow(t.id, s.tasks[t.id])]);
  const score = susScore(s.sus);
  rows.push([
    ...head,
    'sus',
    '',
    '',
    s.sus.map((a) => (a === null ? '' : String(a))).join(','),
    score === null ? 'incompleto' : `nota ${score}`,
    '',
  ]);
  for (const i of openQuestionsFor(p)) {
    rows.push([
      ...head,
      `aberta${i + 1}`,
      '',
      '',
      oneLine(s.open[i] ?? ''),
      OPEN_QUESTIONS[i]!.text,
      '',
    ]);
  }
  return [CSV_COLUMNS.join(','), ...rows.map((r) => r.map(csvField).join(','))].join('\n') + '\n';
}

export function resultsFileName(s: Session): string {
  return `F2.9-${s.participant || 'P'}-resultados.csv`;
}
