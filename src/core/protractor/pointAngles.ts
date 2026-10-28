/**
 * Ângulos do transferidor para uma direção do céu (decisão 0051): α e β que a direção faz com a
 * fachada, na referência escolhida, como os do sol na spec 01, seção 1.3 ("Ângulos do sol nas
 * mesmas grandezas"). Usados na tabela dos pontos marcados na carta.
 *
 * Validação: pointAngles.test.ts (casos analíticos e a direção sobre a curva de α e a reta de β de
 * protractor.ts, e dentro da máscara de mask.ts com meio grau a mais de proteção).
 */
import { toExternal, type AngleReference, type Side } from './protractor';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
/** Componente na normal abaixo da qual a direção conta como no plano da fachada. */
const IN_PLANE = 1e-12;

export interface DirectionAngles {
  /** Ângulo azimutal relativo ψ, em (−180°, 180°]; positivo à direita de quem olha para fora. */
  psi: number;
  /** A direção está diante da fachada (s_y > 0): só então há α e β. */
  front: boolean;
  /** α na referência dada (externa: ângulo de perfil a partir da horizontal). */
  alpha: number | null;
  /** β na referência dada (externa: |ψ|, a partir da normal). */
  beta: number | null;
  /** Lado de β; null na normal (ψ = 0) ou atrás da fachada. */
  side: Side | null;
}

/**
 * α e β da direção (altura e azimute em graus, azimute a partir do Norte, sentido horário) para a
 * fachada de orientação dada (azimute da normal externa), na referência escolhida. Atrás da
 * fachada, no plano dela e no zênite, não há α nem β (a fachada não vê a direção).
 */
export function directionAngles(
  orientation: number,
  reference: AngleReference,
  altitude: number,
  azimuth: number,
): DirectionAngles {
  const d = (((azimuth - orientation) % 360) + 360) % 360;
  const psi = d > 180 ? d - 360 : d;
  const h = altitude * RAD;
  const sy = Math.cos(h) * Math.cos(psi * RAD);
  const sz = Math.sin(h);
  if (!(sy > IN_PLANE)) return { psi, front: false, alpha: null, beta: null, side: null };
  // Externos: α a partir da horizontal (tan α = s_z / s_y), β a partir da normal (|ψ|). Na
  // interna, 90° menos o externo (decisão 0011): a conta de toExternal, que é a própria inversa.
  const inReference = (external: number) => toExternal(external, reference);
  return {
    psi,
    front: true,
    alpha: inReference(Math.atan2(sz, sy) * DEG),
    beta: inReference(Math.abs(psi)),
    side: psi > 0 ? 'right' : psi < 0 ? 'left' : null,
  };
}
