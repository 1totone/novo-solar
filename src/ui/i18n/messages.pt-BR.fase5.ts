// Textos da Fase 5, em português do Brasil. Separados do catálogo principal só para organização;
// as chaves fazem parte do mesmo catálogo (decisão 0005).
export const fase5PtBR = {
  // F5.2: exportação para o EnergyPlus e para o CAD (spec 13, decisão 0043).
  'energyplus.heading': 'EnergyPlus e CAD',
  'energyplus.intro':
    'A janela e as peças para o EnergyPlus 26.2, e o corte e a vista para o CAD. O brise e o par de aletas encostados na fachada saem como objetos por projeção; o resto, como placas: encostadas (Shading:Zone:Detailed) ou afastadas da fachada (Shading:Building:Detailed).',
  'energyplus.windowName': 'Nome da janela no seu modelo',
  'energyplus.wallName': 'Nome da parede (superfície-base)',
  'energyplus.nameInvalid': 'Use nomes sem vírgula, ponto e vírgula ou "!", com até 90 caracteres.',
  'energyplus.paste': 'Opcional: cole o objeto FenestrationSurface:Detailed da sua janela',
  'energyplus.pasteHelp':
    'Com a janela colada, os nomes vêm dela e as placas saem na posição dela no seu modelo. Sem ela, a janela fica com o canto inferior esquerdo (visto de dentro) na origem e a fachada do passo 2.',
  'energyplus.order': 'Ordem dos vértices no seu modelo (GlobalGeometryRules)',
  'energyplus.order.ccw': 'Anti-horária (padrão)',
  'energyplus.order.cw': 'Horária',
  'energyplus.pasteOk':
    'Janela {name}, na parede {wall}: {width} × {height} m, normal externa a {azimuth}°.',
  'energyplus.pasteError.notFenestration':
    'Não achei um objeto FenestrationSurface:Detailed no texto colado.',
  'energyplus.pasteError.fieldCount':
    'O objeto colado tem menos campos que um FenestrationSurface:Detailed.',
  'energyplus.pasteError.notFourVertices': 'A janela precisa ter 4 vértices.',
  'energyplus.pasteError.badNumber': 'Uma das coordenadas dos vértices não é um número.',
  'energyplus.pasteError.notPlanar': 'Os vértices não estão num plano (mais de 1 mm fora).',
  'energyplus.pasteError.notVertical':
    'A janela não é vertical; a exportação vale para janelas em paredes verticais.',
  'energyplus.pasteError.notRectangle': 'A janela colada não é um retângulo.',
  'energyplus.warnSize':
    'A janela colada tem {width} × {height} m; a do passo 6, {width6} × {height6} m. As peças saem com as medidas do passo 6.',
  'energyplus.warnAzimuth':
    'A normal da janela colada está a {azimuth}°, e a fachada do passo 2, a {orientation}°. Se o seu modelo tem Building North Axis diferente de 0, isso é esperado.',
  'energyplus.plan': 'O que cada peça vira',
  'energyplus.planReveal': 'Recuo do vidro: {types}',
  'energyplus.planPiece': 'Peça {n}: {types}',
  'energyplus.capped':
    'Peça {n}: prolongamento infinito exportado com {length} m; a sombra na janela é a mesma enquanto o sol estiver a mais de 2,9° do plano da fachada.',
  'energyplus.objects': 'Objetos para o seu modelo (.idf)',
  'energyplus.model': 'Modelo para conferir (.idf)',
  'energyplus.dxf': 'Corte e vista (.dxf)',
  'energyplus.objectsHelp':
    'Objetos: para colar no seu IDF. Esquerda e direita dos objetos por projeção são vistas de fora, como no EnergyPlus.',
  'energyplus.modelHelp':
    'Modelo para conferir: uma zona mínima que roda sozinha com o EPW do local e dá a fração ensolarada da janela a cada passo de tempo (a mesma do mapa do ano, com o sol do EnergyPlus).',
  'energyplus.dxfHelp': 'Corte e vista: DXF R12 em metros, lado a lado, com camadas separadas.',
} as const;
