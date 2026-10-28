/**
 * Velocidade do vento a outra altura e sobre outro terreno (F4.4): perfil de lei de potência da
 * ASHRAE (Handbook of Fundamentals 2005, capítulo 16), como no EnergyPlus (Engineering Reference,
 * seção 3.5.4.2, equação 3.84):
 *
 *   V_z = V_met · (δ_met / z_met)^α_met · (z / δ)^α = k · V_met
 *
 * Especificação: docs/spec/06-vento.md, seção 6.7. Validação: tests/referencia/ventoAvancado.test.ts
 * (EnergyPlus 26.2.0) e windProfile.test.ts.
 */

export type TerrainKey = 'country' | 'suburbs' | 'city' | 'ocean';

export interface ProfileCoefficients {
  /** Expoente α do perfil. */
  exponent: number;
  /** Espessura da camada limite δ (m). */
  boundaryLayer: number;
}

/**
 * Tabela 3.4 da Engineering Reference (ASHRAE Fundamentals 2005), pelo campo Terrain do objeto
 * Building: Country, Suburbs (Urban tem os mesmos valores), City e Ocean.
 */
export const TERRAIN: Record<TerrainKey, ProfileCoefficients> = {
  country: { exponent: 0.14, boundaryLayer: 270 },
  suburbs: { exponent: 0.22, boundaryLayer: 370 },
  city: { exponent: 0.33, boundaryLayer: 460 },
  ocean: { exponent: 0.1, boundaryLayer: 210 },
};

/** Estação meteorológica nos padrões do Site:WeatherStation do EnergyPlus: 10 m, campo aberto. */
export const STATION = { height: 10, terrain: 'country' } as const satisfies {
  height: number;
  terrain: TerrainKey;
};

/** Alturas aceitas (m): o limite de cima fica abaixo da menor δ da tabela (210 m). */
export const HEIGHT_RANGE = { min: 1, max: 200 } as const;

/** Fator k entre a velocidade à altura z (m) sobre o terreno dado e a da estação. */
export function windSpeedFactor(height: number, terrain: TerrainKey): number {
  if (!(height >= HEIGHT_RANGE.min && height <= HEIGHT_RANGE.max)) {
    throw new RangeError(`height must be within ${HEIGHT_RANGE.min} and ${HEIGHT_RANGE.max} m`);
  }
  // A própria estação: exatamente 1, para que velocidades nas fronteiras das classes não mudem.
  if (terrain === STATION.terrain && height === STATION.height) return 1;
  const met = TERRAIN[STATION.terrain];
  const site = TERRAIN[terrain];
  return (
    Math.pow(met.boundaryLayer / STATION.height, met.exponent) *
    Math.pow(height / site.boundaryLayer, site.exponent)
  );
}
