import { describe, expect, it } from 'vitest';
import { windSpeedFactor } from '../../core/wind/windProfile';
import { buildHash } from './hashState';
import { terrainPatch, thermalPatch, windFromHash } from './windHash';

const ADVANCED_DEFAULT = {
  thermal: undefined,
  heightText: '',
  height: 10,
  heightInvalid: false,
  terrain: 'country',
  speedFactor: 1,
  corrected: false,
  advanced: false,
};

describe('rosa dos ventos no # da URL', () => {
  it('padrão: carta, 8 setores, ano todo, dia todo, frequência, sem vento avançado', () => {
    expect(windFromHash({})).toEqual({
      tab: 'chart',
      sectors: 8,
      season: undefined,
      period: undefined,
      show: 'frequency',
      ...ADVANCED_DEFAULT,
    });
  });

  it('lê aba, setores, estação, período e modo; ignora valores desconhecidos', () => {
    expect(
      windFromHash({
        aba: 'rosa',
        setores: '16',
        estacao: 'jun-ago',
        periodo: 'tarde',
        rosa: 'vel',
      }),
    ).toEqual({
      tab: 'rose',
      sectors: 16,
      season: 'jun-ago',
      period: 'tarde',
      show: 'speed',
      ...ADVANCED_DEFAULT,
    });
    expect(windFromHash({ setores: '12', estacao: 'verao', periodo: 'x' })).toMatchObject({
      sectors: 8,
      season: undefined,
      period: undefined,
    });
  });
});

describe('vento avançado no # da URL (F4.4, decisão 0027)', () => {
  it('vh: condição térmica; valores desconhecidos ficam sem filtro', () => {
    expect(windFromHash({ vh: 'q' })).toMatchObject({ thermal: 'hot', advanced: true });
    expect(windFromHash({ vh: 'f' }).thermal).toBe('cold');
    expect(windFromHash({ vh: 'n' }).thermal).toBe('neutral');
    expect(windFromHash({ vh: 'x' }).thermal).toBeUndefined();
  });

  it('va e vt: altura com vírgula decimal e terreno; fator da spec 06, seção 6.7', () => {
    expect(windFromHash({ va: '3', vt: 'c' })).toMatchObject({
      heightText: '3',
      height: 3,
      terrain: 'city',
      speedFactor: windSpeedFactor(3, 'city'),
      corrected: true,
      advanced: true,
    });
    expect(windFromHash({ va: '4,5', vt: 's' })).toMatchObject({ height: 4.5, terrain: 'suburbs' });
    expect(windFromHash({ vt: 'a' })).toMatchObject({
      height: 10,
      terrain: 'ocean',
      speedFactor: windSpeedFactor(10, 'ocean'),
    });
    // Campo aberto a 10 m é a própria estação: sem correção.
    expect(windFromHash({ va: '10' })).toMatchObject({ speedFactor: 1, corrected: false });
    expect(windFromHash({ vt: 'z' }).terrain).toBe('country');
  });

  it('altura fora de 1 a 200 m ou não numérica: marcada, sem correção', () => {
    for (const va of ['0,5', '201', 'abc', '-3']) {
      expect(windFromHash({ va, vt: 'c' }), va).toMatchObject({
        heightText: va,
        heightInvalid: true,
        height: 10,
        speedFactor: 1,
        corrected: false,
      });
    }
  });

  it('patches: voltar ao padrão tira as chaves do link', () => {
    expect(buildHash({ ...thermalPatch('cold'), ...terrainPatch('ocean') })).toBe('#vh=f&vt=a');
    expect(buildHash({ ...thermalPatch(undefined), ...terrainPatch('country') })).toBe('');
  });
});
