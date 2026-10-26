import { describe, expect, it } from 'vitest';
import { HOURS_PER_YEAR, type HourlyShading, type MonthHourMap } from '../../core/shading/hourly';
import { hourlyCsv, mapCsv, shadeClass } from './mapData';

describe('mapa mês × hora: classes e CSV', () => {
  it('classes nos níveis das curvas, com 0% e 100% exatos', () => {
    expect(shadeClass(null)).toBeNull();
    expect([0, 1e-12, 0.01, 0.25, 0.2501, 0.5, 0.75, 0.9999, 1 - 1e-12, 1].map(shadeClass)).toEqual(
      [0, 0, 1, 1, 2, 2, 3, 4, 5, 5],
    );
  });

  it('CSV do mapa: duas linhas por mês, sem valor nas horas sem sol na janela', () => {
    const row = (v: number | null) => Array.from({ length: 24 }, () => v);
    const map: MonthHourMap = {
      sunlit: Array.from({ length: 12 }, () => row(0.5) as number[]),
      exposure: Array.from({ length: 12 }, () => row(1) as number[]),
      shadedWhenExposed: Array.from({ length: 12 }, (_, m) => row(m === 0 ? null : 0.25)),
    };
    const lines = mapCsv(
      map,
      ['Teste', 'Separador: vírgula; decimal: ponto.'],
      'a,b,c,d,e,f,g,h,i,j,k,l'.split(','),
    )
      .trimEnd()
      .split('\n');
    expect(lines[0]).toBe('﻿# Teste');
    expect(lines[2]).toBe(
      ['mes', 'grandeza', ...Array.from({ length: 24 }, (_, h) => h + 1)].join(','),
    );
    expect(lines[3]).toBe(['a', 'sombra_%', ...Array(24).fill('')].join(','));
    expect(lines[4]).toBe(['a', 'sol_na_janela_%', ...Array(24).fill('100')].join(','));
    expect(lines[5]).toBe(['b', 'sombra_%', ...Array(24).fill('25')].join(','));
    expect(lines).toHaveLength(3 + 24);
  });

  it('CSV hora a hora: 8760 linhas na ordem do EPW, de 1/1 1 h a 31/12 24 h', () => {
    const fill = (v: number) => new Float64Array(HOURS_PER_YEAR).fill(v);
    const hourly: HourlyShading = {
      sunlit: fill(0.25),
      exposure: fill(0.5),
      sunlitIncidence: fill(0.125),
      incidence: fill(0.375),
    };
    const lines = hourlyCsv(hourly, ['Teste', 'Separador: vírgula; decimal: ponto.'])
      .trimEnd()
      .split('\n');
    expect(lines).toHaveLength(3 + HOURS_PER_YEAR);
    expect(lines[3]).toBe('1,1,1,0.25,0.5,0.125,0.375');
    expect(lines[3 + 24 * 31]).toBe('2,1,1,0.25,0.5,0.125,0.375');
    expect(lines.at(-1)).toBe('12,31,24,0.25,0.5,0.125,0.375');
  });
});
