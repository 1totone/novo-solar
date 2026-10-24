/**
 * EPW sintético e válido (8760 horas) para os testes de ponta a ponta. A temperatura de bulbo
 * seco é 20 °C, ou a função dada (mês, dia, hora do arquivo).
 */
export function syntheticEpw(
  location: string,
  dryBulb: (month: number, day: number, hour: number) => number = () => 20,
): string {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const lines = [
    location,
    'DESIGN CONDITIONS,0',
    'TYPICAL/EXTREME PERIODS,0',
    'GROUND TEMPERATURES,0',
    'HOLIDAYS/DAYLIGHT SAVINGS,No,0,0,0',
    'COMMENTS 1,"Arquivo sintético dos testes de ponta a ponta"',
    'COMMENTS 2,""',
    'DATA PERIODS,1,1,Data,Sunday,1/ 1,12/31',
  ];
  const rest =
    '15.0,70,101300,0,1415,380,0,0,0,0,0,0,0,180,2.0,5,3,9999,77777,9,999999999,20,0.1,0,88,0.2,0,1';
  days.forEach((n, m) => {
    for (let d = 1; d <= n; d++) {
      for (let h = 1; h <= 24; h++) {
        lines.push(`2020,${m + 1},${d},${h},60,A7,${dryBulb(m + 1, d, h).toFixed(1)},${rest}`);
      }
    }
  });
  return lines.join('\n') + '\n';
}
