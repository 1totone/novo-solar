# 0051. Pontos marcados na carta

- Data: 2026-10-28
- Status: proposta (pedido do Anthony, 28/10/2026, na integração da Fase 4, depois do leiaute em colunas da decisão 0050). As escolhas de detalhe marcadas como **proposta** são do Claude, sem base clara, e podem ser revistas no teste com participantes ou no portão 2.

## Contexto

A leitura da carta (decisão 0045) mostra a altura, o azimute e quando o sol passa pelo ponto sob o cursor ou o dedo, mas some quando o cursor sai. O Anthony pediu que um clique marque o ponto: até 3 pontos, numerados, com uma tabela que diga, para cada um, a leitura e os ângulos α e β do transferidor para aquele ponto, na referência escolhida e relativos à fachada do passo 2. É a ponte entre a carta e o passo 3: "que α preciso para sombrear este ponto do céu?".

## Decisão

1. **Como se marca.**
   - Mouse ou caneta: um clique (botão principal, sem arrastar mais de 4 px) marca o ponto sob o cursor. A caixa da leitura diz o que o clique faz: "Clique para marcar o ponto 2."; em cima de um ponto marcado, "Ponto 2 marcado aqui." (o clique ali não marca outro, o que também evita dois pontos com um duplo clique).
   - Toque: tocar só mostra a leitura, como antes; a caixa ganha o botão "Marcar ponto". Arrastar continua rolando a tela.
   - Teclado: o botão "Digitar ponto" abre um formulário com a altura (0° a 90°) e o azimute (graus, ou um rumo como na orientação da fachada, decisão 0044, item c), com o foco na altura.
   - Com o desenho à mão da máscara em andamento, o clique é do desenho e não marca pontos.
2. **Até 3 pontos, com número fixo.** Remover o ponto 2 não renumera o 3; o próximo ponto marcado ocupa o menor número livre. Cada número tem uma forma: 1, círculo; 2, quadrado; 3, losango; todos brancos, com contorno escuro e o número dentro (cerca de 19 px na tela; meio tamanho de 0,045 do raio da carta). Assim os pontos se distinguem pela forma e pelo número, sem depender da cor, e o branco aparece sobre qualquer camada (células pintadas, máscara, transferidor). **Proposta:** as formas e o tamanho, e nenhuma cor por ponto. Com 3 pontos, a leitura já avisa e o próximo clique (ou "Marcar ponto", ou o formulário) mostra, embaixo da carta: "Já há 3 pontos marcados: remova um para marcar outro."
3. **Tabela embaixo da carta, na coluna do meio. Proposta.** Colunas: o marcador do ponto, altura, azimute (com o rumo), quando o sol passa ali (hora solar e datas, como na leitura; hora legal com os analemas), α e β (β com o lado, d ou e) e um botão para remover; "Limpar pontos" tira todos. Ao lado do título, a referência ("α e β na referência interna"); a legenda da tabela, para o leitor de tela e para a folha impressa, diz também a fachada ("para a fachada de 30° (NNE)"). Atrás da fachada, "atrás da fachada" no lugar de α e β. Valores a 1°.
   - Por que ali: fica junto de onde se marca e no mesmo lugar nos três leiautes e na impressão; as colunas laterais são dos passos (decisão 0050), e a da esquerda não tem sobra em 1366 × 768.
   - Sem pontos, o painel não ocupa espaço: o título e o botão "Digitar ponto" aparecem quando o botão recebe o foco pelo teclado. A carta fica do tamanho da decisão 0050.
   - Com pontos, a tabela é compacta (uma linha por ponto, cerca de 24 px). Medido com 3 pontos e a Inter: cabe entre a carta e o pé da janela em 1366 × 768, 1536 × 864 e 1920 × 1080 (sobram 3 px). Com a DejaVu Sans (a fonte do CI) ou em 1024 × 768, passa cerca de 10 px, e a coluna do meio rola só isso. Com dados pintados, a legenda das faixas vem depois da tabela e passa a pedir a rolagem da coluna.
   - Celular: a tabela embaixo da carta; enquanto houver pontos, a carta deixa de ficar fixa no topo, como com a tabela das células aberta (com a tabela, a área fixa passaria de metade da tela).
4. **α e β do ponto**: os ângulos que a direção faz com a fachada nas grandezas do transferidor (spec 01, seção 1.3): tan α_ext = tan h / cos ψ e β_ext = |ψ|, do lado de ψ; na referência interna, 90° menos o externo. É o α (ou o β) da proteção infinita cuja borda passa pelo ponto. Spec 03, seção 3.7.
5. **Estado no link:** `pm1`, `pm2` e `pm3`, cada um "altura_azimute" em graus, com ponto decimal e uma casa (0,1° é cerca de 0,3 px numa carta de 600 px). O arquivo de projeto guarda o estado do link, então guarda os pontos sem mudar de esquema (spec 11). A configuração A da comparação desenha os pontos do link dela, sem tabela.
6. **Impressão e imagens:** os marcadores fazem parte da carta e vão para a impressão em escala e para o SVG e o PNG; a tabela vai para a folha impressa, com a legenda e sem os botões. Com "Só o transferidor", nem marcadores nem tabela. A imagem exportada leva só os marcadores: a tabela não é parte do desenho da carta. **Proposta.**
7. **Nas três projeções**, pela projeção direta (marcador) e pela inversa (clique) da projeção ativa (spec 03, seção 3.5); na cilíndrica, centrada na normal da fachada.
8. **Acessibilidade:** os marcadores ficam fora da árvore de acessibilidade (a tabela leva a informação); tabela com legenda e cabeçalhos de linha e de coluna; botões "Remover o ponto n", com o foco passando ao ponto seguinte (ou ao anterior; sem pontos, ao "Digitar ponto"); erros do formulário ligados aos campos; aviso discreto ao leitor de tela ao marcar, remover e limpar, e visível com 3 pontos.
9. **Carga:** a tabela e o formulário vêm sob demanda (decisão 0039); o JavaScript inicial fica em 477,8 kB (155,1 kB com gzip), dentro do orçamento de 480 kB (156 kB).

## Alternativas consideradas

- **Tabela na coluna da direita ou da esquerda:** longe de onde se marca e no meio dos passos; a da esquerda não tem sobra em 1366 × 768.
- **Encolher a carta quando há pontos:** a carta mudaria de escala a cada ponto, e o ponto clicado sairia de baixo do cursor.
- **Reservar espaço fixo para a tabela** (reserva de 12rem para cerca de 15rem): a carta ficaria cerca de 48 px menor sempre, por uma função opcional, contra a decisão 0050, item 3.
- **Uma cor por ponto:** a forma e o número já distinguem; cores a mais competem com as camadas da carta e não servem a quem não distingue cores.
- **Renumerar depois de remover:** o "ponto 3" de uma anotação viraria "ponto 2", e a forma mudaria junto.
- **Duplo clique para marcar:** mais difícil de descobrir e de fazer no trackpad. O clique simples não tinha outro uso na carta no computador (na célula pintada, o valor já aparece com o mouse em cima).
- **γ também na tabela:** o pedido é α e β; γ depende do lado e de um brise finito, e alargaria a tabela. Fica para o teste com participantes dizer se faz falta.

## Consequências

- Núcleo: `src/core/protractor/pointAngles.ts`, com o teste `pointAngles.test.ts` (casos analíticos; o ponto sobre a curva de α e a reta de β de `protractor.ts` em 2.000 direções; a máscara de `mask.ts` com meio grau a mais e a menos, nas duas referências). Um erro de 0,01° em α faz o teste falhar.
- Interface: `PointMarkers.tsx`, `PointsPanel.tsx` (sob demanda), `readingText.ts` (os textos da leitura, comuns à caixa e à tabela), `ChartReadout.tsx` (clique e botão) e `ChartView.tsx`. Estado: `pointsHash.ts`, com teste; o teste do arquivo de projeto passa a levar dois pontos.
- Ponta a ponta: `e2e/pontos.spec.ts` (clique, forma, número e pixels dos marcadores; o quarto clique; remover e limpar; o link; α e β contra a fórmula, nas duas referências e com outra fachada; teclado; axe; equidistante e cilíndrica; impressão e SVG; toque no celular).
- O clique na carta passa a ter efeito: quem clicar só para ver um valor marca um ponto, que "Limpar pontos" ou o botão da linha tira.
- Spec 03, seção 3.7; spec 11, tabela do que o link guarda; ajuda (aba "Carta solar") e a explicação da carta no "i".
