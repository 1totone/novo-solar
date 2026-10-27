/**
 * Tempo da radiação de um arquivo (spec 04, seção 4.3): quanto a radiação global vem depois (ou
 * antes) do sol, pelo centróide diário da global nos dias mais claros.
 */
import { REFERENCE_YEAR } from '../solar/constants';
import { solarPosition, sunTimes } from '../solar/spa';
import type { EpwData } from './hourly';

/** Dias mais claros na média: os mesmos 30 do script do catálogo (F4.1). */
export const CLEAR_DAYS = 30;

const RAD = Math.PI / 180;
const MS_PER_HOUR = 3_600_000;

/**
 * Irradiação extraterrestre horizontal do dia (Wh/m², Duffie e Beckman, eq. 1.10.3), só para
 * ordenar os dias pelo índice de claridade diário.
 */
function dailyExtraterrestrial(latitude: number, declination: number, dayOfYear: number): number {
  const phi = latitude * RAD;
  const delta = declination * RAD;
  const x = Math.min(1, Math.max(-1, -Math.tan(phi) * Math.tan(delta)));
  const ws = Math.acos(x);
  const e0 = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
  return (
    (24 / Math.PI) *
    1361 *
    e0 *
    (Math.cos(phi) * Math.cos(delta) * Math.sin(ws) + ws * Math.sin(phi) * Math.sin(delta))
  );
}

const DAY_OF_YEAR_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] as const;

/**
 * Atraso, em minutos, da radiação global do arquivo em relação ao sol (positivo: a radiação vem
 * depois do sol), na média dos `days` dias de maior índice de claridade diário: em cada dia, o
 * centróide da global (cada hora no meio do intervalo, h − 0,5, convenção do EPW) menos a passagem
 * meridiana do SPA em hora legal do fuso do arquivo. Nulo sem radiação global.
 *
 * O script do catálogo compara com o centróide da extraterrestre integrada nas mesmas horas; a
 * passagem meridiana difere dele em menos de 0,2 min, e o teste confere 1 min contra o script.
 */
export function radiationLag(epw: EpwData, days = CLEAR_DAYS): number | null {
  const { latitude, longitude, timeZone } = epw.location;
  const ghi = epw.fields.globalHorizontal;
  const sums = new Map<number, { month: number; day: number; sum: number; moment: number }>();
  for (let i = 0; i < epw.hours; i++) {
    const v = ghi[i]!;
    if (!(v > 0)) continue;
    const month = epw.month[i]!;
    // 29/02 usa o sol de 28/02, como no resto da aplicação (ano de referência sem 29/02).
    const day = month === 2 && epw.day[i] === 29 ? 28 : epw.day[i]!;
    const key = month * 100 + day;
    let s = sums.get(key);
    if (!s) {
      s = { month, day, sum: 0, moment: 0 };
      sums.set(key, s);
    }
    s.sum += v;
    s.moment += v * (epw.hour[i]! - 0.5);
  }
  const ranked = [...sums.values()]
    .map((s) => {
      const noon = Date.UTC(REFERENCE_YEAR, s.month - 1, s.day) + (12 - timeZone) * MS_PER_HOUR;
      const declination = solarPosition(noon, latitude, longitude, 0).declination;
      const h0 = dailyExtraterrestrial(
        latitude,
        declination,
        DAY_OF_YEAR_START[s.month - 1]! + s.day,
      );
      return { ...s, kt: h0 > 0 ? s.sum / h0 : -Infinity };
    })
    .filter((s) => s.kt > -Infinity)
    .sort((a, b) => b.kt - a.kt)
    .slice(0, days);
  if (ranked.length === 0) return null;
  let total = 0;
  for (const s of ranked) {
    const start = Date.UTC(REFERENCE_YEAR, s.month - 1, s.day);
    const transit = sunTimes(REFERENCE_YEAR, s.month, s.day, latitude, longitude).transit;
    const local = ((((transit - start) / MS_PER_HOUR + timeZone) % 24) + 24) % 24;
    total += (s.moment / s.sum - local) * 60;
  }
  return total / ranked.length;
}
