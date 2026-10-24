import { describe, expect, it } from 'vitest';
import { formatLimits, overlayFromHash } from './overlayHash';

describe('dados sobre a carta no # da URL', () => {
  it('padrão: desligado, primeiro semestre, faixas padrão, média', () => {
    const o = overlayFromHash({});
    expect(o).toMatchObject({ key: undefined, semester: 1, mode: 'mean' });
    expect(o.bands).toEqual({ source: 'default' });
  });

  it('lê variável, semestre, faixas digitadas, frequência e limiar', () => {
    const o = overlayFromHash({
      dado: 'tbs',
      sem: '2',
      faixas: '8_15_22,5_28',
      modo: 'freq',
      limiar: '27,5',
    });
    expect(o.key).toBe('tbs');
    expect(o.semester).toBe(2);
    expect(o.bands).toEqual({ source: 'custom', limits: [8, 15, 22.5, 28] });
    expect(o.mode).toBe('frequency');
    expect(o.threshold).toBe(27.5);
    expect(formatLimits([8, 15, 22.5, 28])).toBe('8_15_22.5_28');
  });

  it('faixas fora de ordem ou incompletas caem nas padrão e são sinalizadas', () => {
    expect(overlayFromHash({ dado: 'tbs', faixas: '10_9_20_25' })).toMatchObject({
      bands: { source: 'default' },
      bandsInvalid: true,
    });
    expect(overlayFromHash({ dado: 'tbs', faixas: '10_20' }).bandsInvalid).toBe(true);
    expect(overlayFromHash({ dado: 'ghi', faixas: 'arquivo' }).bands).toEqual({ source: 'file' });
  });

  it('variável desconhecida desliga; limiar padrão por variável', () => {
    expect(overlayFromHash({ dado: 'xyz' }).key).toBeUndefined();
    expect(overlayFromHash({ dado: 'tbs' }).threshold).toBe(26);
    expect(overlayFromHash({ dado: 'ghi' }).threshold).toBe(500);
  });
});
