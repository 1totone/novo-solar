// Textos da interface em português do Brasil (idioma de referência).
// Espanhol e inglês entram na Fase 4 com as mesmas chaves (decisão 0005).
export const ptBR = {
  'app.name': 'SOL-AR',
  'app.tagline':
    'Carta solar, transferidor de ângulos e projeto de proteções solares no navegador, com dados climáticos atuais.',
  'status.title': 'Em construção',
  'status.body':
    'Esta é a prévia da nova versão do Analysis SOL-AR, do LabEEE/UFSC. Enquanto ela não é lançada, use a versão 6.2, disponível no site do LabEEE.',
  'status.oldVersionLink': 'SOL-AR 6.2 no site do LabEEE',
  'status.roadmapLink': 'Acompanhe o desenvolvimento',
  'status.wireframesLink': 'Esboço das próximas telas (wireframes da Fase 2)',
  'about.toggleOpen': 'Sobre',
  'about.toggleClose': 'Fechar "Sobre"',
  'about.title': 'Sobre',
  'about.originalTitle': 'Versão original (Analysis SOL-AR 6.2, LabEEE/UFSC)',
  'about.originalResearch':
    'Pesquisa e desenvolvimento: Roberto Lamberts e Alexandra Albuquerque Maciel',
  'about.originalProgramming': 'Programação: Edson T. Ono',
  'about.newTitle': 'Nova versão',
  'about.newAuthor': 'Anthony Aliardi, a pedido do Prof. Roberto Lamberts',
  'about.newAi': 'Desenvolvimento assistido por IA (Claude, Anthropic)',
  'about.newMaintenance': 'Manutenção futura: LabEEE/UFSC',
  'about.license': 'Código aberto sob a licença MIT.',
  'footer.build': 'Versão {version} · {label} · {commit}',
  'chart.north': 'N',
  'chart.east': 'L',
  'chart.south': 'S',
  'chart.west': 'O',
  'chart.title':
    'Carta solar de {place}, latitude {latitude}°, longitude {longitude}°, fuso UTC{timeZone}',
  'chart.heading': 'Carta solar',
  'chart.note':
    'Projeção estereográfica, Norte para cima. Trajetórias nos solstícios, nos equinócios e no dia 21 dos outros meses; linhas horárias em hora solar verdadeira.',
  'compass.points': 'N,NNE,NE,ENE,L,ESE,SE,SSE,S,SSO,SO,OSO,O,ONO,NO,NNO',
  'facade.heading': 'Fachada',
  'facade.orientation': 'Orientação da fachada (azimute da normal externa)',
  'facade.orientationHelp':
    'Graus a partir do Norte, no sentido horário; aceita qualquer valor, inclusive negativo (−30° = 330°).',
  'facade.orientationInvalid': 'Digite um número em graus.',
  'facade.normalized': 'Normal externa: {degrees}° ({compass})',
  'facade.showProtractor': 'Mostrar o transferidor sobre a carta',
  'protection.heading': 'Proteção',
  'protection.reference': 'Referência dos ângulos',
  'protection.internal': 'Interna',
  'protection.external': 'Externa',
  'protection.referenceHelpInternal':
    'Interna: α e β medidos a partir do plano da fachada, γ a partir da vertical (α = AVS e β = AHS da INI-C).',
  'protection.referenceHelpExternal':
    'Externa: α medido a partir da horizontal, β a partir da normal, γ a partir da horizontal (externo = 90° − interno).',
  'protection.left': 'Esquerda',
  'protection.right': 'Direita',
  'protection.sidesHelp': 'Esquerda e direita de quem está dentro olhando para fora.',
  'protection.alpha': 'α (brise horizontal)',
  'protection.beta': 'β (brises verticais)',
  'protection.gamma': 'γ (limites laterais)',
  'protection.totalSet': 'Sombra total (100%)',
  'protection.totalHelp':
    'α medido da base da janela, β da aresta oposta à aleta, γ do canto inferior do mesmo lado. Na região vermelha, a janela inteira fica à sombra.',
  'protection.more': 'Mais opções',
  'protection.index2': 'Índices 2 (brise afastado da parede)',
  'protection.index2Help':
    'A sombra fica entre a curva 1 (aresta externa) e a 2 (aresta interna); a fresta junto à parede deixa passar o sol. Na sombra total, α2 é medido da verga e β2 da aresta da janela do mesmo lado. γ2 é desenhado como no SOL-AR 6.2, mas não muda a máscara: as duas pontas da aresta lateral dão o mesmo γ.',
  'protection.finTop': 'γ das aletas',
  'protection.finTopHelp':
    'Topo de uma aleta de altura limitada, medido do canto superior oposto da janela; acima dessa curva o sol passa por cima da aleta.',
  'protection.combinedHelp':
    'Grelha (brise encostado nas aletas, mesma profundidade): deixe γ e γ das aletas em branco, porque as junções fecham as frestas. Com peças soltas, a região vermelha pode ficar menor que a sombra total real, porque partes diferentes da janela podem ser sombreadas por peças diferentes.',
  'protection.partialSet': 'Sombra parcial (50%)',
  'protection.partialShort': 'parcial',
  'protection.partialHelp':
    'Os mesmos ângulos medidos do centro da janela (curvas tracejadas). Na região amarela o centro fica à sombra, o que equivale a pelo menos metade da janela em brises e aletas longos; em peças curtas é uma aproximação.',
  'protection.invalid': 'Use um valor de 0° a 90°.',
  'protection.fieldLabel': '{angle} {side} {index}',
  'draw.heading': 'Desenhar à mão',
  'draw.help':
    'Como no SOL-AR 6.2: marque na carta os vértices de uma região de sombra. O desenho se soma à máscara calculada e fica guardado no link.',
  'draw.start': 'Começar a desenhar',
  'draw.kind': 'Tipo de sombra do desenho',
  'draw.total': 'Total',
  'draw.partial': 'Parcial',
  'draw.helpActive':
    'Clique na carta para marcar os vértices ({count} até agora) e conclua com 3 ou mais.',
  'draw.undo': 'Desfazer ponto',
  'draw.finish': 'Concluir polígono',
  'draw.stop': 'Parar de desenhar',
  'draw.clear': 'Apagar os desenhos',
  'mask.legend': 'Legenda da máscara',
  'mask.total': 'sombra total (100%)',
  'mask.partial': 'sombra parcial (50%)',
  'site.heading': 'Local',
  'site.testLabel': 'Cidade de teste',
  'site.fileOption': 'Arquivo: {name}',
  'site.fileLabel': 'Ou carregue um arquivo climático EPW',
  'site.fileHelp': 'O arquivo é lido só no seu navegador; nada é enviado pela internet.',
  'site.latitude': 'Latitude',
  'site.longitude': 'Longitude',
  'site.timeZone': 'Fuso',
  'site.elevation': 'Elevação',
  'site.source': 'Origem',
  'site.sourceTest':
    'Local de teste: coordenadas, fuso e elevação do arquivo TMYx 2011 a 2025 (Climate.OneBuilding.org).',
  'site.sourceFile': 'Arquivo {file}: {hours} horas.',
  'site.sourceFileLeap': 'Arquivo {file}: {hours} horas (inclui 29 de fevereiro).',
  'site.sourceLink':
    'Coordenadas, fuso e elevação do link; o arquivo não está carregado nesta sessão.',
  'site.comments': 'Comentário do arquivo',
  'site.readError': 'Não foi possível ler o arquivo.',
  'epw.error.missingLocation':
    'O arquivo não parece ser um EPW: a primeira linha deveria começar com LOCATION e ter 10 campos.',
  'epw.error.invalidLatitude':
    'Latitude inválida no cabeçalho (linha 1): deve estar entre −90° e 90°.',
  'epw.error.invalidLongitude':
    'Longitude inválida no cabeçalho (linha 1): deve estar entre −180° e 180°.',
  'epw.error.invalidTimeZone':
    'Fuso horário inválido no cabeçalho (linha 1): deve estar entre −12 h e +14 h.',
  'epw.error.invalidElevation': 'Elevação inválida no cabeçalho (linha 1).',
  'epw.error.tooFewFields': 'Linha {line}: faltam campos; um EPW tem 35 campos por hora.',
  'epw.error.invalidNumber': 'Linha {line}: valor não numérico no campo "{field}".',
  'epw.error.invalidSequence':
    'Linha {line}: a sequência de mês, dia e hora está quebrada (hora faltando, repetida ou fora de ordem).',
  'epw.error.invalidHourCount':
    'O arquivo não tem um ano completo: são esperadas 8760 horas (ou 8784 com 29 de fevereiro).',
  'epw.error.negativeRadiation': 'Linha {line}: radiação negativa no campo "{field}".',
  'epw.field.dryBulb': 'temperatura de bulbo seco',
  'epw.field.dewPoint': 'temperatura de ponto de orvalho',
  'epw.field.relativeHumidity': 'umidade relativa',
  'epw.field.pressure': 'pressão atmosférica',
  'epw.field.extraterrestrialHorizontal': 'radiação extraterrestre horizontal',
  'epw.field.globalHorizontal': 'radiação global horizontal',
  'epw.field.directNormal': 'radiação direta normal',
  'epw.field.diffuseHorizontal': 'radiação difusa horizontal',
  'epw.field.windDirection': 'direção do vento',
  'epw.field.windSpeed': 'velocidade do vento',
  'epw.field.totalSkyCover': 'cobertura do céu',
} as const;
