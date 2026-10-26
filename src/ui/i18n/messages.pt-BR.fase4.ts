// Textos da Fase 4, em português do Brasil. Separados do catálogo principal só para organização;
// as chaves fazem parte do mesmo catálogo (decisão 0005).
export const fase4PtBR = {
  // F4.3: projeções e linhas horárias (decisão 0025).
  'chartOptions.heading': 'Projeção e linhas horárias',
  'chartOptions.summary':
    'Carta estereográfica, equidistante ou cilíndrica; linhas horárias em hora solar ou legal (analemas).',
  'chartOptions.summaryDefined': '{projection} · {hours}',
  'chartOptions.projection': 'Projeção da carta',
  'chartOptions.projection.stereographic': 'Estereográfica (padrão, como no SOL-AR 6.2)',
  'chartOptions.projection.equidistant': 'Equidistante',
  'chartOptions.projection.cylindrical': 'Cilíndrica (a vista da janela)',
  'chartOptions.projectionShort.stereographic': 'Estereográfica',
  'chartOptions.projectionShort.equidistant': 'Equidistante',
  'chartOptions.projectionShort.cylindrical': 'Cilíndrica',
  'chartOptions.projectionHelp.stereographic':
    'Leva circunferências em circunferências: as curvas do transferidor são arcos, como no método ensinado.',
  'chartOptions.projectionHelp.equidistant':
    'A distância ao centro é proporcional ao ângulo zenital: 1° vale o mesmo em toda a carta. As curvas do transferidor deixam de ser arcos de circunferência e são traçadas ponto a ponto.',
  'chartOptions.projectionHelp.cylindrical':
    'Azimute na horizontal e altura na vertical, com a normal da fachada do passo 2 no centro: a carta muda quando a fachada muda. O zênite é a borda de cima; a escala vertical é o dobro da horizontal.',
  'chartOptions.hourLines': 'Linhas horárias',
  'chartOptions.hourLines.solar': 'Hora solar verdadeira (padrão)',
  'chartOptions.hourLines.legal': 'Hora legal do fuso do arquivo (analemas)',
  'chartOptions.hourLines.both': 'As duas',
  'chartOptions.hoursShort.solar': 'hora solar',
  'chartOptions.hoursShort.legal': 'hora legal',
  'chartOptions.hoursShort.both': 'hora solar e legal',
  'chartOptions.legalHelp':
    'A linha de uma hora legal é o lugar do sol àquela hora do relógio ao longo do ano: um "8" (analema). Em {place}, só pela longitude, a hora solar fica {longitude} min {direction} do relógio; a equação do tempo soma de −14 a +16 min ao longo do ano. Ao meio-dia legal, a hora solar vai de {min} ({minDate}) a {max} ({maxDate}).',
  'chartOptions.behind': 'atrás',
  'chartOptions.ahead': 'à frente',
  'chartOptions.hourLinesLegend': 'Linhas horárias',
  'chartOptions.legendSolar': 'hora solar',
  'chartOptions.legendLegal': 'hora legal (analema)',
  'chartOptions.printScale':
    'Na impressão em escala, o raio pedido no passo 5 é o raio do horizonte nas cartas estereográfica e equidistante e a altura da faixa de 0° a 90° na cilíndrica.',
  'chart.noteProjection.stereographic': 'Projeção estereográfica, Norte para cima.',
  'chart.noteProjection.equidistant':
    'Projeção equidistante, Norte para cima: a distância ao centro é proporcional ao ângulo zenital.',
  'chart.noteProjection.cylindrical':
    'Projeção cilíndrica centrada na normal da fachada ({orientation}°): azimute na horizontal, altura na vertical, zênite na borda de cima.',
  'chart.noteDates':
    'Trajetórias nos solstícios, nos equinócios e no dia 21 dos outros meses, com o mês no poente (jan/nov: 21 de janeiro e 21 de novembro, quase a mesma trajetória);',
  'chart.noteDatesTop':
    'Trajetórias nos solstícios, nos equinócios e no dia 21 dos outros meses, com o mês sobre o ponto mais alto de cada uma (jan/nov: 21 de janeiro e 21 de novembro, quase a mesma trajetória);',
  'chart.noteHours.solar': 'linhas horárias em hora solar verdadeira.',
  'chart.noteHours.legal':
    'linhas horárias em hora legal do fuso do arquivo (analemas: o sol à mesma hora do relógio ao longo do ano).',
  'chart.noteHours.both':
    'linhas horárias em hora solar verdadeira (contínuas) e em hora legal do fuso do arquivo (tracejadas, analemas).',
  'print.scaleRadius': 'Raio da carta: {radius} cm.',
  'print.scaleHeight': 'Altura da carta, de 0° a 90°: {radius} cm.',
} as const;
