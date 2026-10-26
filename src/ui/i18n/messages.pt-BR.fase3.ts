// Textos da Fase 3 (passos 6 e 7 e vista 3D), em português do Brasil. Separados do catálogo
// principal só para organização; as chaves fazem parte do mesmo catálogo (decisão 0005).
export const fase3PtBR = {
  'advanced.group': 'Avançado: proteção pelas dimensões e efeito no ano',
  'advanced.badge': 'avançado',
  'geometry.heading': 'Proteção pelas dimensões',
  'geometry.summary': 'Janela, brise, aletas e lâminas em metros; corte, vista e sombra na carta.',
  'geometry.summaryDefined': 'Janela de {width} × {height} m · {pieces}',
  'geometry.piecesCount': '{count} peça(s)',
  'geometry.noPieces': 'sem peças',
  'geometry.start': 'Começar com uma janela de 1,20 × 1,00 m',
  'geometry.intro':
    'Descreva a janela e as peças pelas dimensões. O cálculo usa a geometria exata (placas finas diante do vidro) e é o que conferimos contra o EnergyPlus.',
  'geometry.window': 'Janela',
  'geometry.width': 'Largura da janela (m)',
  'geometry.height': 'Altura da janela (m)',
  'geometry.setback': 'Recuo do vidro (m)',
  'geometry.setbackHelp':
    'Distância do vidro ao plano externo da fachada (parede espessa). As peças são medidas a partir desse plano.',
  'geometry.windowInvalid':
    'Use números positivos para a largura e a altura, e zero ou mais para o recuo.',
  'geometry.pieces': 'Peças',
  'geometry.addType': 'Tipo de peça',
  'geometry.add': 'Adicionar peça',
  'geometry.maxPieces': 'Até 9 peças.',
  'geometry.remove': 'Remover',
  'geometry.removeLabel': 'Remover a peça {n}, {name}',
  'geometry.pieceLegend': '{n}. {name}',
  'geometry.piecesInvalid':
    'Há campos inválidos (em vermelho); a peça só entra no desenho e no cálculo quando todos estão certos.',
  'geometry.sidesHelp':
    'Esquerda e direita de quem está dentro olhando para fora. Prolongamento infinito: digite i ou ∞.',
  'geometry.type.b': 'Brise horizontal',
  'geometry.type.ad': 'Aleta à direita',
  'geometry.type.ae': 'Aleta à esquerda',
  'geometry.type.lh': 'Lâminas horizontais',
  'geometry.type.lv': 'Lâminas verticais',
  'geometry.field.depth': 'Profundidade (m)',
  'geometry.field.above.b': 'Altura acima da verga (m)',
  'geometry.field.above.lh': 'Altura da 1ª lâmina acima da verga (m)',
  'geometry.field.gap': 'Afastamento da fachada (m)',
  'geometry.field.extendLeft': 'Prolongamento à esquerda (m)',
  'geometry.field.extendRight': 'Prolongamento à direita (m)',
  'geometry.field.offset': 'Distância da lateral da janela (m)',
  'geometry.field.extendAbove': 'Prolongamento acima da verga (m)',
  'geometry.field.extendBelow': 'Prolongamento abaixo do peitoril (m)',
  'geometry.field.count': 'Número de lâminas',
  'geometry.field.chord': 'Largura de cada lâmina (m)',
  'geometry.field.pitch': 'Distância entre lâminas (m)',
  'geometry.field.angle.lh': 'Inclinação (°, + borda externa para baixo)',
  'geometry.field.angle.lv': 'Rotação (°, + borda externa para a direita)',
  'geometry.field.start': 'Posição da 1ª lâmina a partir da lateral esquerda (m)',
  'geometry.drawingTitle':
    'Corte pelo meio da janela e vista de fora: janela de {width} × {height} m, {pieces}',
  'geometry.section': 'Corte (meio da janela)',
  'geometry.elevation': 'Vista de fora',
  'geometry.elevationHelp':
    'Na vista de fora, o lado direito de quem está dentro aparece à esquerda do desenho.',
  'geometry.angle.alpha': 'α {value}°',
  'geometry.angle.gammaRight': 'γ dir. {value}°',
  'geometry.angle.gammaLeft': 'γ esq. {value}°',
  'geometry.anglesHelp':
    'α do peitoril, no vidro, à aresta externa do brise; γ do canto inferior do mesmo lado à ponta do brise (ângulos internos, medidos do plano da fachada).',
  'geometry.scale': 'Escala do desenho exportado e impresso',
  'geometry.export': 'Exportar corte e vista (SVG)',
  'geometry.exportHelp':
    'O SVG sai com o tamanho real na escala escolhida ({width} × {height} cm). A impressão do passo 5 pode incluir os dois desenhos.',
  'geometry.printTitle': 'Corte e vista da proteção, escala 1:{scale}',
  'outputs.includeGeometry': 'Corte e vista da proteção (passo 6), na escala do desenho',
  'shading.heading': 'Na carta',
  'shading.noPlates':
    'Adicione uma peça (ou um recuo do vidro) para ver na carta a sombra que a proteção faz.',
  'shading.showContours': 'Curvas de 0, 25, 50, 75 e 100% da janela à sombra',
  'shading.contoursHelp':
    'Cada curva liga as posições do sol em que a mesma parte da janela fica à sombra; dentro da curva de 100% (área sombreada), a janela inteira está à sombra. Calculado pela geometria exata das peças, para a orientação do passo 2.',
  'shading.showPoint': 'Máscara de um ponto da janela',
  'shading.pointX': 'x: da lateral esquerda (m)',
  'shading.pointZ': 'z: acima do peitoril (m)',
  'shading.pointHelp':
    'Posições do sol em que o ponto fica à sombra (hachura violeta na carta). x é medido da lateral esquerda de quem está dentro olhando para fora; na vista de fora, o ponto aparece marcado. Clique na vista para escolher outro ponto.',
  'shading.pointInvalid':
    'O ponto precisa estar na janela: x de 0 a {width} m e z de 0 a {height} m.',
  'shading.pending': 'Calculando as curvas da proteção…',
  'shading.failed':
    'Não foi possível calcular as curvas desta proteção. Confira as peças do passo 6; a máscara de um ponto continua valendo.',
  'shading.legend': 'Proteção pelas dimensões (passo 6)',
  'shading.legendContours': 'curvas do percentual da janela à sombra',
  'shading.legendFull': 'janela inteira à sombra (100%)',
  'shading.legendPoint': 'ponto x = {x} m, z = {z} m à sombra',
  'shading.pointMarker': 'Ponto da máscara: x = {x} m, z = {z} m',
  'annual.heading': 'Sombra ao longo do ano',
  'annual.intro':
    'Percentual da janela à sombra em cada mês e hora, nos instantes com sol na janela (média dos dias do mês). Cada mês tem a sua linha: na carta, meses como janeiro e novembro dividem a mesma trajetória.',
  'annual.hypotheses':
    'Hora legal (UTC{timeZone}), sem horário de verão, como no arquivo climático: a coluna 9 é das 8 às 9 h. Sol a cada 10 minutos (6 instantes por hora), pelo SPA. Só a geometria: não considera nuvens nem o clima.',
  'annual.needsPieces':
    'Adicione uma peça (ou um recuo do vidro) para ver a sombra ao longo do ano.',
  'annual.pending': 'Calculando o mapa do ano…',
  'annual.failed': 'Não foi possível calcular o mapa desta proteção. Confira as peças.',
  'annual.mapTitle':
    'Mapa mês × hora da janela à sombra com sol na janela: {place}, fachada a {orientation}°, {pieces}',
  'annual.hourAxis': 'hora legal (UTC{timeZone})',
  'annual.monthsLong':
    'janeiro,fevereiro,março,abril,maio,junho,julho,agosto,setembro,outubro,novembro,dezembro',
  'annual.cell':
    '{month}, {from} a {to} h: {shaded}% da janela à sombra; sol na janela em {exposure}% da hora',
  'annual.cellNoSun': '{month}, {from} a {to} h: sem sol na janela',
  'annual.legend': 'Janela à sombra, com sol na janela',
  'annual.range': '{from} a {to}%',
  'annual.noSun': 'sem sol na janela',
  'annual.table': 'Tabela do mapa',
  'annual.tableCaption':
    'Percentual da janela à sombra com sol na janela, por mês e hora legal (a coluna 9 é das 8 às 9 h). Célula vazia: sem sol na janela.',
  'annual.month': 'Mês',
  'annual.exportSvg': 'Exportar o mapa (SVG)',
  'annual.exportCsv': 'Exportar o mapa (CSV)',
  'annual.exportHourly': 'Exportar hora a hora (CSV, 8760 h)',
  'annual.csvMap': 'mapa mês × hora da janela à sombra',
  'annual.csvHourly': 'fração ensolarada hora a hora',
  'annual.csvGeometry':
    'Fachada a {orientation}°; janela de {width} × {height} m, recuo do vidro {setback} m; {pieces}',
  'annual.csvLink': 'Configuração (link): {url}',
  'annual.csvHypotheses':
    'Hora legal do arquivo, sem horário de verão; a hora h é o intervalo de h - 1 a h; 6 instantes por hora, no meio de cada intervalo de 10 min; sol pelo SPA; só a geometria (spec 07, seção 7.6).',
} as const;
