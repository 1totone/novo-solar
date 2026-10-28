// Dados gerados por scripts/catalogo/gerar_catalogo.py (F4.1): forma, limites e conferência
// cruzada com as cidades do F2.7 (src/ui/cities.ts), que vieram dos cabeçalhos dos mesmos EPW.
import { describe, expect, it } from 'vitest';
import { CITIES } from '../cities';
import catalogJson from '../data/catalogo/tmyx-brasil.json';
import mapJson from '../data/catalogo/brasil-ufs.json';
import type { Catalog } from './catalog';
import type { UfMap } from './useCatalog';

const catalog = catalogJson as Catalog;
const map = mapJson as unknown as UfMap;
const UFS =
  'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');

describe('catálogo gerado: TMYx 2011-2025 do Brasil', () => {
  const stations = catalog.estacoes;

  it('579 estações, sem identificador repetido, nas 27 UFs', () => {
    expect(stations).toHaveLength(579);
    expect(new Set(stations.map((s) => s.id)).size).toBe(579);
    expect(new Set(stations.map((s) => s.uf))).toEqual(new Set(UFS));
  });

  it('coordenadas, fuso, período e anos dentro dos limites do Brasil e da série', () => {
    for (const s of stations) {
      expect(s.lat, s.nome).toBeGreaterThan(-34);
      expect(s.lat, s.nome).toBeLessThan(6);
      expect(s.lon, s.nome).toBeGreaterThan(-74);
      expect(s.lon, s.nome).toBeLessThan(-28);
      expect([-2, -3, -4, -5]).toContain(s.fuso);
      expect(s.periodo[0]).toBeGreaterThanOrEqual(2011);
      expect(s.periodo[1]).toBeLessThanOrEqual(2025);
      expect(s.anos).toBeGreaterThanOrEqual(5);
      // Garanhuns (819550): o próprio arquivo diz 12 anos em 2011-2021 (11 anos); fica como está,
      // registrado no relatório do F4.1.
      if (s.id !== '819550') expect(s.anos).toBeLessThanOrEqual(s.periodo[1] - s.periodo[0] + 1);
      expect([8760, 8784]).toContain(s.q.horas);
      expect(s.q.tbs[0]).toBeLessThanOrEqual(s.q.tbs[1]);
      expect(s.q.tbs[1]).toBeLessThanOrEqual(s.q.tbs[2]);
    }
  });

  it('link para o arquivo oficial, sem a pasta com acento da Paraíba', () => {
    expect(catalog.base).toBe(
      'https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/',
    );
    for (const s of stations) {
      expect(s.url).toMatch(/^[A-Z]{2}_[A-Za-z_]+\/BRA_[A-Z]{2}_\S+\.\d{6}_TMYx\.2011-2025\.zip$/);
      expect(s.url.endsWith(`.${s.id}_TMYx.2011-2025.zip`)).toBe(true);
    }
    expect(stations.some((s) => s.url.startsWith('PB_Paraiba/'))).toBe(true);
  });

  it('as duas estações só de reanálise (Guarantã do Norte e Urubici)', () => {
    const era5 = stations.filter((s) => s.fonte === 'era5').map((s) => s.id);
    expect(era5.sort()).toEqual(['819790', '869680']);
  });

  it('as cidades do F2.7 estão no catálogo, com as mesmas coordenadas, altitude e fuso', () => {
    const brazil = CITIES.filter((c) => c.sourceUrl.includes('/BRA_Brazil/'));
    expect(brazil.length).toBeGreaterThanOrEqual(14);
    for (const c of brazil) {
      const s = stations.find((x) => c.sourceUrl.endsWith(x.url));
      expect(s, c.name).toBeDefined();
      expect(s!.lat).toBeCloseTo(c.latitude, 3);
      expect(s!.lon).toBeCloseTo(c.longitude, 3);
      expect(s!.alt).toBeCloseTo(c.elevation, 1);
      expect(s!.fuso).toBe(c.timeZone);
    }
  });

  it('mapa: as 27 UFs do Natural Earth, com caminho', () => {
    expect(map.ufs.map((u) => u.uf).sort()).toEqual(UFS);
    for (const u of map.ufs) expect(u.d).toMatch(/^M[-\d.,L]+Z/);
    const [, , w, h] = map.viewBox;
    expect(w).toBeGreaterThan(30);
    expect(h).toBeGreaterThan(30);
  });
});
