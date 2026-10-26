import { describe, expect, it } from 'vitest';
import { hashForSite, siteFromHash } from '../state/siteHash';
import {
  displayName,
  distanceKm,
  nearestStations,
  normalize,
  projectPointFromHash,
  projectPointToHash,
  searchStations,
  stationWarnings,
  type Station,
} from './catalog';

const station = (over: Partial<Station>): Station => ({
  id: '838990',
  nome: 'Florianopolis-Luz.Intl.AP',
  uf: 'SC',
  lat: -27.67,
  lon: -48.547,
  alt: 6.1,
  fuso: -3,
  periodo: [2011, 2025],
  anos: 15,
  fonte: 'isd',
  url: 'SC_Santa_Catarina/x.zip',
  q: {
    horas: 8760,
    ausentes: 0,
    calmaria: 1,
    kt: 0,
    atraso: 2,
    fechamento: 50,
    ghi: 1600,
    dni: 1500,
    dhi: 700,
    tbs: [8, 21, 34],
  },
  ...over,
});

describe('catálogo: busca', () => {
  const list = [
    station({ id: '1', nome: 'Florianopolis-Luz.Intl.AP', uf: 'SC' }),
    station({ id: '2', nome: 'Sao.Jose.dos.Campos.AP', uf: 'SP' }),
    station({ id: '3', nome: 'Sao.Paulo-Congonhas.AP', uf: 'SP' }),
    station({ id: '4', nome: 'Joinville-Lauro.Carneiro.de.Loyola.AP', uf: 'SC' }),
  ];

  it('sem acentos e sem pontos: "são paulo" acha Sao.Paulo', () => {
    expect(normalize('São Paulo-Congonhas.AP')).toBe('sao paulo congonhas ap');
    expect(searchStations(list, 'são paulo').map((s) => s.id)).toEqual(['3']);
  });

  it('todas as palavras, no nome, na sigla ou no nome da UF; o começo do nome vem antes', () => {
    expect(searchStations(list, 'sc').map((s) => s.id)).toEqual(['1', '4']);
    expect(
      searchStations(list, 'santa catarina', { SC: 'Santa Catarina' }).map((s) => s.id),
    ).toEqual(['1', '4']);
    expect(searchStations(list, 'sao').map((s) => s.id)).toEqual(['2', '3']);
    // "São Paulo" bate no nome da estação e no nome da UF: o nome vem antes.
    expect(searchStations(list, 'sao paulo', { SP: 'São Paulo' }).map((s) => s.id)).toEqual([
      '3',
      '2',
    ]);
    expect(searchStations(list, 'jose campos').map((s) => s.id)).toEqual(['2']);
    expect(searchStations(list, '   ')).toEqual([]);
  });

  it('nome legível', () => {
    expect(displayName({ nome: 'Florianopolis-Luz.Intl.AP' })).toBe('Florianopolis-Luz Intl AP');
  });
});

describe('catálogo: distância e avisos', () => {
  it('distância pelo círculo máximo (casos exatos na esfera de raio médio)', () => {
    const R = 6371.0088;
    expect(distanceKm(0, 0, 0, 1)).toBeCloseTo((R * Math.PI) / 180, 6);
    expect(distanceKm(0, 0, 90, 0)).toBeCloseTo((R * Math.PI) / 2, 6);
    expect(distanceKm(-27, -48, -27, -48)).toBe(0);
    // Simétrica e sem erro perto dos antípodas.
    expect(distanceKm(10, 20, -10, -160)).toBeCloseTo(R * Math.PI, 3);
  });

  it('estações mais próximas, com o desnível estação menos obra', () => {
    const a = station({ id: 'a', lat: -27.6, lon: -48.5, alt: 10 });
    const b = station({ id: 'b', lat: -26.9, lon: -48.6, alt: 900 });
    const near = nearestStations([b, a], { lat: -27.58, lon: -48.51, alt: 100 }, 2);
    expect(near.map((n) => n.station.id)).toEqual(['a', 'b']);
    expect(near[0]!.dz).toBe(-90);
    expect(near[1]!.dz).toBe(800);
    expect(nearestStations([a], { lat: 0, lon: 0, alt: null })[0]!.dz).toBeNull();
  });

  it('avisos: só reanálise, poucos anos, longe (> 50 km) e desnível (> 200 m)', () => {
    const s = station({ fonte: 'era5', anos: 8, lat: -27.6, lon: -48.5, alt: 10 });
    expect(stationWarnings(s, null)).toEqual({
      reanalysis: true,
      fewYears: true,
      far: null,
      height: null,
      lag: null,
    });
    const w = stationWarnings(s, { lat: -27.6, lon: -49.2, alt: 900 });
    expect(w.far).toBeGreaterThan(50);
    expect(w.height).toBe(-890);
    const close = stationWarnings(station({}), { lat: -27.67, lon: -48.55, alt: 150 });
    expect(close).toEqual({
      reanalysis: false,
      fewYears: false,
      far: null,
      height: null,
      lag: null,
    });
    const late = station({ q: { ...station({}).q, atraso: 31.7 } });
    expect(stationWarnings(late, null).lag).toBe(31.7);
    expect(stationWarnings(station({ q: { ...station({}).q, atraso: -14 } }), null).lag).toBeNull();
  });

  it('local da obra no link: lat,lon[,alt], com ida e volta', () => {
    expect(projectPointFromHash('-27.6,-48.5,12')).toEqual({ lat: -27.6, lon: -48.5, alt: 12 });
    expect(projectPointFromHash('-27.6,-48.5')).toEqual({ lat: -27.6, lon: -48.5, alt: null });
    expect(projectPointFromHash('-95,0')).toBeNull();
    expect(projectPointFromHash('x,y')).toBeNull();
    expect(projectPointFromHash(undefined)).toBeNull();
    const p = { lat: -27.123456, lon: -48.987654, alt: 12.34 };
    expect(projectPointToHash(p)).toBe('-27.1235,-48.9877,12.3');
  });
});

describe('estação no link (local=estacao)', () => {
  it('reabre a carta pelas coordenadas do link, sem o catálogo; volta para cidade limpa as chaves', () => {
    const selected = {
      kind: 'station' as const,
      id: '838990',
      site: {
        name: 'Florianopolis-Luz Intl AP (SC)',
        latitude: -27.67,
        longitude: -48.547,
        timeZone: -3,
        elevation: 6.1,
      },
    };
    const state = hashForSite(selected);
    expect(state).toMatchObject({ local: 'estacao', est: '838990', lat: '-27.67' });
    expect(siteFromHash(state)).toEqual(selected);
    // Identificador inválido: volta para a cidade padrão.
    expect(siteFromHash({ ...state, est: 'abc' }).kind).toBe('city');
    const city = hashForSite({
      kind: 'city',
      site: siteFromHash({}).site as never,
      historical: false,
    });
    expect(city).toMatchObject({ est: '', lat: '', nome: '' });
  });
});
