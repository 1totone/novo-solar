import { describe, expect, it } from 'vitest';
import registro from '../../docs/ux/F2.9-registro.csv?raw';
import { CSV_COLUMNS, newSession, resultsCsv, susScore } from './resultados';

describe('resultados do teste sem moderador', () => {
  it('as colunas são as do registro consolidado (docs/ux/F2.9-registro.csv)', () => {
    const header = registro.split('\n').find((l) => !l.startsWith('#'));
    expect(header).toBe(CSV_COLUMNS.join(','));
  });

  it('nota SUS (Brooke, 1996): o exemplo da planilha dá 87,5', () => {
    expect(susScore([5, 1, 4, 2, 4, 1, 5, 1, 4, 2])).toBe(87.5);
    expect(susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(50);
    expect(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(susScore([5, 1, 4, 2, 4, 1, 5, 1, 4, null])).toBeNull();
  });

  it('professor: tarefa extra e pergunta do professor; quem não usou o 6.2 não vê a do 6.2', () => {
    const s = newSession('0.1.0', new Date('2026-10-28T12:00:00Z'));
    s.participant = 'P5';
    s.consent = true;
    s.profile = {
      role: 'professor',
      semester: '',
      chartInClass: 'sim',
      used62: 'não',
      device: 'tablet',
      browser: 'Safari',
    };
    s.tasks['1'] = {
      start: 0,
      end: 150_000,
      outcome: 'S',
      answers: { direcao: 'NE, "quase" leste', altura: '36' },
      snapshot: { hash: { local: 'recife' } },
      seq: 5,
      confusion: 'linha 1\nlinha 2',
    };
    s.tasks['6'] = {
      start: 0,
      end: 60_000,
      outcome: 'N',
      answers: {},
      snapshot: { hash: { local: 'recife' } },
      seq: 1,
      confusion: '',
    };
    const lines = resultsCsv(s).trim().split('\n');
    const tasks = lines.slice(1).map((l) => l.split(',')[4]);
    expect(tasks).toEqual([
      'sessao',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'extra',
      'sus',
      'aberta1',
      'aberta2',
      'aberta3',
      'aberta5',
      'aberta6',
    ]);
    const row1 = lines.find((l) => l.startsWith('P5,professor,não,tablet,1,'))!;
    expect(row1).toContain(',S,2.5,"Direção: NE, ""quase"" leste; Altura: 36",');
    expect(row1).toContain('confundiu: linha 1 / linha 2');
    expect(row1).toContain('SEQ 5');
    // Desistência: resultado N e sem conferência da resposta.
    const row6 = lines.find((l) => l.startsWith('P5,professor,não,tablet,6,'))!;
    expect(row6).toMatch(/,N,1\.0,,"?conferência: falhou/);
    expect(row6).not.toContain('resposta:');
    expect(lines.find((l) => l.includes(',2,'))).toContain('não feita');
    expect(lines.find((l) => l.includes(',sus,'))).toContain('incompleto');
  });
});
