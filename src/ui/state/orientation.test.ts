import { describe, expect, it } from 'vitest';
import { compassAzimuth, parseOrientation } from './orientation';

describe('orientação digitada: graus ou rumo (decisão 0044, item c)', () => {
  it('graus com vírgula, ponto, "°" e sinal de menos', () => {
    expect(parseOrientation('315')).toBe(315);
    expect(parseOrientation('-45')).toBe(-45);
    expect(parseOrientation('−45')).toBe(-45);
    expect(parseOrientation('22,5°')).toBe(22.5);
    expect(parseOrientation(' 90.5 ')).toBe(90.5);
  });

  it('as 8 siglas principais em português, espanhol e inglês', () => {
    const cases: [string[], number][] = [
      [['N', 'n', 'norte', 'north', 'Norte'], 0],
      [['NE', 'nordeste', 'noreste', 'northeast'], 45],
      [['L', 'E', 'leste', 'este', 'east'], 90],
      [['SE', 'sudeste', 'sureste', 'southeast'], 135],
      [['S', 'sul', 'sur', 'south'], 180],
      [['SO', 'SW', 'sudoeste', 'suroeste', 'southwest'], 225],
      [['O', 'W', 'oeste', 'west'], 270],
      [['NO', 'no', 'NW', 'noroeste', 'Noroeste', 'northwest', 'north-west', 'north west'], 315],
    ];
    for (const [texts, azimuth] of cases) {
      for (const text of texts) expect(parseOrientation(text), text).toBe(azimuth);
    }
  });

  it('os rumos intermediários, com e sem acento e hífen', () => {
    expect(compassAzimuth('NNE')).toBe(22.5);
    expect(compassAzimuth('ENE')).toBe(67.5);
    expect(compassAzimuth('lés-nordeste')).toBe(67.5);
    expect(compassAzimuth('les nordeste')).toBe(67.5);
    expect(compassAzimuth('su-sudeste')).toBe(157.5);
    expect(compassAzimuth('sul-sudeste')).toBe(157.5);
    expect(compassAzimuth('SSO')).toBe(202.5);
    expect(compassAzimuth('SSW')).toBe(202.5);
    expect(compassAzimuth('oés-noroeste')).toBe(292.5);
    expect(compassAzimuth('west-northwest')).toBe(292.5);
    expect(compassAzimuth('NNO')).toBe(337.5);
    expect(compassAzimuth('nor-noroeste')).toBe(337.5);
  });

  it('texto que não é número nem rumo', () => {
    expect(parseOrientation('')).toBeNull();
    expect(parseOrientation('noroest')).toBeNull();
    expect(parseOrientation('NOX')).toBeNull();
    expect(parseOrientation('45 graus')).toBeNull();
  });
});
