/**
 * Textos do teste do F2.9 sem moderador (decisão 0042). Os cartões das tarefas, as perguntas de
 * perfil, os itens do SUS e as perguntas abertas são os de `docs/ux/F2.9-teste-com-usuarios.md` e
 * `docs/ux/F2.9-formulario-de-registro.md`; mudar aqui exige mudar lá (e vice-versa).
 */

export const SCENARIO =
  'Você está projetando a proteção solar de uma janela de um edifício em Recife.';

/** Arquivo recente de Recife (o mesmo do link "Baixar dados recentes" da ferramenta). */
export const RECIFE_ZIP =
  'https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/PE_Pernambuco/BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_TMYx.2011-2025.zip';

export type FieldKind = 'text' | 'long' | 'yesno';

export interface AnswerField {
  id: string;
  label: string;
  kind: FieldKind;
  optional?: boolean;
}

export interface TaskDef {
  /** "1" a "9" ou "extra" (coluna `tarefa` do CSV). */
  id: string;
  title: string;
  /** Texto do cartão, igual ao do roteiro (a tarefa 6 troca só o parêntese; decisão 0042). */
  card: string;
  /** Preparação, feita antes de "Comecei" (fora do tempo). */
  prep?: string[];
  fields: AnswerField[];
  onlyProfessor?: boolean;
}

export const TASKS: TaskDef[] = [
  {
    id: '1',
    title: 'Sol em 21/06 às 9 h (Recife)',
    card: 'Abra a carta solar de Recife. No dia 21 de junho, às 9 h (hora solar), onde está o sol: em que direção e a que altura?',
    fields: [
      { id: 'direcao', label: 'Direção', kind: 'text' },
      { id: 'altura', label: 'Altura', kind: 'text' },
    ],
  },
  {
    id: '2',
    title: 'Fachada noroeste e transferidor',
    card: 'A janela fica numa fachada voltada para o noroeste. Ajuste a carta para essa fachada e mostre o transferidor.',
    fields: [],
  },
  {
    id: '3',
    title: 'Brise α = 50°: sombra às 15 h de 21/12',
    card: 'Sobre a janela há um brise horizontal com ângulo α de 50°. Mostre na carta quando ele sombreia toda a janela. A janela fica toda sombreada às 15 h de 21 de dezembro?',
    fields: [{ id: 'sombreada', label: 'A janela fica toda sombreada?', kind: 'yesno' }],
  },
  {
    id: '4',
    title: 'Trocar para a referência externa',
    card: 'O material da sua disciplina mede os ângulos pela referência externa. Ajuste a ferramenta para isso. O que mudou na carta?',
    fields: [{ id: 'mudou', label: 'O que mudou na carta?', kind: 'long' }],
  },
  {
    id: '5',
    title: 'Dados antigos: período e horas quentes',
    card: 'Mostre na carta as temperaturas dos dados antigos (do SOL-AR 6.2) de Recife. De que período são esses dados? Em que horas do primeiro semestre faz mais de 25 °C e o sol bate na janela?',
    fields: [
      { id: 'periodo', label: 'Período dos dados', kind: 'text' },
      { id: 'horas', label: 'Horas com mais de 25 °C e sol na janela', kind: 'long' },
    ],
  },
  {
    id: '6',
    title: 'Dados recentes: carregar e comparar',
    card: 'Agora use os dados recentes de Recife (o .zip que você baixou na preparação). As horas quentes mudaram?',
    prep: [
      'Esta tarefa precisa do arquivo climático recente de Recife. Faça a preparação antes de clicar em "Comecei" (ela não conta no tempo).',
      'Baixe o arquivo pelo link abaixo (um .zip de cerca de 380 kB).',
      'Não precisa descompactar: a ferramenta abre o .zip direto. Só lembre onde ele foi salvo (em geral, na pasta de downloads).',
      'Se não conseguir baixar, clique em "Comecei" e depois em "Desisti": as outras tarefas não dependem desta.',
    ],
    fields: [{ id: 'mudaram', label: 'As horas quentes mudaram? Como?', kind: 'long' }],
  },
  {
    id: '7',
    title: 'Vento predominante no verão',
    card: 'De onde sopra o vento com mais frequência em Recife no verão, segundo os dados antigos?',
    fields: [{ id: 'direcao', label: 'Direção', kind: 'text' }],
  },
  {
    id: '8',
    title: 'Carta em PDF ou imagem para a aula',
    card: 'Você vai mostrar esta carta de Recife numa aula. Salve-a em PDF ou como imagem.',
    fields: [
      {
        id: 'como',
        label: 'Como você salvou? (PDF, imagem ou outro jeito)',
        kind: 'text',
        optional: true,
      },
    ],
  },
  {
    id: '9',
    title: 'Link para um colega',
    card: 'Um colega quer ver, no computador dele, esta mesma análise, do jeito que está agora na sua tela. Copie um link que a abra assim e cole abaixo.',
    fields: [{ id: 'link', label: 'Cole aqui o link que você mandaria', kind: 'text' }],
  },
  {
    id: 'extra',
    title: 'Exercício do professor',
    card: 'Prepare um exercício: a carta de Florianópolis com uma fachada norte e brises verticais (β de 30° de cada lado), para os alunos marcarem a máscara à mão.',
    fields: [
      {
        id: 'atende',
        label: 'O desenho à mão e a impressão atendem? O que faltou?',
        kind: 'long',
      },
    ],
    onlyProfessor: true,
  },
];

/** SUS (Brooke, 1996), tradução livre da folha de registro. */
export const SUS_ITEMS = [
  'Eu acho que gostaria de usar esta ferramenta com frequência.',
  'Eu achei a ferramenta desnecessariamente complexa.',
  'Eu achei a ferramenta fácil de usar.',
  'Eu acho que precisaria da ajuda de alguém com conhecimento técnico para usar esta ferramenta.',
  'Eu achei que as várias funções da ferramenta estão bem integradas.',
  'Eu achei que há muita inconsistência na ferramenta.',
  'Eu imagino que a maioria das pessoas aprenderia a usar esta ferramenta rapidamente.',
  'Eu achei a ferramenta muito trabalhosa de usar.',
  'Eu me senti muito confiante usando a ferramenta.',
  'Eu precisei aprender muitas coisas antes de conseguir usar a ferramenta.',
] as const;

export interface OpenQuestion {
  text: string;
  /** Só para quem já usou o 6.2, ou só para professores. */
  only?: 'usou62' | 'professor';
}

export const OPEN_QUESTIONS: OpenQuestion[] = [
  { text: 'O que foi mais útil ou mais fácil?' },
  { text: 'Em que momento você ficou em dúvida ou travou?' },
  { text: 'Alguma palavra, ângulo ou aviso que você não entendeu?' },
  {
    text: 'O que ficou melhor e o que ficou pior que no programa antigo (SOL-AR 6.2)?',
    only: 'usou62',
  },
  { text: 'O que falta para você usar isto numa disciplina ou num projeto?' },
  {
    text: 'Você usaria a impressão e o transferidor em sala? O que mudaria?',
    only: 'professor',
  },
];

/** Pergunta de facilidade de uma questão (SEQ; Sauro e Dumas, 2009), de 1 a 7. */
export const SEQ_QUESTION = 'De modo geral, quão difícil ou fácil foi fazer esta tarefa?';
export const SEQ_LOW = 'muito difícil';
export const SEQ_HIGH = 'muito fácil';
export const CONFUSION_QUESTION =
  'O que te confundiu? Onde você procurou antes de achar? (opcional, mas ajuda muito)';
