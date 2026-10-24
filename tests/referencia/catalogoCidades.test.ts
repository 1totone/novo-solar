// Catálogo de cidades da aplicação contra as referências do F2.7:
// - docs/validacao/casos/epw/catalogo-cidades.json (cabeçalho dos EPWs TMYx, livro de 1998);
// - docs/validacao/casos/epw/manifesto.json (EPWs de teste, para os links antigos continuarem iguais);
// - docs/validacao/casos/solar-6.2/radiacao-csv.json (atraso da radiação dos dados históricos).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITIES, DEFAULT_CITY } from '../../src/ui/cities';

const json = <T>(path: string) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf-8')) as T;

interface CatalogEntry {
  id: string;
  nome: string;
  tmyx: {
    url: string;
    estacao: string;
    wmo: string;
    latitude: number;
    longitude: number;
    fuso: number;
    elevacao: number;
  };
  solar_6_2: {
    arquivo: string;
    livro_1998?: { periodo_registros: [number, number]; diferenca_tmyx_graus: number };
  } | null;
}
const catalog = json<{ cidades: CatalogEntry[] }>('docs/validacao/casos/epw/catalogo-cidades.json');
const manifest = json<{
  arquivos: {
    id: string;
    latitude: number;
    longitude: number;
    elevacao: number;
    fuso: number;
    url: string;
  }[];
}>('docs/validacao/casos/epw/manifesto.json');
const radiation = json<{
  arquivos: Record<
    string,
    {
      atraso_radiacao_min: number;
      global: { horas_com_global_sem_sol: number; horas_com_global_maior_que_extra: number };
    }
  >;
}>('docs/validacao/casos/solar-6.2/radiacao-csv.json');

describe('catálogo de cidades', () => {
  it('tem as 15 cidades do SOL-AR 6.2 e Manaus, na ordem do catálogo, com Florianópolis por padrão', () => {
    expect(CITIES.map((c) => c.id)).toEqual(catalog.cidades.map((c) => c.id));
    expect(CITIES.filter((c) => c.historical)).toHaveLength(15);
    expect(DEFAULT_CITY.id).toBe('florianopolis');
  });

  it.each(catalog.cidades)('$id: coordenadas, fuso, elevação e link do TMYx', (ref) => {
    const city = CITIES.find((c) => c.id === ref.id)!;
    expect(city.name).toBe(ref.nome);
    expect([city.latitude, city.longitude, city.elevation, city.timeZone]).toEqual([
      ref.tmyx.latitude,
      ref.tmyx.longitude,
      ref.tmyx.elevacao,
      ref.tmyx.fuso,
    ]);
    expect(city.sourceUrl).toBe(ref.tmyx.url);
    expect(city.station).toBe(ref.tmyx.estacao);
    expect(city.wmo).toBe(ref.tmyx.wmo);
  });

  it.each(catalog.cidades.filter((c) => c.solar_6_2))(
    '$id: dados históricos do 6.2 (arquivo, período e atraso da radiação)',
    (ref) => {
      const historical = CITIES.find((c) => c.id === ref.id)!.historical!;
      expect(historical.file).toBe(ref.solar_6_2!.arquivo);
      expect(
        existsSync(
          new URL(`../../docs/validacao/casos/solar-6.2/${historical.file}`, import.meta.url),
        ),
      ).toBe(true);
      const book = ref.solar_6_2!.livro_1998;
      if (book) {
        expect(historical.kind).toBe('try');
        expect(historical.period).toEqual(book.periodo_registros);
        // A estação das TRY (livro) é a mesma do TMYx: as coordenadas da cidade valem para os dois.
        expect(book.diferenca_tmyx_graus).toBeLessThan(0.03);
      } else {
        expect(historical.kind).toBe('iwec');
        expect(historical.period).toBeUndefined();
      }
      const analysis = radiation.arquivos[historical.file]!;
      // "+ 0" troca -0 por 0 (Math.round(-0,5) é -0).
      expect(historical.radiationLagMin).toBe(Math.round(analysis.atraso_radiacao_min) + 0);
      expect(historical.inconsistentGlobalHours).toBe(
        analysis.global.horas_com_global_sem_sol + analysis.global.horas_com_global_maior_que_extra,
      );
    },
  );

  it('os locais de teste anteriores continuam com o mesmo id e os mesmos valores', () => {
    for (const a of manifest.arquivos) {
      const city = CITIES.find((c) => c.id === a.id)!;
      expect([city.latitude, city.longitude, city.elevation, city.timeZone]).toEqual([
        a.latitude,
        a.longitude,
        a.elevacao,
        a.fuso,
      ]);
      expect(city.sourceUrl).toBe(a.url);
    }
  });
});
