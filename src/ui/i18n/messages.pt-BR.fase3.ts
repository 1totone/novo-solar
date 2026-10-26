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
  'effect.heading': 'Efeito no ano',
  'effect.summary':
    'Horas quentes e frias, radiação bloqueada e admitida e alternativas, pelo clima do arquivo.',
  'effect.needsData':
    'Este passo usa os dados horários do clima (temperatura e radiação direta). Abra no passo 1 um arquivo climático ou os dados históricos da cidade.',
  'effect.pending': 'Calculando o ano…',
  'effect.noWindow':
    'Sem janela no passo 6, as horas com sol na janela são as da fachada do passo 2, sem proteção.',
  'classes.heading': 'Horas quentes e frias',
  'classes.method': 'Como classificar as horas',
  'classes.method.adaptive': 'Faixa adaptativa da ASHRAE 55 (padrão)',
  'classes.method.thresholds': 'Limiares de temperatura',
  'classes.method.balance': 'Temperatura de equilíbrio',
  'classes.acceptability': 'Aceitabilidade',
  'classes.gains': 'Acréscimo por ganhos, ΔT (°C)',
  'classes.gainsHelp':
    'A faixa vale para a temperatura operativa interna. Com ΔT, cada hora é comparada como se o interior estivesse ΔT acima do ar externo. Em casas ocupadas e ventiladas naturalmente, a temperatura interna ficou de 0 a 2,7 °C acima da média externa das horas anteriores em Florianópolis e de 0,2 a 4,0 °C em Curitiba (Papst de Abreu, 2004).',
  'classes.more': 'Mais opções',
  'classes.averaging': 'Temperatura média predominante (t_pma)',
  'classes.averaging.exponential': 'média exponencial',
  'classes.averaging.arithmetic': 'média aritmética',
  'classes.averagingDetail.exponential': 'média exponencial (α = {alpha}, {days} dias)',
  'classes.averagingDetail.arithmetic': 'média aritmética de {days} dias',
  'classes.alpha': 'α (0,6 a 0,9)',
  'classes.days': 'Dias anteriores (7 a 30)',
  'classes.hourTemp': 'Temperatura da hora',
  'classes.hourTemp.mean': 'Média do início e do fim da hora (padrão)',
  'classes.hourTemp.end': 'Fim da hora (o valor do arquivo)',
  'classes.cold': 'Hora fria abaixo de (°C)',
  'classes.hot': 'Hora quente acima de (°C)',
  'classes.thresholdsHelp': 'Deixe um em branco para não ter horas frias ou quentes.',
  'classes.suggest20': 'Usar 20 °C',
  'classes.suggest20Source':
    'Sugestão com fonte: sombrear sempre que o ar passar de 20 °C, critério de Lamberts, Dutra e Pereira (2014, p. 91 e 135) para ambiente sem carga térmica interna; com carga interna, use um limite menor.',
  'classes.balance': 'Temperatura de equilíbrio (°C)',
  'classes.balanceHelp':
    'Temperatura externa acima da qual os ganhos passam a ser excesso: T_eq = T_int − Q / UA. Depende do edifício e não tem valor padrão (não há valor por tipologia com fonte).',
  'classes.invalid': 'Há campos inválidos (em vermelho).',
  'classes.incomplete': 'Digite o valor para classificar as horas.',
  'classes.hypotheses': 'Hipóteses',
  'classes.h1':
    'A classe vem só da temperatura do ar externo, um indicador aproximado da necessidade de sombra: ganhos internos, envoltória, massa térmica, ventilação e o próprio sol na janela não entram.',
  'classes.h2.adaptive':
    'Faixa adaptativa da ASHRAE 55-2023, {acceptability}% de aceitabilidade: conforto = 0,31 · t_pma + 17,8 °C, mais ou menos {half} °C, com t_pma pela {averaging}. A faixa vale para a temperatura operativa interna de ambientes naturalmente condicionados; aqui é comparada com o ar externo, o que tende a subestimar as horas quentes.',
  'classes.h2.gains': 'Acréscimo por ganhos: os limites descem ΔT = {gains} °C.',
  'classes.h2.noGains': 'Sem acréscimo por ganhos (ΔT = 0): a classe é a do ar externo.',
  'classes.h2.thresholds':
    'Limiares: hora fria abaixo de {cold}; quente acima de {hot}; entre eles, neutra.',
  'classes.h2.noLimit': 'sem limite',
  'classes.h2.balance':
    'Temperatura de equilíbrio de {balance} °C: acima, hora quente; abaixo, fria; igual, neutra.',
  'classes.h3':
    'Horas sem classe (t_pma fora da faixa de aplicação da norma, de 10 a 33,5 °C): {count} das {hours} horas com sol na janela.',
  'classes.h4.mean':
    'Temperatura da hora: média do início e do fim da hora, o instante do meio, como o sol e a radiação da hora.',
  'classes.h4.end':
    'Temperatura da hora: a do fim da hora (o valor do arquivo), meia hora depois do sol do meio da hora.',
  'classes.h5':
    'As partes de cada classe são das {hours} horas com sol na janela da fachada a {orientation}° (sem a proteção), contadas e pela radiação direta incidente (DNI · cos θ), e não das 8760 horas do ano: as noites não pesam no sombreamento.',
  'classes.tableCaption':
    'Horas com sol na janela e radiação direta incidente sem proteção (DNI · cos θ, kWh por m² de janela no ano), por classe',
  'classes.col.class': 'Classe',
  'classes.col.hours': 'Horas',
  'classes.col.share': '%',
  'classes.col.radiation': 'kWh/m²',
  'classes.radiationShares': 'Parte da radiação direta das horas com sol na janela',
  'classes.hoursShares': 'Parte das horas com sol na janela',
  'classes.class.hot': 'Quentes',
  'classes.class.neutral': 'Neutras',
  'classes.class.cold': 'Frias',
  'classes.class.none': 'Sem classe',
  'classes.bar': 'Parte de cada classe na radiação direta das horas com sol na janela',
  'classes.barLabel': '{name}: {share}%',
  'classes.missingDni':
    '{count} horas com sol na janela sem radiação direta no arquivo ficam fora das somas.',
  'indicators.heading': 'Radiação direta bloqueada e admitida',
  'indicators.needsGeometry':
    'Descreva a proteção no passo 6 (janela e ao menos uma peça) para calcular a radiação bloqueada e admitida.',
  'indicators.needsClasses':
    'Escolha como classificar as horas (acima) para calcular os indicadores.',
  'indicators.blockedInHot': 'Bloqueada nas horas quentes',
  'indicators.admittedInCold': 'Admitida nas horas frias',
  'indicators.ideal': 'Quanto mais perto de 100%, melhor.',
  'indicators.ofIncident': 'de {incident} kWh/m² que chegariam ao vidro sem a proteção',
  'indicators.undefined': 'sem radiação direta nessas horas',
  'indicators.undefinedValue': 'indefinido',
  'indicators.tableCaption':
    'Radiação direta na janela no ano, por classe de hora (kWh por m² de janela)',
  'indicators.col.incident': 'Sem proteção',
  'indicators.col.admitted': 'Admitida',
  'indicators.col.blocked': 'Bloqueada',
  'indicators.hypotheses':
    'Só a radiação direta: a DNI do arquivo, constante em cada hora, vezes o cosseno do ângulo de incidência e a fração ensolarada da janela (6 instantes por hora). A difusa e a refletida não entram. As horas neutras e sem classe entram só nas somas. Não há um índice único: juntar os dois percentuais exigiria pesar o calor evitado contra o calor perdido, o que depende do edifício.',
  'indicators.missingDni': '{count} horas sem radiação direta no arquivo ficam fora das somas.',
  'alternatives.heading': 'Alternativas',
  'alternatives.intro':
    'Guarde a proteção atual do passo 6 e compare com outras, na mesma fachada, clima e classificação. "Sem proteção" fica sempre na tabela, como referência.',
  'alternatives.name': 'Nome da alternativa',
  'alternatives.save': 'Guardar a proteção atual',
  'alternatives.max': 'Até 6 alternativas.',
  'alternatives.alreadySaved': 'A proteção atual já está guardada como "{name}".',
  'alternatives.tableCaption':
    'Alternativas: radiação direta bloqueada nas horas quentes e admitida nas horas frias',
  'alternatives.col.name': 'Alternativa',
  'alternatives.col.blocked': 'Bloqueada nas quentes',
  'alternatives.col.admitted': 'Admitida nas frias',
  'alternatives.none': 'Sem proteção',
  'alternatives.current': 'Atual (não guardada)',
  'alternatives.notDominated': 'não superada',
  'alternatives.dominatedBy': 'superada por {names}',
  'alternatives.calculating': 'calculando…',
  'alternatives.invalid': 'proteção inválida',
  'alternatives.use': 'Usar no passo 6',
  'alternatives.useLabel': 'Usar "{name}" no passo 6',
  'alternatives.remove': 'Remover',
  'alternatives.removeLabel': 'Remover "{name}"',
  'alternatives.differentWindow':
    'Janela diferente da atual: os percentuais e as somas são por m² de janela.',
  'alternatives.dominanceHelp':
    'Uma alternativa é superada quando outra bloqueia pelo menos o mesmo nas horas quentes e admite pelo menos o mesmo nas frias, com um dos dois maior.',
  'alternatives.plot':
    'Alternativas no plano dos dois percentuais: admitida nas horas frias (horizontal) e bloqueada nas horas quentes (vertical)',
  'alternatives.plotX': 'admitida nas horas frias (%)',
  'alternatives.plotY': 'bloqueada nas horas quentes (%)',
  'alternatives.plotIdeal': 'ideal',
  'sizing.heading': 'Dimensionar pelo período',
  'sizing.intro':
    'Diga quando a janela deve ficar toda à sombra: o programa acha os ângulos que a proteção precisa ter, com o sol que determina cada um, e as dimensões do brise e das aletas que dão esses ângulos.',
  'sizing.start': 'Começar com o verão (21/10 a 21/2, das 9 às 15 h solares)',
  'sizing.from': 'Primeiro dia (dd/mm)',
  'sizing.to': 'Último dia (dd/mm)',
  'sizing.fromHour': 'Da hora',
  'sizing.toHour': 'Até a hora',
  'sizing.timeBase': 'Horas em',
  'sizing.timeBase.solar': 'hora solar verdadeira (a das linhas da carta)',
  'sizing.timeBase.legal': 'hora legal (UTC{timeZone})',
  'sizing.gap': 'Afastamento do brise (m)',
  'sizing.count': 'Lâminas na subdivisão',
  'sizing.optionsHelp':
    'Com afastamento, a altura do brise acima da verga sai do sol mais alto do período (α2), para fechar a fresta. Com mais de uma lâmina, a peça é dividida mantendo os ângulos.',
  'sizing.invalid':
    'Há campos inválidos (em vermelho): dias como 21/12, horas de 0 a 24 (a primeira antes da última), afastamento de 0 ou mais e de 1 a 20 lâminas.',
  'sizing.pending': 'Calculando o período…',
  'sizing.failed': 'Não foi possível dimensionar para este período.',
  'sizing.samples':
    '{sunny} das {total} posições do sol do período (a cada 5 minutos) ficam diante da janela.',
  'sizing.noSun': 'O sol não chega à janela no período: não há o que sombrear.',
  'sizing.anglesCaption':
    'Ângulos exigidos: internos, medidos do plano da fachada (entre parênteses, os externos)',
  'sizing.col.angle': 'Ângulo',
  'sizing.col.value': 'Valor',
  'sizing.col.sample': 'Sol que o determina',
  'sizing.angle.alpha': 'α do brise',
  'sizing.angle.alphaMax': 'α2 do brise afastado',
  'sizing.angle.gammaRight': 'γ do brise, direita',
  'sizing.angle.gammaLeft': 'γ do brise, esquerda',
  'sizing.angle.betaRight': 'β da aleta, direita',
  'sizing.angle.betaLeft': 'β da aleta, esquerda',
  'sizing.angle.finGammaRight': 'γ do topo da aleta, direita',
  'sizing.angle.finGammaLeft': 'γ do topo da aleta, esquerda',
  'sizing.sampleAt': '{date}, {hour}',
  'sizing.overhang': 'Brise horizontal',
  'sizing.overhangDims':
    'Profundidade de {depth} m, {above} m acima da verga, afastamento de {gap} m; prolongamentos de {left} m à esquerda e {right} m à direita.',
  'sizing.setbackSuffices':
    'A verga da parede (recuo do vidro) já sombreia o período: não precisa de brise.',
  'sizing.fins': 'Aletas',
  'sizing.fin':
    'Aleta à {side}: profundidade de {depth} m, prolongamento de {above} m acima da verga.',
  'sizing.finNone': 'Sem sol pela {side} no período: sem aleta desse lado.',
  'sizing.finUseless':
    'Aleta à {side}: não serve para este período. O sol passa quase de frente para a janela (β externo de {beta}), e a aleta teria de ser enorme; use o brise ou encurte o período.',
  'sizing.finSetback': 'A ombreira da parede já sombreia o sol pela {side}: sem aleta desse lado.',
  'sizing.right': 'direita',
  'sizing.left': 'esquerda',
  'sizing.louvers':
    '{count} lâminas horizontais de {chord} m a cada {pitch} m, a primeira {above} m acima da verga.',
  'sizing.finLouvers': '{count} lâminas verticais de {chord} m a cada {pitch} m.',
  'sizing.tooBig':
    'O brise sai grande demais para a janela (o sol fica quase rasante à fachada no período). Encurte o período ou combine outras peças.',
  'sizing.useOverhang': 'Usar o brise no passo 6',
  'sizing.useAll': 'Usar o brise e as aletas no passo 6',
  'sizing.useLouvers': 'Usar as lâminas horizontais no passo 6',
  'sizing.useFinLouvers': 'Usar as lâminas verticais no passo 6',
  'sizing.useAngles': 'Usar os ângulos no passo 3',
  'sizing.useHelp':
    'As peças substituem as do passo 6; os ângulos vão para a sombra total do passo 3, na referência escolhida lá.',
  'sizing.showOnChart': 'Mostrar o período e o sol que determina cada ângulo na carta',
  'sizing.legend': 'período a sombrear',
  'sizing.legendPoints': 'sol que determina cada ângulo',
  'tabs.view3d': 'Vista 3D',
  'view3d.needsWindow':
    'Descreva a janela e as peças no passo 6 ("Proteção pelas dimensões") para ver a proteção em 3D.',
  'view3d.loading': 'Carregando a vista 3D…',
  'view3d.failed':
    'Este navegador não conseguiu abrir a vista 3D (WebGL indisponível). As curvas, o mapa e os indicadores continuam valendo.',
  'view3d.month': 'Dia',
  'view3d.dayOption': '21 de {month}',
  'view3d.hour': 'Hora legal (UTC{timeZone})',
  'view3d.play': 'Animar o dia',
  'view3d.pause': 'Parar',
  'view3d.view': 'Vista',
  'view3d.perspective': 'Perspectiva (gire com o mouse ou o dedo)',
  'view3d.front': 'De frente, de fora da fachada',
  'view3d.status':
    '{date}, {hour}: sol a {altitude}° de altura e {azimuth}° de azimute; {shaded}% da janela à sombra ({sunlit}% ensolarada).',
  'view3d.behind': '{date}, {hour}: sol atrás da fachada; a janela não recebe sol direto.',
  'view3d.night': '{date}, {hour}: sol abaixo do horizonte.',
  'view3d.note':
    'A sombra no vidro é a do cálculo (a mesma das curvas, do mapa e dos indicadores), desenhada em azul-escuro; a luz nas peças e na parede é só ilustrativa.',
  'view3d.label': 'Vista 3D da janela e da proteção. {status}',
} as const;
