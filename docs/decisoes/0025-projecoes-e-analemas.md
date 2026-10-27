# 0025. Outras projeções e linhas horárias em hora legal (F4.3)

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 8 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)).

## Contexto

O ROADMAP pede, no F4.3, as projeções equidistante e cilíndrica, cada uma com seu transferidor, e linhas horárias em hora legal (analemas) com o fuso do arquivo, para ensinar a diferença entre hora solar e hora legal. A spec v0 (seção 3.5) só dava as fórmulas básicas. Faltava decidir como a carta cilíndrica se orienta, como as camadas exatas da estereográfica (círculos e retas) passam para as outras projeções, como o desenho à mão se comporta e onde ficam as opções, sem complicar o fluxo básico.

## Decisão

1. **Equidistante polar**, r = R · z / 90°, com a orientação da estereográfica (Norte para cima, vista de cima). O horizonte tem o mesmo raio R.
2. **Cilíndrica centrada na normal da fachada**: x = R · ψ / 180°, y = R · h / 90° (carta de 2 × 1, escala vertical por grau o dobro da horizontal), com o azimute verdadeiro nos rótulos e a direção oposta à normal nas duas bordas.
3. **As mesmas camadas nas três projeções**, definidas por direções do céu. A região da máscara é o mesmo conjunto de direções; na estereográfica, as bordas continuam arcos e retas exatos; nas outras, polilinhas do círculo de borda amostrado a cada 0,5° na esfera.
4. **Desenho à mão:** vértices guardados como direções; arestas retas na carta estereográfica, como no SOL-AR 6.2, em qualquer projeção em que forem desenhadas (nas outras, aparecem curvas).
5. **Analemas:** sol às H:00 legais do fuso do arquivo, nos dias 1, 4, 7, … do ano de referência, de 5 a 19 h, só acima do horizonte; rótulo no solstício de inverno do local. Opção "hora solar" (padrão), "hora legal" ou "as duas".
6. **Impressão em escala:** R é o raio do horizonte nas projeções azimutais e a altura da faixa de 0° a 90° na cilíndrica.
7. **Onde fica:** um painel recolhido "Projeção e linhas horárias", no grupo "Avançado", antes do passo 6; a nota sob a carta diz a projeção e o tipo de linha horária. Estado no link: `proj` (`eq` equidistante, `cil` cilíndrica; em branco, estereográfica) e `hl` (`l` hora legal, `a` as duas; em branco, hora solar).

## Alternativas consideradas

- **Cilíndrica com o centro fixo** (Norte com latitude negativa, Sul com positiva), mantendo a carta parada e deslizando o transferidor, como a estereográfica gira o transferidor sobre a carta parada. É mais coerente com a estereográfica, mas, numa fachada voltada para o polo (Sul no Brasil), a máscara inteira cai na costura e aparece cortada nas duas bordas. Centrada na fachada, a carta cilíndrica é "a vista da janela": a parte do céu diante da fachada nunca é cortada.
- **Cilíndrica sem exagero vertical** (1° igual nos dois eixos, carta de 4 × 1): com R = 6 cm, 24 cm de largura, que não cabem numa folha A4 em pé.
- **Arestas do desenho à mão como arcos de círculo máximo:** mais naturais na esfera, mas mudariam as regiões já desenhadas na estereográfica (onde viram arcos, e não retas) e os links existentes.
- **Analemas com um ponto por dia:** 365 posições do sol por hora, cerca de três vezes o custo, sem diferença visível no traço.
- **Opções sob a carta:** no celular, a carta fica fixa no topo, e cada linha a mais nessa área esconde os passos (achado da revisão do F2.9); no grupo "Avançado", recolhidas, não mudam a tela de quem não as usa.

## Consequências

- Spec 03, seção 3.5 (projeções), e spec 02, seção 2.5.1 (analemas), detalhadas; núcleo em `src/core/chart/` (projeções, densificação e conversão de regiões) e camadas da interface parametrizadas pela projeção. A estereográfica continua desenhada como antes (os testes de pixels do F2 e do F3 não mudam).
- Referência independente: `docs/validacao/scripts/gerar_projecoes_analemas.py` (pvlib) e `tests/referencia/projecoes.test.ts`.
- A carta cilíndrica muda quando a fachada muda (fica centrada nela); a nota sob a carta diz isso.
- Se o Anthony preferir o centro fixo na cilíndrica, muda só o centro (um parâmetro da projeção); as camadas já tratam a costura dos dois lados.
