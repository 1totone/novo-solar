import { describe, expect, it } from 'vitest';
import { buildHash } from './hashState';
import { formatPolygons, parsePolygons, protractorFromHash } from './protractorHash';

describe('fachada e ângulos no # da URL', () => {
  it('padrão: orientação 0°, transferidor visível, referência interna, sem ângulos', () => {
    const p = protractorFromHash({});
    expect(p).toMatchObject({ orientation: 0, show: true, reference: 'internal', invalid: [] });
    expect(p.angles.alpha).toBeUndefined();
  });

  it('lê orientação negativa, vírgula decimal e índices 1 e 2', () => {
    const p = protractorFromHash({ o: '-30', ref: 'e', a1: '45', a2: '12,5', bd1: '30' });
    expect(p.orientation).toBe(-30);
    expect(p.reference).toBe('external');
    expect(p.angles.alpha).toEqual([45, 12.5]);
    expect(p.angles.betaRight).toEqual([30]);
  });

  it('marca valores fora de 0° a 90° e não os usa', () => {
    const p = protractorFromHash({ a1: '95', be1: 'x', gd1: '20' });
    expect(p.invalid).toEqual(['a1', 'be1']);
    expect(p.angles.alpha).toBeUndefined();
    expect(p.angles.gammaRight).toEqual([20]);
  });

  it('índice 2 sem índice 1 não desenha nada', () => {
    expect(protractorFromHash({ a2: '30' }).angles.alpha).toBeUndefined();
  });

  it('orientação inválida cai em 0° e é sinalizada', () => {
    const p = protractorFromHash({ o: 'norte' });
    expect(p.orientation).toBe(0);
    expect(p.orientationValid).toBe(false);
  });

  it('sombra parcial com prefixo p e γ das aletas', () => {
    const p = protractorFromHash({ a1: '55', pa1: '60', pa2: '25', gad: '50', pgae: '40' });
    expect(p.angles.alpha).toEqual([55]);
    expect(p.angles.finTopRight).toEqual([50]);
    expect(p.partial.alpha).toEqual([60, 25]);
    expect(p.partial.finTopLeft).toEqual([40]);
    expect(protractorFromHash({ pbd1: '91' }).invalid).toEqual(['pbd1']);
  });

  it('desenho à mão: polígonos no # com caracteres que a URL não codifica', () => {
    const polygons = [
      [
        { azimuth: 30, altitude: 10.25 },
        { azimuth: 60.04, altitude: 30 },
        { azimuth: 90, altitude: 10 },
      ],
    ];
    const text = formatPolygons(polygons);
    expect(text).toBe('30_10.3-60_30-90_10');
    expect(buildHash({ dt: text })).toBe(`#dt=${text}`);
    expect(parsePolygons(text)).toEqual([
      [
        { azimuth: 30, altitude: 10.3 },
        { azimuth: 60, altitude: 30 },
        { azimuth: 90, altitude: 10 },
      ],
    ]);
    // dois polígonos; vértices inválidos e polígonos com menos de 3 vértices são descartados
    expect(parsePolygons('10_5-20_5-30_5*1_1-2_2*400_10-410_20-x_1-420_30')).toEqual([
      [
        { azimuth: 10, altitude: 5 },
        { azimuth: 20, altitude: 5 },
        { azimuth: 30, altitude: 5 },
      ],
      [
        { azimuth: 40, altitude: 10 },
        { azimuth: 50, altitude: 20 },
        { azimuth: 60, altitude: 30 },
      ],
    ]);
    expect(protractorFromHash({ dt: text }).drawn.total).toHaveLength(1);
  });
});
