import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT } from '../export/printOptions';
import { translate, type MessageKey } from '../i18n/i18n';
import { parseHash } from '../state/hashState';
import { overlayFromHash } from '../state/overlayHash';
import { protractorFromHash } from '../state/protractorHash';
import { dataSummary, facadeSummary, outputsSummary } from './stepSummaries';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translate('pt-BR', key, params);
const fmt = (v: number, digits = 0) => v.toFixed(digits).replace('.', ',');

describe('resumos dos passos 2, 4 e 5 fechados (decisão 0044)', () => {
  it('passo 2: orientação com o rumo, transferidor oculto e orientação inválida', () => {
    const facade = (hash: string) => facadeSummary(protractorFromHash(parseHash(hash)), t, fmt);
    expect(facade('#o=315')).toBe('Fachada 315° (NO)');
    expect(facade('#o=-45&tr=0')).toBe('Fachada 315° (NO) · sem transferidor');
    expect(facade('#o=22,5')).toBe('Fachada 22,5° (NNE)');
    expect(facade('#o=noroest')).toBe('Orientação inválida');
  });

  it('passo 4: sem dados, nada na carta, média e frequência', () => {
    const data = (hash: string, hasData = true) =>
      dataSummary(overlayFromHash(parseHash(hash)), hasData, t, fmt);
    expect(data('#dado=tbs', false)).toBe('Sem dados horários abertos no passo 1');
    expect(data('#')).toBe('Nenhum dado na carta');
    expect(data('#dado=tbs&sem=2')).toBe('Temperatura de bulbo seco · 22/jun a 21/dez');
    expect(data('#dado=tbs&modo=freq&limiar=29,5')).toBe(
      'Temperatura de bulbo seco · 22/dez a 21/jun · horas acima de 29,5 °C',
    );
  });

  it('passo 5: raio, o que fica fora da folha e a comparação', () => {
    expect(outputsSummary(DEFAULT_PRINT, false, t, fmt, 'pt-BR')).toBe(
      'Raio de 6 cm · carta completa',
    );
    expect(
      outputsSummary(
        { ...DEFAULT_PRINT, radiusCm: 7.5, mask: false, legend: false },
        true,
        t,
        fmt,
        'pt-BR',
      ),
    ).toBe('Raio de 7,5 cm · sem máscara e legenda · comparação aberta');
    expect(outputsSummary({ ...DEFAULT_PRINT, protractorOnly: true }, false, t, fmt, 'pt-BR')).toBe(
      'Raio de 6 cm · só o transferidor',
    );
  });
});
