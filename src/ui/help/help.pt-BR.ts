import type { HelpContent } from './content';

// Ajuda em português do Brasil (idioma de referência; F4.8, decisão 0032). Os números dos exemplos
// são conferidos pelo núcleo em tests/referencia/ajudaExemplos.test.ts; os termos seguem o glossário
// técnico (docs/i18n/glossario-tecnico.md).
export const helpPtBR: HelpContent = {
  tutorial: {
    title: 'Tutorial guiado',
    intro:
      'Oito etapas curtas pelo caminho básico, com o caso de Brasília do tutorial da UFU. Abre numa nova aba; cada etapa realça o painel em que você vai mexer.',
    steps: [
      {
        title: 'Bem-vindo ao SOL-AR',
        text: 'Você vai desenhar a máscara de um brise para uma janela em Brasília: escolher o local, orientar a fachada, digitar os ângulos e ler os dados sobre a carta. Use "Próxima" para avançar; "Fazer por mim" faz a ação da etapa.',
      },
      {
        title: 'Local',
        text: 'No passo 1, escolha Brasília na lista de cidades. A carta passa a ser a de Brasília, a 15,9° de latitude Sul.',
      },
      {
        title: 'A carta solar',
        text: 'O centro da carta é o zênite e o círculo externo, o horizonte. As curvas alaranjadas são as trajetórias do sol, com o mês no poente, e as linhas azuis, as horas solares. Ache a trajetória de junho e a linha das 9 h.',
      },
      {
        title: 'Fachada',
        text: 'No passo 2, digite 30: a fachada olha para 30°, entre o Norte e o Nordeste. O transferidor gira com ela, e a linha preta da fachada separa o céu que a janela vê do céu atrás dela.',
      },
      {
        title: 'Ângulo α',
        text: 'No passo 3, digite α = 55°, na referência interna. A região vermelha é a sombra total: com o sol ali, o brise horizontal sombreia a janela inteira.',
      },
      {
        title: 'Limites laterais γ',
        text: 'Um brise de comprimento finito tem limites dos lados. Digite γ direita = 50° e γ esquerda = 60°: a região vermelha fica limitada à direita e à esquerda de quem está dentro.',
      },
      {
        title: 'Dados sobre a carta',
        text: 'No passo 1, em "Dados horários", escolha os dados do SOL-AR 6.2 e, logo abaixo, em "Pintar na carta", a temperatura. As células vermelhas são as horas mais quentes; as que ficam sob a hachura vermelha da máscara estão protegidas.',
      },
      {
        title: 'Imprimir e continuar',
        text: 'No passo 5, imprima a carta em escala (6 cm de raio, como no SOL-AR 6.2) ou salve o projeto. Para continuar, o exemplo resolvido 1 da ajuda confere se estes ângulos bastam, e os exercícios treinam o desenho da máscara.',
      },
    ],
  },
  exercises: {
    intro:
      'Desenhe à mão a máscara de sombra total de uma proteção dada pelos ângulos e compare com a calculada. Cada exercício abre numa nova aba, sem a resposta na carta.',
    howTo: [
      'Leia o enunciado no cartão, no alto dos passos.',
      'Clique em "Começar a desenhar" e marque na carta os vértices da região de sombra total, seguindo as curvas do transferidor; conclua o polígono (pode desenhar mais de um).',
      'Clique em "Conferir": a máscara calculada aparece hachurada sobre o seu desenho, com a coincidência entre as duas.',
    ],
    metric:
      'A coincidência é a interseção dividida pela união das duas regiões, medida em área do céu diante da fachada (ângulo sólido), e não na área da carta, que aumenta perto do horizonte. Também aparece a coincidência nas horas de sol do ano, que pesa cada parte do céu pela frequência com que o sol passa por ela. Com 90% ou mais, a máscara coincide; de 75% a 90%, quase.',
    items: {
      brise: {
        title: '1. Brise horizontal infinito',
        statement:
          'Fachada Norte em Florianópolis, referência interna. Desenhe a sombra total de um brise horizontal infinito com α = 45°.',
      },
      'brise-gama': {
        title: '2. Brise com limites laterais',
        statement:
          'Fachada Norte em Florianópolis, referência interna. Desenhe a sombra total de um brise com α = 40°, γ direita = 40° e γ esquerda = 40°.',
      },
      aletas: {
        title: '3. Aletas dos dois lados',
        statement:
          'Fachada Oeste em Florianópolis, referência interna. Desenhe a sombra total de duas aletas infinitas, com β direita = 30° e β esquerda = 30°.',
      },
      grelha: {
        title: '4. Grelha',
        statement:
          'Fachada a 30° em Brasília, referência interna. Desenhe a sombra total de uma grelha: brise com α = 50° encostado em duas aletas com β direita = 30° e β esquerda = 30°.',
      },
    },
  },
  guide: {
    intro:
      'O SOL-AR desenha a carta solar de um lugar e, sobre ela, o transferidor de ângulos e a máscara de sombra de uma proteção. O caminho básico tem cinco passos, um aberto por vez: clique ou toque no título de um passo para abri-lo; fechado, ele mostra numa linha o que já foi escolhido. Os avançados ficam recolhidos abaixo deles. Tudo o que você escolhe fica no endereço da página: o botão "Compartilhar", no alto, copia o link, que reabre a mesma análise.',
    steps: [
      {
        title: '1. Local',
        text: 'Escolha a cidade e, em "Dados horários", os dados do SOL-AR 6.2 ou um arquivo climático EPW carregado (o link de cada cidade baixa o arquivo recente, TMYx); em "Pintar na carta", o que colorir. Cada arquivo carregado continua na lista ao trocar de cidade, e "Comparar com outros dados" mostra a diferença entre dois deles. O arquivo é lido só no seu navegador.',
      },
      {
        title: '2. Fachada',
        text: 'Digite a orientação da fachada: o azimute da normal externa, em graus a partir do Norte, no sentido horário (Leste = 90°). O transferidor gira com ela.',
      },
      {
        title: '3. Proteção',
        text: 'Digite os ângulos da proteção, α do brise horizontal, β das aletas e γ dos limites laterais, na referência interna ou externa. A região vermelha é a sombra total; a amarela, a parcial (centro da janela à sombra). Também dá para desenhar uma região à mão.',
      },
      {
        title: '4. Dados sobre a carta',
        text: 'Pinte a carta com uma variável do arquivo (temperatura, umidade ou radiação) para ver quando a sombra é desejada. Passe o cursor ou toque numa célula para ler os valores.',
      },
      {
        title: '5. Imprimir e exportar',
        text: 'Imprima em escala (raio da carta em cm), exporte a imagem (SVG ou PNG) ou os dados (CSV), compare duas configurações lado a lado (ou dois climas do mesmo lugar na mesma carta) e salve o projeto em arquivo.',
      },
    ],
    advanced: [
      {
        title: 'Projeção e linhas horárias',
        text: 'Projeções equidistante e cilíndrica, cada uma com o seu transferidor, e linhas horárias em hora legal (analemas), para ver a diferença entre hora solar e hora legal.',
      },
      {
        title: '6. Proteção pelas dimensões',
        text: 'Descreva a janela, o recuo do vidro e as peças em metros: o programa desenha o corte e a vista, as curvas de 0 a 100% da janela à sombra e o mapa da sombra ao longo do ano. "Dimensionar pelo período" faz o caminho inverso, do período a sombrear aos ângulos e às dimensões.',
      },
      {
        title: '7. Efeito no ano',
        text: 'Com um arquivo climático e a proteção do passo 6, classifica as horas em quentes, neutras e frias e mostra a radiação direta bloqueada nas horas quentes e admitida nas frias. Guarde alternativas para comparar.',
      },
    ],
    tabs: [
      {
        title: 'Carta solar',
        text: 'A carta com o transferidor, a máscara, os dados e as curvas da proteção. Passe o mouse sobre ela, ou toque, para ler um ponto; clique (no toque, "Marcar ponto") para marcar até 3 pontos, com a altura, o azimute, quando o sol passa ali e os ângulos α e β do transferidor na tabela embaixo da carta. Pelo teclado, o botão "Digitar ponto" vem logo depois da carta.',
      },
      {
        title: 'Vista 3D',
        text: 'A janela e as peças do passo 6 com o sol de um dia e de uma hora; a sombra no vidro é a do cálculo.',
      },
      {
        title: 'Rosa dos ventos',
        text: 'Frequência e velocidade do vento do arquivo, por estação do ano, período do dia e condição térmica, com a correção de altura e terreno do EnergyPlus.',
      },
    ],
    tips: [
      'Os campos aceitam vírgula ou ponto decimal; um valor inválido fica em vermelho, com a explicação.',
      'O link guarda tudo, menos os arquivos carregados: para guardá-los, use "Salvar projeto" no passo 5.',
      'Depois da primeira visita, a aplicação abre sem internet (os dados históricos, das cidades já abertas) e pode ser instalada pelo navegador.',
      'Teclado: Tab percorre os campos; nas abas e nos grupos de opções, as setas trocam a escolha.',
    ],
  },
  examples: {
    intro:
      'Três exemplos com o caso de Brasília do tutorial do Analysis SOL-AR da UFU, refeitos com o novo SOL-AR. Cada um abre numa nova aba, com um cartão que acompanha o passo a passo; a configuração desta aba não muda.',
    items: {
      angulos: {
        title: '1. Ler os ângulos na carta: 55° ou 57,5°?',
        problem:
          'Em Brasília, numa fachada a 30°, o tutorial quer a janela à sombra das 9 h às 15 h (hora solar) o ano todo e lê na carta α = 55°, γ direita = 50° e γ esquerda = 60°, na referência interna. Esses ângulos bastam?',
        steps: [
          'No passo 3, os ângulos do tutorial desenham a sombra total (região vermelha).',
          'No passo 6, "Dimensionar pelo período" traz o período do tutorial: de 1/1 a 31/12, das 9 h às 15 h em hora solar. Na carta, ele aparece em verde.',
          'A tabela dá os ângulos que sombreiam o período inteiro, com o sol que determina cada um: α = 57,5° (32,5° na referência externa), γ direita = 42,2° e γ esquerda = 58,5°.',
          'O α vem do sol das 9 h de 21/6, que fica fora da região vermelha: com 55°, nas manhãs de maio a julho, até 9h30, o sol chega a uma parte da janela.',
          'Com α = 57,5°, a profundidade do brise passa de 1,28 m (a do tutorial, com o vidro recuado 15 cm) para 1,42 m.',
        ],
        lesson:
          'Os 2,5° de diferença são pequenos no papel: numa carta de 6 cm de raio, o ponto das 9 h de 21/6 fica a 1,7 mm da curva de 55°. A leitura na carta serve para estudar; para garantir o período, confira os ângulos pelo cálculo. O γ direita de 50° sobra (o período pede 42,2°): o prolongamento fica maior que o necessário, a favor da sombra.',
      },
      recuo: {
        title: '2. Do ângulo às dimensões, com o vidro recuado',
        problem:
          'O tutorial transforma os ângulos num brise de 1,28 m na verga, com prolongamentos de 1,70 m à esquerda e 1,20 m à direita, numa janela de 2,00 × 1,00 m com o vidro 15 cm atrás da face externa da parede. Onde está o α nesse desenho, e o que o recuo muda?',
        steps: [
          'No passo 6 estão a janela, o recuo e o brise do tutorial. O corte mostra o α, do peitoril junto ao vidro até a aresta externa do brise: 1,28 + 0,15 = 1,43 m para 1,00 m de altura dão α = 55,0°, o ângulo lido na carta. Na vista, γ direita = 50,2° e γ esquerda = 59,5°.',
          'Na carta, a curva de 100% (janela inteira à sombra, com preenchimento) coincide com a borda da região vermelha do passo 3, a menos de 0,1°: as duas descrevem a mesma sombra total.',
          'Não há curva de 0%: com o vidro recuado, a verga e as ombreiras da parede sombreiam uma parte da janela com qualquer sol fora da normal. A curva se reduz a um ponto, a normal no horizonte, onde fica o rótulo 0%.',
          'No período do exemplo 1, este brise deixa a janela inteira à sombra em 99,2% dos instantes; nos outros, manhãs de maio a julho, até 8,7% da janela fica ao sol.',
        ],
        lesson:
          'O α é medido do peitoril junto ao vidro, e a profundidade do brise conta a partir da face externa da parede: D = H · tan α − d, com d o recuo. A parede espessa também é proteção: com recuo, sempre há alguma sombra na janela.',
      },
      afastado: {
        title: '3. Brise afastado da parede: α2 se mede da verga',
        problem:
          'No mesmo tutorial, o brise tem 1,00 m de profundidade, na altura da verga, afastado 28 cm da parede, e os ângulos são α1 = 55° e α2 = 20°, os dois medidos do peitoril. O que acontece na fresta entre o brise e a parede?',
        steps: [
          'No passo 3, α1 = 55° e α2 = 20° desenham a sombra total como uma faixa entre as duas curvas: é a máscara que o tutorial pinta.',
          'No SOL-AR, α2 é medido da verga até a aresta interna do brise (passo 3, "Índices 2"). Aqui a aresta interna está na altura da verga: o α2 do desenho é 90°, e a fresta deixa o sol chegar ao vidro.',
          'No passo 6 está o brise desenhado. Na carta, a curva de 100% só aparece junto à linha da fachada: a janela inteira fica à sombra só com o sol a mais de 81,5° de perfil, quando a verga da própria parede cobre o vidro.',
          'No período do exemplo 1, só 18% dos instantes têm a janela inteira à sombra, todos com o sol quase rente à fachada, e nenhum de 12/5 a 30/7; no pior instante, 65% da janela fica ao sol.',
          'Para a sombra total ir de 35° a 70° de perfil, como o tutorial queria, a aresta interna teria de subir 0,77 m acima da verga (α2 = 20° medido da verga), e o brise passaria a 2,10 m de profundidade para manter α1 = 55°.',
        ],
        lesson:
          'Medido do peitoril, o α2 promete uma sombra que o brise afastado não dá. Meça α2 da verga até a aresta interna: o sol mais alto que essa linha passa pela fresta. Com afastamento, "Dimensionar pelo período" calcula a altura acima da verga que fecha a fresta.',
      },
    },
    source:
      'Fonte do caso: Bortoli, K. C. R.; Saramago, R. C. P. Analysis SOL-AR (tutorial do projeto "Desenvolvimento de tutoriais de softwares da série Analysis", FAUeD/UFU), disponível no site do LabEEE. As leituras do tutorial são gráficas; as diferenças estão nos relatórios de validação do projeto.',
  },
  glossary: [
    {
      title: 'Carta e ângulos',
      terms: [
        {
          term: 'Carta solar',
          definition:
            'Desenho da abóbada celeste num plano, com as trajetórias do sol ao longo do ano e as linhas das horas. Na projeção estereográfica (a padrão), o centro é o zênite e o círculo externo, o horizonte.',
        },
        {
          term: 'Transferidor',
          definition:
            'Gabarito com as curvas de α, β e γ, girado até a orientação da fachada, para ler sobre a carta os ângulos de uma proteção ou desenhar a máscara dela.',
        },
        {
          term: 'Máscara de sombra',
          definition:
            'Região da carta com as posições do sol que a proteção bloqueia. Vermelha: sombra total, a janela inteira à sombra. Amarela: sombra parcial, o centro da janela à sombra.',
        },
        {
          term: 'α (brise horizontal)',
          definition:
            'Ângulo do brise horizontal no corte da janela, do peitoril até a aresta externa do brise. Na referência interna, medido a partir do plano da fachada (é o AVS da INI-C); na externa, a partir da horizontal (é o ângulo de perfil, ou ângulo de sombra vertical).',
        },
        {
          term: 'β (brises verticais)',
          definition:
            'Ângulo de uma aleta em planta, da aresta oposta da janela até a ponta da aleta. Na referência interna, medido a partir do plano da fachada (é o AHS da INI-C); na externa, a partir da normal (ângulo de sombra horizontal).',
        },
        {
          term: 'γ (limites laterais)',
          definition:
            'Limite de um brise de comprimento finito, no plano da fachada, do canto inferior do mesmo lado até a ponta do brise. Na referência interna, medido a partir da vertical; na externa, a partir da horizontal. O γ das aletas limita o topo de uma aleta.',
        },
        {
          term: 'Referência interna e externa',
          definition:
            'As duas formas do SOL-AR de medir os ângulos; externo = 90° − interno. A interna é a padrão e coincide com o AVS e o AHS da INI-C.',
        },
        {
          term: 'AVS (ângulo vertical de sombreamento)',
          definition:
            'Nome da INI-C (Inmetro, 2020) para o ângulo do brise horizontal: entre o plano vertical na base do vidro e o plano que passa pela extremidade mais distante da proteção. É o α na referência interna, a padrão do programa.',
        },
        {
          term: 'AHS (ângulo horizontal de sombreamento)',
          definition:
            'Nome da INI-C para o ângulo das aletas: entre o plano da fachada e o plano que passa pela extremidade mais distante da aleta e pela aresta oposta da janela. É o β na referência interna.',
        },
        {
          term: 'Índices 1 e 2',
          definition:
            'Para o brise afastado da parede: o índice 1 vai até a aresta externa; o 2, até a interna, com o α2 medido da verga. A sombra total fica entre as duas curvas, porque a fresta deixa o sol passar.',
        },
        {
          term: 'Orientação da fachada',
          definition:
            'Azimute da normal externa, a direção para onde a fachada olha, em graus a partir do Norte geográfico, no sentido horário (Leste = 90°).',
        },
        {
          term: 'Esquerda e direita',
          definition: 'Sempre de quem está dentro, olhando para fora pela janela.',
        },
      ],
    },
    {
      title: 'Proteção e geometria',
      terms: [
        {
          term: 'Brise',
          definition:
            'Proteção solar externa: horizontal (beiral, marquise), vertical (aleta) ou dividida em lâminas.',
        },
        { term: 'Aleta', definition: 'Brise vertical, ao lado da janela.' },
        {
          term: 'Lâminas',
          definition:
            'Peças paralelas mais estreitas que substituem um brise ou uma aleta, com os mesmos ângulos.',
        },
        { term: 'Peitoril e verga', definition: 'A base e o topo da abertura da janela.' },
        {
          term: 'Recuo do vidro',
          definition:
            'Distância do vidro até a face externa da parede. A própria parede (verga e ombreiras) sombreia parte da janela; as peças do passo 6 são medidas a partir da face externa.',
        },
        {
          term: 'Curvas de 0 a 100%',
          definition:
            'Na carta, as posições do sol em que a mesma parte da janela fica à sombra; dentro da curva de 100%, a janela inteira. Vêm da geometria exata das peças.',
        },
        {
          term: 'Fração ensolarada',
          definition:
            'Parte da área da janela que recebe sol direto num instante: 1 menos a parte à sombra. No EnergyPlus, sunlit fraction.',
        },
        {
          term: 'Máscara de um ponto',
          definition: 'As posições do sol em que um ponto escolhido da janela fica à sombra.',
        },
        {
          term: 'Período a sombrear',
          definition:
            'Dias e horas em que a janela deve ficar inteira à sombra: o ponto de partida do dimensionamento.',
        },
      ],
    },
    {
      title: 'Tempo',
      terms: [
        {
          term: 'Hora solar verdadeira',
          definition:
            'Hora marcada pelo sol: 12 h quando ele cruza o meridiano do lugar. É a das linhas horárias da carta, salvo na opção de hora legal.',
        },
        {
          term: 'Hora legal',
          definition:
            'Hora do relógio no fuso do lugar, sem horário de verão: a do arquivo climático. Difere da solar pela longitude e pela equação do tempo.',
        },
        {
          term: 'Equação do tempo',
          definition:
            'Diferença entre a hora solar verdadeira e a média, de cerca de −14 a +16 minutos ao longo do ano, pela órbita elíptica e pela inclinação do eixo da Terra.',
        },
        {
          term: 'Analema',
          definition:
            'Curva em forma de oito que o sol percorre ao longo do ano numa mesma hora legal; é a linha horária em hora legal.',
        },
        {
          term: 'Trajetória do sol',
          definition:
            'Caminho do sol num dia. A carta mostra os solstícios, os equinócios e o dia 21 dos outros meses.',
        },
      ],
    },
    {
      title: 'Dados climáticos e vento',
      terms: [
        {
          term: 'Arquivo climático (EPW)',
          definition:
            'Formato do EnergyPlus, com as 8760 horas do ano de temperatura, umidade, radiação e vento. Cada valor se refere à hora que termina; a radiação é a acumulada na hora.',
        },
        {
          term: 'TRY, IWEC e TMYx',
          definition:
            'Anos climáticos de referência, montados com meses típicos de vários anos de medição. Os dados históricos do SOL-AR 6.2 são TRY (Goulart, Lamberts e Firmino, 1998) ou IWEC; os TMYx 2011 a 2025 são de Climate.OneBuilding.org.',
        },
        {
          term: 'Radiação direta normal (DNI)',
          definition:
            'Radiação do disco solar num plano perpendicular aos raios, em Wh/m² na hora. Na janela, chega multiplicada pelo cosseno do ângulo de incidência (DNI · cos θ).',
        },
        {
          term: 'Radiação difusa',
          definition:
            'Radiação do céu, fora do disco solar. A máscara da carta não a representa, e os indicadores não a contam.',
        },
        {
          term: 'Rosa dos ventos',
          definition:
            'Frequência do vento pela direção de onde ele vem (8 ou 16 setores), dividida em classes de velocidade.',
        },
        {
          term: 'Calmaria',
          definition:
            'Vento abaixo de 0,5 m/s, sem direção definida; fica fora dos setores, no centro da rosa.',
        },
        {
          term: 'Correção de altura e terreno',
          definition:
            'Conversão do vento da estação (10 m, campo aberto) para outra altura e outro terreno, pela lei de potência do EnergyPlus.',
        },
      ],
    },
    {
      title: 'Efeito no ano',
      terms: [
        {
          term: 'Horas quentes, neutras e frias',
          definition:
            'Classes das horas pela temperatura do ar externo: as quentes pedem sombra; as frias, sol. O padrão é o limiar de 20 °C (Lamberts, Dutra e Pereira, 2014).',
        },
        {
          term: 'Faixa adaptativa da ASHRAE 55',
          definition:
            'Faixa de conforto que acompanha a média das temperaturas externas dos dias anteriores (t_pma). Vale para a temperatura interna de ambientes ventilados naturalmente; comparada com o ar externo, como aqui, é uma aproximação.',
        },
        {
          term: 'Temperatura de equilíbrio',
          definition:
            'Temperatura externa acima da qual os ganhos de calor do edifício passam a ser excesso; depende do edifício e não tem valor padrão.',
        },
        {
          term: 'Radiação bloqueada e admitida',
          definition:
            'Parte da radiação direta que chegaria ao vidro sem a proteção e que ela bloqueia nas horas quentes ou deixa entrar nas frias. Quanto mais perto de 100%, melhor.',
        },
        {
          term: 'Alternativa superada',
          definition:
            'Uma alternativa supera outra quando bloqueia pelo menos tanto nas horas quentes e admite pelo menos tanto nas frias, e é melhor em um dos dois.',
        },
      ],
    },
  ],
  faq: [
    {
      question: 'Por que a carta é diferente da do SOL-AR 6.2?',
      answer:
        'Pela posição do sol e pela hora. O 6.2 usava fórmulas aproximadas (erro de cerca de 1°) e trajetórias com 7 declinações fixas (até 1,7° de erro em abril e agosto); aqui o sol vem do algoritmo SPA do NREL, conferido contra o pvlib. E o 6.2 convertia a hora legal em solar sempre pelo meridiano de 45° Oeste, o que desloca os dados em 1 h nas cidades em UTC−4 e em 2 h no Acre; aqui vale o fuso do arquivo de cada lugar.',
    },
    {
      question: 'As horas da carta são solares ou legais?',
      answer:
        'As linhas horárias são de hora solar verdadeira, como no 6.2: 12 h é o meio-dia solar. Em "Projeção e linhas horárias" (avançado), elas podem ser de hora legal (os analemas). Os dados do arquivo ficam na hora legal do fuso dele: a célula da radiação cobre a hora que termina (de h − 1 a h), e a da temperatura, meia hora para cada lado de h.',
    },
    {
      question: 'Qual referência usar, interna ou externa?',
      answer:
        'A do seu material de aula: o resultado é o mesmo, e externo = 90° − interno. A interna, padrão, mede α e β a partir do plano da fachada e coincide com o AVS e o AHS da INI-C; a externa mede α a partir da horizontal, como o ângulo de perfil da literatura em inglês.',
    },
    {
      question: 'Esquerda e direita de quem?',
      answer:
        'De quem está dentro, olhando para fora pela janela, em todo o programa. Por isso, no desenho "vista de fora" do passo 6, o lado direito aparece à esquerda.',
    },
    {
      question:
        'Com brise e aletas juntos, a região vermelha ficou menor do que eu esperava. Por quê?',
      answer:
        'Pelos ângulos, cada peça é tratada sozinha, e a sombra total é a união das regiões de cada uma. Quando as peças se ajudam (uma sombreia a parte da janela que a outra deixa ao sol), a sombra total real é maior. Numa grelha (brise encostado nas aletas, junto à parede), deixe γ e γ das aletas em branco. Para o resultado exato, descreva as peças no passo 6: a curva de 100% vem da geometria.',
    },
    {
      question: 'O que é a sombra parcial (amarela)?',
      answer:
        'As posições do sol em que o centro da janela fica à sombra, com os ângulos medidos do centro. Em brises e aletas longos e sem fresta, equivale a pelo menos metade da janela à sombra; nos outros casos, é uma aproximação. As curvas de 25, 50 e 75% do passo 6 dão a parte exata.',
    },
    {
      question: 'De onde vêm os dados climáticos? Posso usar o meu arquivo?',
      answer:
        'As cidades da lista têm os dados históricos do SOL-AR 6.2 (TRY ou IWEC). O catálogo do passo 1 tem as 579 estações do Brasil com arquivo TMYx 2011 a 2025 (Climate.OneBuilding.org), com mapa, qualidade de cada arquivo e o link para baixar. Você pode carregar qualquer EPW, o .zip do TMYx sem descompactar ou um CSV do SOL-AR: o arquivo é lido no seu navegador e não é enviado a lugar nenhum. A origem, o período e os avisos de qualidade aparecem no passo 1.',
    },
    {
      question: 'Como comparar o clima de antes com o de hoje, ou com o futuro?',
      answer:
        'Abra os dados do primeiro clima (os históricos da cidade ou um arquivo) e escolha uma variável no passo 4. No passo 5, "Comparar" guarda essa configuração como A. Carregue então o arquivo do outro clima do mesmo lugar (o TMYx recente ou um arquivo futuro, como os do BrazFuture) e clique em "Diferença B − A na mesma carta": cada célula mostra a média de B menos a de A. A diferença mistura a mudança do clima com as diferenças entre os arquivos (cada um é um ano típico, com fonte e método próprios); na radiação, a tela também diz se a radiação de um arquivo vem deslocada no tempo em relação à do outro. Para isolar a mudança projetada, compare arquivos do mesmo conjunto e modelo, como o BrazFuture de 2010 e o de 2050 da mesma rodada.',
    },
    {
      question: 'Como imprimir a carta em escala?',
      answer:
        'No passo 5, escolha o raio da carta (6 cm, como no 6.2) e o que incluir; no diálogo de impressão, use escala de 100%. A régua de 5 cm impressa ao lado da carta confere a escala. Para usar como transferidor em papel vegetal ou transparência, imprima só o transferidor.',
    },
    {
      question: 'Como guardar e compartilhar um estudo?',
      answer:
        'O endereço da página guarda as escolhas: o botão "Compartilhar", no alto, copia o link. Arquivos climáticos carregados não cabem no link; para guardá-los junto, use "Salvar projeto" no passo 5, que grava um arquivo para abrir depois com "Abrir projeto".',
    },
    {
      question: 'Funciona sem internet? Algum dado meu sai do computador?',
      answer:
        'Depois da primeira visita, a aplicação abre sem internet, inclusive os dados históricos das cidades já abertas, e pode ser instalada pelo navegador. Nada sai do navegador: não há servidor, conta nem rastreamento; o idioma escolhido fica guardado só neste navegador.',
    },
    {
      question: 'Os cálculos foram conferidos?',
      answer:
        'Sim, cada um contra uma referência independente, com a tolerância escrita na especificação: a posição do sol contra o pvlib, as máscaras contra traçado de raios, a fração ensolarada contra o EnergyPlus (erro quadrático médio de 0,006 a 0,026, hora a hora) e o vento contra as fórmulas do EnergyPlus. Os relatórios estão no repositório do projeto, em docs/validacao.',
    },
    {
      question: 'Por que o vento da rosa não é o do meu terreno?',
      answer:
        'Porque é o medido na estação meteorológica, em geral num aeroporto, a 10 m de altura, em campo aberto. A correção de altura e terreno (avançado) converte a velocidade pela lei de potência do EnergyPlus, mas não muda a direção nem considera os prédios e o relevo do entorno.',
    },
    {
      question: 'Por que a temperatura do ar não basta para decidir quando sombrear?',
      answer:
        'Porque a necessidade de sombra depende também dos ganhos internos, da envoltória, da massa térmica e da ventilação. A classificação das horas é um indicador aproximado: o padrão, 20 °C, é o critério de Lamberts, Dutra e Pereira (2014) para ambiente sem carga interna; com carga interna, use um limite menor ou a temperatura de equilíbrio do seu edifício.',
    },
  ],
  hypotheses: {
    intro:
      'O que cada parte do programa supõe e o que ela deixa de fora. As mesmas hipóteses aparecem, resumidas, em cada passo.',
    groups: [
      {
        title: 'Carta e sol',
        items: [
          'Posição do sol pelo algoritmo SPA do NREL, geométrica (sem refração atmosférica), no ano de referência de 2026: os arquivos típicos juntam meses de anos diferentes e não têm ano próprio.',
          'Trajetórias nos solstícios, nos equinócios e no dia 21 dos outros meses; linhas horárias em hora solar verdadeira, ou em hora legal (analemas) na opção avançada.',
          'Hora legal pelo fuso do arquivo climático (ou da estação da cidade), sem horário de verão.',
        ],
      },
      {
        title: 'Máscara pelos ângulos (passo 3)',
        items: [
          'Sombra total exata para uma peça (brise ou aleta, com ou sem limites), para aletas dos dois lados e para a grelha sem γ; com peças soltas, a região vermelha é a união das regiões de cada peça e pode ser menor que a sombra total real.',
          'Sombra parcial pelo centro da janela: igual a 50% da janela em brises e aletas longos e sem fresta; aproximação nos outros casos.',
          'O desenho à mão se soma à máscara calculada.',
        ],
      },
      {
        title: 'Proteção pelas dimensões (passo 6)',
        items: [
          'Peças como placas finas e opacas diante do vidro; a parede entra pelo recuo do vidro. Sem reflexão nas peças nem passagem de luz por elas.',
          'Parte da janela à sombra pela área exata da sombra, só para o sol direto: a radiação difusa não é mascarada.',
          'Mapa do ano e indicadores com o sol a cada 10 minutos (6 instantes por hora); dimensionamento com o sol a cada 5 minutos, para sombra total em todo o período.',
        ],
      },
      {
        title: 'Dados sobre a carta (passo 4)',
        items: [
          'Cada valor do arquivo se refere à hora que termina: a radiação é a acumulada de h − 1 a h; a temperatura e a umidade são as do instante h.',
          'A célula é a região ocupada pelo sol nos dias da quinzena e nos instantes que o valor representa; a cor é a média das horas da célula ou a frequência acima de um limiar.',
          'Faixas padrão do SOL-AR 6.2 na temperatura e na radiação global e direta (propostas novas na umidade e na difusa), ou pelos percentis do arquivo, que não se comparam entre cidades.',
          'Diferença entre dois climas: a média de cada célula em B menos a de A, só no mesmo local (até 0,1° e o mesmo fuso). Na radiação, a diferença de tempo entre os arquivos vem do centróide diário da global nos 30 dias mais claros de cada um, supondo nuvens parecidas nos dias claros dos dois arquivos do mesmo lugar.',
        ],
      },
      {
        title: 'Efeito no ano: classificação e indicadores (passo 7)',
        items: [
          'A classe da hora vem só da temperatura do ar externo, um indicador aproximado: ganhos internos, envoltória, massa térmica, ventilação e o próprio sol na janela não entram.',
          'Temperatura da hora: a média do início e do fim da hora, o instante do meio, como o sol e a radiação da hora.',
          'Padrão: limiar de 20 °C (Lamberts, Dutra e Pereira, 2014), para ambiente sem carga interna, que não se adapta ao clima do lugar. A faixa adaptativa da ASHRAE 55 vale para a temperatura interna de ambientes ventilados naturalmente; aplicada ao ar externo, tende a subestimar as horas quentes.',
          'Só a radiação direta: a DNI do arquivo, constante em cada hora, vezes o cosseno do ângulo de incidência e a fração ensolarada da janela (6 instantes por hora). A difusa e a refletida não entram.',
          'Nas horas do nascer e do pôr do sol, com o sol acima do horizonte em só parte da hora, a radiação na janela fica subestimada: a DNI da hora é distribuída pela hora inteira.',
          'Os percentuais e as partes de cada classe são das horas com sol na janela, não das 8760 horas do ano; horas sem DNI no arquivo ficam fora das somas e são contadas na tela.',
          'Dois percentuais, sem índice único: radiação bloqueada nas horas quentes e admitida nas frias. Juntá-los exigiria pesar o calor evitado contra o perdido, o que depende do edifício.',
        ],
      },
      {
        title: 'Vento (rosa dos ventos)',
        items: [
          'Vento medido na estação meteorológica (em geral a 10 m, em campo aberto), e não no terreno.',
          'Calmaria abaixo de 0,5 m/s, sem direção; as porcentagens são das horas válidas do filtro.',
          'Estações do ano pelos meses (dezembro a fevereiro, março a maio, junho a agosto, setembro a novembro).',
          'Correção de altura e terreno pela lei de potência do EnergyPlus: muda só a velocidade; o filtro térmico usa a classificação das horas do passo 7.',
        ],
      },
    ],
  },
};
