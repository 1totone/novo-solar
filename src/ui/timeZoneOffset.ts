/**
 * Deslocamento do fuso para escrever depois de "UTC": "−3", "+5,5"; vazio no fuso 0 ("UTC"), como
 * no painel do local. `minus` preserva o sinal já usado em cada saída (o título da carta usa o
 * hífen do Intl; a impressão, o sinal de menos).
 */
export function timeZoneOffset(
  tz: number,
  format: (value: number, fractionDigits: number) => string,
  minus = '−',
): string {
  if (tz === 0) return '';
  const digits = Number.isInteger(tz) ? 0 : 1;
  return `${tz < 0 ? minus : '+'}${format(Math.abs(tz), digits)}`;
}
