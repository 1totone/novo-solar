// Textos do leiaute em colunas (decisão 0050), em português do Brasil. Separados do catálogo
// principal só para organização; as chaves fazem parte do mesmo catálogo.
export const layoutPtBR = {
  // Botão "i" que mostra a explicação de um campo.
  'info.label': 'Explicação: {topic}',
  'chart.infoLabel': 'Como ler a carta',
  // Passo 1: o arquivo abre pelo botão ao lado da lista de fontes; o local numa linha de resumo.
  'site.fileButton': 'Abrir arquivo',
  'site.fileButtonDetail': ' climático (EPW, .zip do TMYx ou CSV do SOL-AR)',
  'site.detailsLabel': 'Detalhes do local:',
  'site.lineNotice': '1 aviso',
  'site.lineNotices': '{count} avisos',
  'site.originTry': 'TRY do SOL-AR 6.2',
  'site.originIwec': 'IWEC do SOL-AR 6.2',
  'site.originCity': 'estação {station}',
  'site.originFile': 'arquivo {file}',
  'site.originStation': 'catálogo TMYx',
  'site.originLink': 'coordenadas do link',
  // Passo 2: o rótulo curto à vista; o resto do nome do campo para o leitor de tela.
  'facade.orientationLabel': 'Orientação',
  'facade.orientationLabelDetail': ' da fachada (azimute da normal externa)',
  'facade.showProtractorShort': 'Mostrar o transferidor',
  'facade.showProtractorDetail': ' sobre a carta',
  // Passo 3: o rótulo curto da referência (o grupo tem o nome inteiro).
  'protection.referenceShort': 'Referência',
  'angles.caption': '{view}, referência {reference}',
  // Passo 1: o botão de comparar com o nome curto à vista.
  'sources.compareShort': 'Comparar',
  // Passo 5: o botão de copiar com o nome curto à vista.
  'outputs.copyShort': 'Copiar',
} as const;
