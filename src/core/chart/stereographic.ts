/**
 * Projeção estereográfica da abóbada celeste (docs/spec/03-projecoes.md, seção 3.1).
 * Carta vista de cima, raio unitário no horizonte: x para Leste, y para Norte.
 */

const RAD = Math.PI / 180;

export interface ChartPoint {
  x: number;
  y: number;
}

/** Direção (ângulo zenital e azimute, graus) para o ponto da carta de raio 1. */
export function project(zenith: number, azimuth: number): ChartPoint {
  const r = Math.tan((zenith * RAD) / 2);
  if (r === 0) return { x: 0, y: 0 };
  return { x: r * Math.sin(azimuth * RAD), y: r * Math.cos(azimuth * RAD) };
}

/** Ponto da carta de raio 1 para a direção (ângulo zenital e azimute em [0, 360), graus). */
export function unproject(x: number, y: number): { zenith: number; azimuth: number } {
  const zenith = (2 * Math.atan(Math.hypot(x, y))) / RAD;
  const a = Math.atan2(x, y) / RAD;
  return { zenith, azimuth: a < 0 ? a + 360 : a };
}

/** Raio (carta de raio 1) do círculo de altura solar h, em graus. */
export function altitudeRadius(altitude: number): number {
  return Math.tan(((90 - altitude) * RAD) / 2);
}
