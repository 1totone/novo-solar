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
  // F4.4: vento avançado (decisão 0027).
  'wind.more': 'Mais opções: condição térmica, altura e terreno',
  'wind.thermal': 'Condição térmica',
  'wind.thermal.all': 'Todas as horas',
  'wind.thermal.hot': 'Quentes',
  'wind.thermal.cold': 'Frias',
  'wind.thermal.neutral': 'Neutras',
  'wind.titleThermal.hot': 'horas quentes',
  'wind.titleThermal.cold': 'horas frias',
  'wind.titleThermal.neutral': 'horas neutras',
  'wind.titleCorrection': 'a {height} m, {terrain}',
  'wind.thermalMethod':
    'Horas quentes e frias pela temperatura do ar externo, com o método do passo 7 (Efeito no ano): {method} Temperatura da hora: {mode}.',
  'wind.method.threshold20':
    'limiar de 20 °C, de Lamberts, Dutra e Pereira (2014): acima, quente; abaixo, fria; em 20 °C, neutra.',
  'wind.method.thresholds': 'limiares digitados: {cold}; {hot}.',
  'wind.method.adaptive':
    'faixa adaptativa da ASHRAE 55, {acceptability}% de aceitabilidade{gains}.',
  'wind.method.gains': ', com acréscimo por ganhos ΔT = {gains} °C',
  'wind.method.balance': 'temperatura de equilíbrio de {balance} °C.',
  'wind.hourTemp.mean': 'média do início e do fim da hora, meia hora antes do vento do arquivo',
  'wind.hourTemp.end': 'a do fim da hora, o mesmo instante do vento do arquivo',
  'wind.thermalCounts': 'No arquivo: {hot} horas quentes, {cold} frias e {neutral} neutras{none}.',
  'wind.thermalNone': ', e {count} sem classe, fora dos filtros',
  'wind.thermalWhere': 'O método se muda no passo 7, na aba Carta solar.',
  'wind.thermalUnavailable':
    'O método do passo 7 (Efeito no ano, na aba Carta solar) está incompleto ou tem um campo inválido: complete-o para filtrar as horas pela condição térmica.',
  'wind.thermalNotApplied':
    'O filtro pela condição térmica não está aplicado: o método do passo 7 (Efeito no ano, na aba Carta solar) está incompleto ou tem um campo inválido.',
  'wind.height': 'Altura acima do solo (m)',
  'wind.heightHelp': 'De 1 a 200 m; em branco, 10 m, a altura da estação.',
  'wind.heightInvalid':
    'Altura fora da faixa (de 1 a 200 m): a rosa mostra o vento da estação, sem correção.',
  'wind.terrain': 'Terreno em volta',
  'wind.terrain.country': 'Campo aberto',
  'wind.terrain.suburbs': 'Subúrbio',
  'wind.terrain.city': 'Cidade',
  'wind.terrain.ocean': 'Água',
  'wind.terrainShort.country': 'campo aberto',
  'wind.terrainShort.suburbs': 'subúrbio',
  'wind.terrainShort.city': 'cidade',
  'wind.terrainShort.ocean': 'água',
  'wind.terrainHelp.country':
    'Campo plano e aberto, como em volta da estação (Country no EnergyPlus; α = 0,14, δ = 270 m).',
  'wind.terrainHelp.suburbs':
    'Subúrbio, campo rugoso ou arborizado (Suburbs no EnergyPlus; Urban tem os mesmos valores; α = 0,22, δ = 370 m).',
  'wind.terrainHelp.city': 'Cidade (City no EnergyPlus; α = 0,33, δ = 460 m).',
  'wind.terrainHelp.ocean':
    'Vento que chega sobre a água (Ocean no EnergyPlus; α = 0,10, δ = 210 m).',
  'wind.factor':
    'A {height} m sobre {terrain}, a velocidade é k = {factor} vezes a da estação (perfil de lei de potência da ASHRAE, o mesmo do EnergyPlus; a estação fica a 10 m, em campo aberto).',
  'wind.correctionWarning':
    'Velocidade levada a {height} m sobre {terrain} pelo perfil médio da ASHRAE, como no EnergyPlus (k = {factor}): a direção continua a da estação, e os edifícios e a vegetação em volta (proteção, canalização, esteira) não entram.',
  'csv.thermal': 'Condição térmica: {thermal}. {method}',
  'csv.thermalAll': 'Condição térmica: todas as horas',
  'csv.correction':
    'Velocidade a {height} m sobre {terrain}: k = {factor} vezes a da estação (perfil de lei de potência da ASHRAE, como no EnergyPlus; estação a 10 m em campo aberto)',
  'csv.noCorrection': 'Velocidade da estação, sem correção de altura e terreno',
  'wind.emptyFilter': 'Nenhuma hora válida nesta condição e neste período: a rosa fica vazia.',
  // F4.7: arquivo de projeto e link (decisão 0028).
  'project.heading': 'Projeto',
  'project.save': 'Salvar projeto',
  'project.open': 'Abrir projeto',
  'project.copyLink': 'Copiar link',
  'project.help':
    'O link guarda a análise: local, fachada, proteção, dados, opções e passos 6 e 7. O projeto (.json) guarda também o arquivo climático carregado do computador e as opções de impressão. Nada é enviado pela internet.',
  'project.helpFile': 'Com {file}, o projeto terá cerca de {size} MB.',
  'project.saved': 'Projeto salvo: {file}.',
  'project.opened': 'Projeto aberto: {file}, salvo em {date}{climate}.',
  'project.openedClimate': ', com o arquivo climático {name}',
  'project.unknownDate': 'data desconhecida',
  'project.notProject': 'O arquivo {file} não é um projeto do SOL-AR; nada mudou.',
  'project.newer':
    'O projeto {file} foi salvo numa versão mais nova da aplicação (esquema {schema}); nada mudou. Use a versão mais nova do SOL-AR para abri-lo.',
  'project.invalid': 'O projeto {file} está incompleto ou foi alterado ({field}); nada mudou.',
  'project.field.schema': 'versão do esquema',
  'project.field.state': 'estado da análise',
  'project.field.climateFile': 'arquivo climático',
  'project.field.compareClimateFile': 'arquivo climático da comparação',
  'project.climateError':
    'O arquivo climático do projeto {file} não pôde ser lido; nada mudou. {error}',
  'project.linkCopied': 'Link copiado.',
  'project.linkManual': 'Não foi possível copiar: selecione e copie o link abaixo.',
  'project.linkLabel': 'Link deste estado',
  // F4.6: idiomas (decisão 0029).
  'language.label': 'Idioma',
  'sides.rightShort': 'd',
  'sides.leftShort': 'e',
  'period.sameMonth': '{from} a {to}/{month}',
  'period.twoMonths': '{from}/{fromMonth} a {to}/{toMonth}',
  'sizing.solarHour': '{hour} solar',
  'csv.separator': 'Separador: vírgula; decimal: ponto.',

  // F4.8: ajuda e exemplos resolvidos (decisão 0032).
  'help.open': 'Ajuda',
  'help.title': 'Ajuda',
  'help.close': 'Fechar a ajuda',
  'help.sections': 'Partes da ajuda',
  'help.section.guia': 'Guia rápido',
  'help.section.exemplos': 'Exemplos',
  'help.section.exercicios': 'Exercícios',
  'help.section.glossario': 'Glossário',
  'help.section.perguntas': 'Perguntas',
  'help.section.hipoteses': 'Hipóteses',
  'help.guide.steps': 'O caminho básico',
  'help.guide.advanced': 'Avançado (recolhido abaixo do passo 5)',
  'help.guide.tabs': 'Abas',
  'help.guide.tips': 'Dicas',
  'help.example.open': 'Abrir o exemplo numa nova aba',
  'help.example.steps': 'Passo a passo',
  'help.example.lesson': 'O que aprender',
  'example.label': 'Exemplo resolvido {n} de {total}',
  'example.close': 'Fechar o exemplo',
  'example.more': 'Ver o exemplo na ajuda',
  // F4.5: tutorial guiado e exercícios de máscara (decisão 0033).
  'tutorial.start': 'Começar o tutorial guiado numa nova aba',
  'tutorial.label': 'Tutorial, etapa {n} de {total}',
  'tutorial.done': 'Feito.',
  'tutorial.doIt': 'Fazer por mim',
  'tutorial.previous': 'Anterior',
  'tutorial.next': 'Próxima',
  'tutorial.finish': 'Concluir o tutorial',
  'tutorial.close': 'Sair do tutorial',
  'exercise.open': 'Abrir o exercício numa nova aba',
  'exercise.howTo': 'Como fazer',
  'exercise.metric': 'Como a coincidência é medida',
  'exercise.label': 'Exercício {n} de {total}',
  'exercise.drawn': 'Polígonos desenhados: {count}.',
  'exercise.startDrawing': 'Começar a desenhar',
  'exercise.check': 'Conferir',
  'exercise.redo': 'Apagar o desenho e tentar de novo',
  'exercise.close': 'Sair do exercício',
  'exercise.pending': 'Conferindo…',
  'exercise.failed': 'Não foi possível conferir o desenho.',
  'exercise.shape': 'Coincidência com a máscara calculada: {value}%',
  'exercise.good': 'A máscara coincide com a calculada.',
  'exercise.almost': 'Quase: veja as diferenças na carta.',
  'exercise.retry': 'Confira as curvas do transferidor e desenhe de novo.',
  'exercise.missed': 'Sombra que faltou: {value}% da máscara calculada.',
  'exercise.extra': 'Sombra a mais: {value}% do tamanho da máscara calculada.',
  'exercise.sun': 'Coincidência nas horas de sol do ano: {value}%.',
  'exercise.legend': 'Na carta, a hachura preta é a máscara calculada; o vermelho, o seu desenho.',
  'exercise.orientationChanged':
    'A orientação mudou: a comparação continua com a fachada a {orientation}°, a do exercício.',
  'mask.answer': 'máscara calculada (resposta do exercício)',
  // F4.1: catálogo nacional de estações (decisão 0034).
  'catalog.heading': 'Catálogo nacional: {count} estações (TMYx 2011 a 2025)',
  'catalog.intro':
    'Estações do Brasil com arquivo TMYx 2011 a 2025 no Climate.OneBuilding.org, com os dados de cada arquivo e a qualidade conferida por nós. O arquivo é baixado do site oficial e carregado aqui.',
  'catalog.loading': 'Carregando o catálogo…',
  'catalog.failed': 'Não foi possível abrir o catálogo.',
  'catalog.search': 'Procurar estação (cidade, aeroporto ou UF)',
  'catalog.resultsLabel': 'Estações encontradas',
  'catalog.results': '{count} estações encontradas.',
  'catalog.noResults': 'Nenhuma estação com esse nome.',
  'catalog.more': 'E mais {count}: refine a busca.',
  'catalog.years': '{count} anos',
  'catalog.point': 'Local da obra (opcional)',
  'catalog.pointHelp':
    'Clique no mapa ou digite as coordenadas para ver as estações mais próximas, com a distância e o desnível.',
  'catalog.pointLat': 'Latitude (°, negativa ao Sul)',
  'catalog.pointLon': 'Longitude (°, negativa a Oeste)',
  'catalog.pointAlt': 'Altitude (m)',
  'catalog.pointUseCurrent': 'Usar o local atual',
  'catalog.pointClear': 'Limpar o local da obra',
  'catalog.nearest': 'Estações mais próximas do local da obra',
  'catalog.distance': 'a {km} km',
  'catalog.dzAbove': '{m} m acima',
  'catalog.dzBelow': '{m} m abaixo',
  'catalog.map': 'Mapa das estações do catálogo. Clique para marcar o local da obra.',
  'catalog.mapCredit': 'Mapa: Natural Earth (domínio público). Estações: Climate.OneBuilding.org.',
  'station.option': 'Estação: {name}',
  'station.source':
    'Estação {name} ({uf}), arquivo TMYx 2011 a 2025 do Climate.OneBuilding.org (medições do NCEI ISD e radiação do ERA5); nenhum dado horário aberto.',
  'station.sourceEra5':
    'Ponto {name} ({uf}), arquivo TMYx 2011 a 2025 do Climate.OneBuilding.org feito só com a reanálise ERA5; nenhum dado horário aberto.',
  'station.download': 'Baixar o arquivo desta estação (Climate.OneBuilding.org)',
  'station.downloadHelp': 'Descompacte o arquivo baixado e carregue o .epw no campo acima.',
  'station.period': '{start} a {end} ({years} anos de dados)',
  'station.quality': 'Qualidade do arquivo',
  'station.q.missing': 'valores ausentes: {count}',
  'station.q.calm': 'calmaria: {pct}% das horas',
  'station.q.kt':
    'horas com índice de claridade acima de 0,8 (radiação global alta demais para o céu): {count}',
  'station.q.closure':
    'fechamento GHI = DNI · cos z + DHI: em 95% das horas de sol, diferença de até {wh} Wh/m²',
  'station.q.radiation': 'radiação no ano: global {ghi}, direta normal {dni} e difusa {dhi} kWh/m²',
  'station.q.temperature': 'temperatura: mínima {min}, média {mean} e máxima {max} °C',
  'station.warnReanalysis': 'Só reanálise (ERA5): o arquivo não tem dados medidos numa estação.',
  'station.warnFewYears':
    'Só {years} anos de dados: o ano típico representa menos o clima do lugar.',
  'station.warnFar': 'A estação fica a {km} km do local da obra.',
  'station.warnLagLate':
    'A radiação do arquivo vem cerca de {minutes} min depois do sol (dias claros): as células de radiação e os indicadores do passo 7 usam a radiação como está no arquivo.',
  'station.warnLagEarly':
    'A radiação do arquivo vem cerca de {minutes} min antes do sol (dias claros): as células de radiação e os indicadores do passo 7 usam a radiação como está no arquivo.',
  'station.q.lag':
    'tempo da radiação em relação ao sol, nos dias claros: {minutes} min (positivo: depois do sol; incerteza de até cerca de 10 min, pelas nuvens)',
  'station.warnAbove':
    'A estação fica {m} m acima do local da obra: a temperatura e o vento podem ser diferentes.',
  'station.warnBelow':
    'A estação fica {m} m abaixo do local da obra: a temperatura e o vento podem ser diferentes.',
  'station.warnUf': 'O nome do arquivo diz {fileUf}, mas as coordenadas caem em {uf}.',
  'station.futureLabel': 'Arquivos futuros',
  'station.future':
    'Há arquivos futuros para esta estação (BrazFuture, LabEEE e INPE: anos 2010, 2050 e 2090, dois cenários, seis modelos), sob a licença CC BY 4.0.',
  'station.futureLink': 'Baixar no Zenodo',
  'print.sourceStation':
    'Coordenadas da estação {station} (TMYx 2011 a 2025, Climate.OneBuilding.org).',
  // Comparação de climas (F4.2): diferença B − A na mesma carta.
  'difference.toggle': 'Diferença B − A na mesma carta',
  'difference.title': 'Diferença B − A',
  'difference.note':
    'Cada célula mostra a média das horas de B menos a de A, na mesma quinzena e hora do arquivo; a carta, a máscara e o transferidor são os de B. A diferença mistura a mudança do clima com as diferenças entre os arquivos (cada um é um ano típico, com meses de anos diferentes, e tem fonte e método próprios), e cada célula tem só cerca de 15 horas de cada arquivo: vale o padrão de muitas células, não uma célula isolada.',
  'difference.summary': 'Média das {n} células desenhadas: {mean} {unit} (de {min} a {max}).',
  'difference.lagSame':
    'Nos dias claros, a radiação de A e a de B diferem menos de 15 min no tempo.',
  'difference.lagLate':
    'Nos dias claros, a radiação de B vem cerca de {minutes} min depois da de A: só por isso, a diferença fica negativa de manhã e positiva à tarde.',
  'difference.lagEarly':
    'Nos dias claros, a radiação de B vem cerca de {minutes} min antes da de A: só por isso, a diferença fica positiva de manhã e negativa à tarde.',
  'difference.needData':
    'A diferença precisa de dados climáticos em A e em B (dados históricos ou arquivo carregado) e de uma variável escolhida no passo 4; por enquanto, A e B ficam lado a lado.',
  'difference.otherPlace':
    'A diferença só vale para o mesmo local (até 0,1° de latitude e de longitude, mesmo fuso); A e B ficam lado a lado.',
  'difference.legend': 'B − A: {quantity}',
  'difference.print': 'Diferença B − A. A: {a} B: {b}',
  'difference.csvWhat': 'média das horas de B menos a de A',
  'cell.difference': 'B − A: {diff} {unit} (média de A: {a}; de B: {b}).',
  'cells.captionDifference':
    'Média das horas de B menos a de A em cada célula ({unit}); linhas: quinzenas; colunas: horas do arquivo.',
} as const;
