/**
 * Posição solar pelo NREL SPA (Reda e Andreas, 2004, NREL/TP-560-34302, revisado em 2008).
 *
 * Especificação: docs/spec/02-tempo-e-posicao-solar.md. Convenções: azimute a partir do Norte,
 * sentido horário; ângulo zenital topocêntrico geométrico (sem refração) para toda a geometria;
 * refração opcional, só para conferência e para o caso publicado no relatório.
 * Validação: tests/referencia/posicaoSolar.test.ts (pvlib e caso publicado).
 */
import { DELTA_T_SECONDS, SUNRISE_ALTITUDE } from './constants';
import {
  B0,
  B1,
  L0,
  L1,
  L2,
  L3,
  L4,
  L5,
  NUTATION_ABCD,
  NUTATION_Y,
  R0,
  R1,
  R2,
  R3,
  R4,
} from './spaTables';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

type Term = readonly [number, number, number];

function mod(x: number, m: number): number {
  const r = x % m;
  return r < 0 ? r + m : r;
}

/** Reduz um ângulo em graus a (−180, 180]. */
function wrap180(x: number): number {
  const r = mod(x + 180, 360) - 180;
  return r === -180 ? 180 : r;
}

function series(terms: readonly Term[], jme: number): number {
  let s = 0;
  for (const [a, b, c] of terms) s += a * Math.cos(b + c * jme);
  return s;
}

function polynomial(parts: number[], x: number): number {
  let s = 0;
  for (let i = parts.length - 1; i >= 0; i--) s = s * x + parts[i]!;
  return s;
}

interface Geocentric {
  /** Tempo sideral aparente em Greenwich, graus. */
  nu: number;
  /** Ascensão reta geocêntrica, graus. */
  alpha: number;
  /** Declinação geocêntrica, graus. */
  delta: number;
  /** Distância Terra–Sol, UA. */
  radius: number;
  /** Equação do tempo, minutos. */
  equationOfTime: number;
}

/** Etapas 3.1 a 3.9 do SPA e equação do tempo (A.1), para um instante em ms UTC. */
function geocentric(utcMs: number, deltaT: number): Geocentric {
  const jd = utcMs / 86_400_000 + 2440587.5;
  const jde = jd + deltaT / 86400;
  const jc = (jd - 2451545) / 36525;
  const jce = (jde - 2451545) / 36525;
  const jme = jce / 10;

  const lRad =
    polynomial(
      [
        series(L0, jme),
        series(L1, jme),
        series(L2, jme),
        series(L3, jme),
        series(L4, jme),
        series(L5, jme),
      ],
      jme,
    ) / 1e8;
  const bRad = polynomial([series(B0, jme), series(B1, jme)], jme) / 1e8;
  const radius =
    polynomial(
      [series(R0, jme), series(R1, jme), series(R2, jme), series(R3, jme), series(R4, jme)],
      jme,
    ) / 1e8;

  const theta = mod(lRad * DEG + 180, 360);
  const beta = -bRad * DEG;

  const x = [
    297.85036 + 445267.11148 * jce - 0.0019142 * jce ** 2 + jce ** 3 / 189474,
    357.52772 + 35999.05034 * jce - 0.0001603 * jce ** 2 - jce ** 3 / 300000,
    134.96298 + 477198.867398 * jce + 0.0086972 * jce ** 2 + jce ** 3 / 56250,
    93.27191 + 483202.017538 * jce - 0.0036825 * jce ** 2 + jce ** 3 / 327270,
    125.04452 - 1934.136261 * jce + 0.0020708 * jce ** 2 + jce ** 3 / 450000,
  ] as const;
  let dPsi = 0;
  let dEps = 0;
  for (let i = 0; i < NUTATION_Y.length; i++) {
    const y = NUTATION_Y[i]!;
    const [a, b, c, d] = NUTATION_ABCD[i]!;
    const arg = (y[0] * x[0] + y[1] * x[1] + y[2] * x[2] + y[3] * x[3] + y[4] * x[4]) * RAD;
    dPsi += (a + b * jce) * Math.sin(arg);
    dEps += (c + d * jce) * Math.cos(arg);
  }
  dPsi /= 36_000_000;
  dEps /= 36_000_000;

  const u = jme / 10;
  const eps0 = polynomial(
    [84381.448, -4680.93, -1.55, 1999.25, -51.38, -249.67, -39.05, 7.12, 27.87, 5.79, 2.45],
    u,
  );
  const eps = eps0 / 3600 + dEps;
  const lambda = theta + dPsi - 20.4898 / (3600 * radius);

  const nu0 = mod(
    280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * jc ** 2 - jc ** 3 / 38710000,
    360,
  );
  const nu = nu0 + dPsi * Math.cos(eps * RAD);

  const lr = lambda * RAD;
  const er = eps * RAD;
  const br = beta * RAD;
  const alpha = mod(
    Math.atan2(Math.sin(lr) * Math.cos(er) - Math.tan(br) * Math.sin(er), Math.cos(lr)) * DEG,
    360,
  );
  const delta =
    Math.asin(Math.sin(br) * Math.cos(er) + Math.cos(br) * Math.sin(er) * Math.sin(lr)) * DEG;

  const m =
    280.4664567 +
    360007.6982779 * jme +
    0.03032028 * jme ** 2 +
    jme ** 3 / 49931 -
    jme ** 4 / 15300 -
    jme ** 5 / 2000000;
  let e = mod(m - 0.0057183 - alpha + dPsi * Math.cos(er), 360) * 4;
  if (e > 20) e -= 1440;
  else if (e < -20) e += 1440;

  return { nu, alpha, delta, radius, equationOfTime: e };
}

export interface SolarPosition {
  /** Ângulo zenital topocêntrico geométrico (sem refração), graus. */
  zenith: number;
  /** Altura solar geométrica = 90° − zenith, graus. */
  elevation: number;
  /** Azimute topocêntrico, a partir do Norte, sentido horário, [0, 360). */
  azimuth: number;
  /** Ângulo zenital com refração; igual a zenith se a refração não for pedida. */
  apparentZenith: number;
  /** Ângulo horário local geocêntrico, graus, (−180, 180], positivo à tarde. */
  hourAngle: number;
  /** Declinação geocêntrica, graus. */
  declination: number;
  /** Ascensão reta geocêntrica aparente, graus, [0, 360). */
  rightAscension: number;
  /** Equação do tempo, minutos. */
  equationOfTime: number;
}

export interface SolarPositionOptions {
  /** ΔT em segundos (padrão: 69 s, decisão 0011). */
  deltaT?: number;
  /** Refração atmosférica (pressão em mbar, temperatura em °C); ausente = sem refração. */
  refraction?: { pressure: number; temperature: number };
}

/**
 * Posição do sol num instante UTC (ms desde 1970) para um local (graus; longitude positiva a
 * Leste; elevação em metros).
 */
export function solarPosition(
  utcMs: number,
  latitude: number,
  longitude: number,
  elevation: number,
  options: SolarPositionOptions = {},
): SolarPosition {
  const g = geocentric(utcMs, options.deltaT ?? DELTA_T_SECONDS);
  const h = mod(g.nu + longitude - g.alpha, 360);

  // Paralaxe (3.12 a 3.13).
  const xi = (8.794 / (3600 * g.radius)) * RAD;
  const phi = latitude * RAD;
  const u = Math.atan(0.99664719 * Math.tan(phi));
  const x = Math.cos(u) + (elevation / 6378140) * Math.cos(phi);
  const y = 0.99664719 * Math.sin(u) + (elevation / 6378140) * Math.sin(phi);
  const hr = h * RAD;
  const dr = g.delta * RAD;
  const dAlpha = Math.atan2(
    -x * Math.sin(xi) * Math.sin(hr),
    Math.cos(dr) - x * Math.sin(xi) * Math.cos(hr),
  );
  const deltaPrime = Math.atan2(
    (Math.sin(dr) - y * Math.sin(xi)) * Math.cos(dAlpha),
    Math.cos(dr) - x * Math.sin(xi) * Math.cos(hr),
  );
  const hPrime = hr - dAlpha;

  // Altura e azimute topocêntricos (3.14 a 3.15).
  const e0 =
    Math.asin(
      Math.sin(phi) * Math.sin(deltaPrime) +
        Math.cos(phi) * Math.cos(deltaPrime) * Math.cos(hPrime),
    ) * DEG;
  let eApparent = e0;
  if (options.refraction) {
    const { pressure, temperature } = options.refraction;
    const refract = 0.5667;
    if (e0 >= -(0.26667 + refract)) {
      eApparent +=
        (pressure / 1010) *
        (283 / (273 + temperature)) *
        (1.02 / (60 * Math.tan((e0 + 10.3 / (e0 + 5.11)) * RAD)));
    }
  }
  const gamma = Math.atan2(
    Math.sin(hPrime),
    Math.cos(hPrime) * Math.sin(phi) - Math.tan(deltaPrime) * Math.cos(phi),
  );
  const azimuth = mod(gamma * DEG + 180, 360);

  return {
    zenith: 90 - e0,
    elevation: e0,
    azimuth,
    apparentZenith: 90 - eApparent,
    hourAngle: wrap180(h),
    declination: g.delta,
    rightAscension: g.alpha,
    equationOfTime: g.equationOfTime,
  };
}

export interface SunTimes {
  /** Instantes UTC em ms; NaN quando o sol não nasce ou não se põe (dia ou noite polar). */
  sunrise: number;
  sunset: number;
  transit: number;
}

/**
 * Nascer, pôr e passagem meridiana (SPA, Apêndice A.2) na data civil dada, calculados a partir de
 * 0 h UT dessa data, como no relatório do SPA (e no pvlib).
 */
export function sunTimes(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  deltaT: number = DELTA_T_SECONDS,
): SunTimes {
  const ut0 = Date.UTC(year, month - 1, day);
  const nu = geocentric(ut0, deltaT).nu;
  // Ascensão reta e declinação em 0 h TT dos dias −1, 0 e +1.
  const tt0 = ut0 - deltaT * 1000;
  const prev = geocentric(tt0 - 86_400_000, deltaT);
  const curr = geocentric(tt0, deltaT);
  const next = geocentric(tt0 + 86_400_000, deltaT);

  const phi = latitude * RAD;
  const m0 = mod((curr.alpha - longitude - nu) / 360, 1);
  const cosH0 =
    (Math.sin(SUNRISE_ALTITUDE * RAD) - Math.sin(phi) * Math.sin(curr.delta * RAD)) /
    (Math.cos(phi) * Math.cos(curr.delta * RAD));
  const h0 = Math.abs(cosH0) > 1 ? NaN : mod(Math.acos(cosH0) * DEG, 180);

  const m = [m0, m0 - h0 / 360, m0 + h0 / 360];
  const addDay = m[2]! >= 1;
  const subDay = m[1]! < 0;
  m[1] = mod(m[1]!, 1);
  m[2] = mod(m[2]!, 1);

  const limit = (v: number) => (Math.abs(v) > 2 ? mod(v, 1) : v);
  const a = limit(curr.alpha - prev.alpha);
  const ap = limit(curr.delta - prev.delta);
  const b = limit(next.alpha - curr.alpha);
  const bp = limit(next.delta - curr.delta);
  const c = b - a;
  const cp = bp - ap;

  const out = m.map((mi) => {
    const vs = nu + 360.985647 * mi;
    const n = mi + deltaT / 86400;
    const alphaI = curr.alpha + (n * (a + b + c * n)) / 2;
    const deltaI = curr.delta + (n * (ap + bp + cp * n)) / 2;
    let hp = mod(vs + longitude - alphaI, 360);
    if (hp >= 180) hp -= 360;
    const hAlt =
      Math.asin(
        Math.sin(phi) * Math.sin(deltaI * RAD) +
          Math.cos(phi) * Math.cos(deltaI * RAD) * Math.cos(hp * RAD),
      ) * DEG;
    return { mi, hp, hAlt, deltaI };
  });

  const [t, r, s] = out as [(typeof out)[0], (typeof out)[0], (typeof out)[0]];
  const event = (p: typeof r) =>
    (p.mi +
      (p.hAlt - SUNRISE_ALTITUDE) /
        (360 * Math.cos(p.deltaI * RAD) * Math.cos(phi) * Math.sin(p.hp * RAD))) *
    86400;
  let rise = event(r);
  let set = event(s);
  if (addDay) set += 86400;
  if (subDay) rise -= 86400;
  const transit = (t.mi - t.hp / 360) * 86400;

  return {
    sunrise: Number.isNaN(h0) ? NaN : ut0 + rise * 1000,
    sunset: Number.isNaN(h0) ? NaN : ut0 + set * 1000,
    transit: ut0 + transit * 1000,
  };
}
