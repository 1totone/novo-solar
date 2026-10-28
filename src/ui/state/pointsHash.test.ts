import { describe, expect, it } from 'vitest';
import { buildHash, parseHash } from './hashState';
import { clearPointsPatch, nextPointNumber, pointPatch, pointsFromHash } from './pointsHash';

describe('pontos marcados no link (decisão 0051)', () => {
  it('sem chaves: nenhum ponto (links antigos abrem igual)', () => {
    expect(pointsFromHash(parseHash('#local=recife&o=315'))).toEqual([]);
  });

  it('ida e volta, com o número de cada ponto', () => {
    const state = {
      local: 'recife',
      ...pointPatch(1, { altitude: 35.24, azimuth: 112.46 }),
      ...pointPatch(3, { altitude: 60, azimuth: -30 }),
    };
    const link = buildHash(state);
    expect(link).toBe('#local=recife&pm1=35.2_112.5&pm3=60_330');
    expect(pointsFromHash(parseHash(link))).toEqual([
      { n: 1, altitude: 35.2, azimuth: 112.5 },
      { n: 3, altitude: 60, azimuth: 330 },
    ]);
  });

  it('altura limitada ao céu e azimute em [0°, 360°)', () => {
    expect(pointPatch(2, { altitude: 90.04, azimuth: 359.97 })).toEqual({ pm2: '90_0' });
    expect(pointPatch(2, { altitude: -0.02, azimuth: 720 })).toEqual({ pm2: '0_0' });
  });

  it('valores ilegíveis ou fora do céu ficam de fora', () => {
    const state = parseHash('#pm1=95_10&pm2=abc&pm3=10_20_30');
    expect(pointsFromHash(state)).toEqual([]);
    expect(pointsFromHash(parseHash('#pm2=-1_10&pm3=0_400'))).toEqual([
      { n: 3, altitude: 0, azimuth: 40 },
    ]);
  });

  it('o próximo ponto ocupa o menor número livre; com três, nenhum', () => {
    expect(nextPointNumber([])).toBe(1);
    const two = pointsFromHash(parseHash('#pm1=10_10&pm3=20_20'));
    expect(nextPointNumber(two)).toBe(2);
    const three = pointsFromHash(parseHash('#pm1=10_10&pm2=15_15&pm3=20_20'));
    expect(nextPointNumber(three)).toBeNull();
  });

  it('remover e limpar tiram as chaves do link', () => {
    const state = parseHash('#local=natal&pm1=10_10&pm2=15_15&pm3=20_20');
    expect(buildHash({ ...state, ...pointPatch(2, null) })).toBe(
      '#local=natal&pm1=10_10&pm3=20_20',
    );
    expect(buildHash({ ...state, ...clearPointsPatch() })).toBe('#local=natal');
  });
});
