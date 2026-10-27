import { describe, expect, it } from 'vitest';
import { checkAnswer, checkTask, parseHashParams, printedLayers } from './conferencia';

const snap = (hash: string) => ({ hash: parseHashParams(hash) });
const PRINT = { radiusCm: 6, protractor: true, mask: true, data: true, protractorOnly: false };

describe('conferência pelo endereço da ferramenta', () => {
  it('tarefa 1: Recife pelo catálogo ou pelo arquivo da estação', () => {
    expect(checkTask('1', snap('#local=recife')).ok).toBe(true);
    expect(checkTask('1', snap('#local=arquivo&lat=-8.126&lon=-34.924&fuso=-3&alt=10')).ok).toBe(
      true,
    );
    expect(checkTask('1', snap('#local=natal')).ok).toBe(false);
    expect(checkTask('1', snap('')).ok).toBe(false);
  });

  it('tarefa 2: fachada 315° (ou −45°) e transferidor visível', () => {
    expect(checkTask('2', snap('#o=315')).ok).toBe(true);
    expect(checkTask('2', snap('#o=-45')).ok).toBe(true);
    expect(checkTask('2', snap('#o=315&tr=0')).detail).toBe(
      'fachada 315° sim; transferidor visível não',
    );
    expect(checkTask('2', snap('#o=45')).ok).toBe(false);
    expect(checkTask('2', snap('#o=abc')).ok).toBe(false);
  });

  it('tarefas 3 e 4: α = 50° na sombra total e referência externa', () => {
    expect(checkTask('3', snap('#a1=50')).ok).toBe(true);
    expect(checkTask('3', snap('#a1=50,0')).ok).toBe(true);
    expect(checkTask('3', snap('#pa1=50')).ok).toBe(false);
    expect(checkTask('4', snap('#a1=50&ref=e')).ok).toBe(true);
    expect(checkTask('4', snap('#a1=50')).ok).toBe(false);
  });

  it('tarefas 5 a 7: dados históricos, arquivo recente e rosa do verão', () => {
    expect(checkTask('5', snap('#local=recife&hist=1&dado=tbs')).ok).toBe(true);
    expect(checkTask('5', snap('#local=recife&hist=1&dado=ur')).ok).toBe(false);
    expect(
      checkTask('6', snap('#local=arquivo&lat=-8.126&lon=-34.924&fuso=-3&alt=10&dado=tbs')).ok,
    ).toBe(true);
    // Arquivo de outra cidade não vale.
    expect(
      checkTask('6', snap('#local=arquivo&lat=-27.67&lon=-48.547&fuso=-3&alt=6&dado=tbs')).ok,
    ).toBe(false);
    expect(checkTask('7', snap('#local=recife&hist=1&aba=rosa&estacao=dez-fev')).ok).toBe(true);
    expect(checkTask('7', snap('#local=recife&hist=1&aba=rosa&estacao=jun-ago')).ok).toBe(false);
  });

  it('tarefa 8: impressão aberta, raio 6 cm, carta só com o transferidor', () => {
    const h = '#local=recife&hist=1&dado=tbs&a1=50';
    expect(checkTask('8', { ...snap(h), print: null }).detail).toBe('a impressão não foi aberta');
    expect(checkTask('8', { ...snap(h), print: null, printedOuter: true }).detail).toContain(
      'página do teste inteira',
    );
    expect(checkTask('8', { ...snap(h), print: PRINT }).ok).toBe(false);
    expect(checkTask('8', { ...snap(h), print: { ...PRINT, mask: false, data: false } }).ok).toBe(
      true,
    );
    // Sem máscara nem dados na tela, as opções não importam.
    expect(checkTask('8', { ...snap('#local=recife'), print: PRINT }).ok).toBe(true);
    // "Só o transferidor" tira a carta.
    expect(checkTask('8', { ...snap(h), print: { ...PRINT, protractorOnly: true } }).ok).toBe(
      false,
    );
    expect(
      checkTask('8', {
        ...snap('#local=recife'),
        print: { ...PRINT, radiusCm: 5 },
      }).ok,
    ).toBe(false);
    expect(printedLayers(parseHashParams('#tr=0'), PRINT).protractor).toBe(false);
  });

  it('tarefa 9: o link colado abre o mesmo estado, em qualquer ordem das chaves', () => {
    const appUrl = 'https://x.github.io/novo-solar/#a1=50&local=recife&o=315';
    const ok = (pastedLink: string) => checkTask('9', { hash: {}, appUrl, pastedLink }).ok;
    expect(ok('https://x.github.io/novo-solar/#o=315&local=recife&a1=50')).toBe(true);
    expect(ok('https://x.github.io/novo-solar/#local=recife&o=315')).toBe(false);
    expect(ok('https://x.github.io/novo-solar/teste/#a1=50&local=recife&o=315')).toBe(false);
    expect(ok('recife o=315')).toBe(false);
    expect(checkTask('9', { hash: {}, appUrl, pastedLink: '' }).detail).toBe('nenhum link colado');
    expect(
      checkTask('9', { hash: {}, appUrl, pastedLink: 'https://x.github.io/novo-solar/#o=315' })
        .detail,
    ).toBe('mesma página sim; mesmo estado não (difere em: a1, local)');
  });

  it('tarefa extra: Florianópolis, norte e β de 30° dos dois lados', () => {
    expect(checkTask('extra', snap('#local=florianopolis&o=0&bd1=30&be1=30')).ok).toBe(true);
    expect(checkTask('extra', snap('#local=florianopolis&bd1=30&be1=30')).ok).toBe(true);
    expect(checkTask('extra', snap('#local=florianopolis&o=180&bd1=30&be1=30')).ok).toBe(false);
  });
});

describe('conferência das respostas', () => {
  it('tarefa 1: 36° de altura e 53° (nordeste), ±3°', () => {
    expect(checkAnswer('1', { altura: '36°', direcao: 'nordeste' }).ok).toBe(true);
    expect(checkAnswer('1', { altura: '35', direcao: '55 graus' }).ok).toBe(true);
    expect(checkAnswer('1', { altura: '36,5', direcao: 'NE' }).ok).toBe(true);
    expect(checkAnswer('1', { altura: '40', direcao: 'NE' }).ok).toBe(false);
    expect(checkAnswer('1', { altura: '36', direcao: 'noroeste' }).ok).toBe(false);
    expect(checkAnswer('1', { altura: '36', direcao: '60°' }).ok).toBe(false);
  });

  it('tarefas 3, 5 e 7', () => {
    expect(checkAnswer('3', { sombreada: 'sim' }).ok).toBe(true);
    expect(checkAnswer('3', { sombreada: 'não sei' }).ok).toBe(false);
    expect(checkAnswer('5', { periodo: 'um ano entre 1951 e 1970' }).ok).toBe(true);
    expect(checkAnswer('5', { periodo: '2011 a 2025' }).ok).toBe(false);
    for (const d of ['leste', 'L', 'E', 'do leste', '90°']) {
      expect(checkAnswer('7', { direcao: d }).ok, d).toBe(true);
    }
    for (const d of ['sudeste', 'nordeste', 'oeste', '180']) {
      expect(checkAnswer('7', { direcao: d }).ok, d).toBe(false);
    }
  });

  it('as outras tarefas ficam para a consolidação', () => {
    expect(checkAnswer('4', { mudou: 'qualquer coisa' }).ok).toBeNull();
  });
});
