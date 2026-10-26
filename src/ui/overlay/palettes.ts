import type { OverlayQuantity } from '../../core/overlay/overlay';

/**
 * Cores das 5 faixas (decisão 0030). Rampas em OKLCH com um matiz só e luminosidade de 0,92 a 0,52
 * em passos de 0,10 (luminosidade monótona, passos visíveis, matiz único); a faixa mais clara recua
 * para o fundo, como num mapa de calor, e a tabela das células e o cursor dão os valores.
 * Temperatura: divergente azul e vermelho com cinza no meio, com os braços distintos também na
 * protanopia e na deuteranopia (ΔE ≥ 18). Conferidas em tests/acessibilidade/paleta.test.ts.
 */
const BLUE = ['#d4e6fe', '#9dc7fe', '#6ba7f5', '#4d88d3', '#2f69b2'];
const ORANGE = ['#ffdcd0', '#fead90', '#f28057', '#cf6137', '#ad4213'];
const DIVERGING = ['#3872bc', '#74b0ff', '#e5e4e2', '#ff847d', '#b94643'];
/** Frequência de horas acima do limiar. */
export const FREQUENCY_COLORS = ['#ffdbd7', '#ffaba4', '#f97770', '#d55753', '#b33736'];
export const FREQUENCY_LIMITS = [0.2, 0.4, 0.6, 0.8];

export const QUANTITY_COLORS: Record<OverlayQuantity, string[]> = {
  dryBulb: DIVERGING,
  relativeHumidity: BLUE,
  globalHorizontal: ORANGE,
  directNormal: ORANGE,
  diffuseHorizontal: ORANGE,
};
