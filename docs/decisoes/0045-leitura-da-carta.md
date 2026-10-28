# 0045. Leitura de um ponto da carta

- Data: 2026-10-27
- Status: proposta (item b da decisão 0044; escolhas do Claude sem base clara, marcadas abaixo).

## Contexto

No piloto do F2.9 (problema 2 de `docs/ux/F2.9-piloto-P0.md`), quem não sabe ler a carta teve dificuldade para achar a altura e o azimute do sol na tarefa 1; a revisão antes do teste já apontava a falta de leitura sob o cursor (achado 6). O Anthony pediu que passar o mouse ou tocar mostre altura, azimute, data e hora no ponto (decisão 0044, item b).

Altura e azimute saem direto da inversa da projeção. Data e hora pedem uma escolha: um ponto do céu não é "um instante", é o lugar por onde o sol passa em certos dias, numa certa hora solar.

## Decisão

1. **A leitura é a do céu, e não a das linhas desenhadas.** Para o ponto sob o cursor ou o dedo: altura e azimute (1°, com o rumo); a hora solar em que o sol passa ali (pelo ângulo horário do ponto); e as datas em que passa (pela declinação do ponto contra a declinação do sol no ano de referência das trajetórias). Spec 03, seção 3.6.
2. **Proposta: duas datas.** Entre os solstícios, o sol passa por cada ponto duas vezes por ano, em datas simétricas ao solstício; a leitura diz as duas ("O sol passa aqui às 9h00 (hora solar) em 13/06 e 29/06"). A data de cada passagem é o dia em que a trajetória passa mais perto do ponto (a menos de 0,2°, dentro do disco do sol).
3. **Proposta: a borda do disco no solstício.** Além da trajetória do solstício, a menos do raio do disco solar (0,267°), a leitura dá a data do solstício com o aviso "a borda do sol passa aqui"; mais longe, "o sol nunca passa por aqui". Sem isso, um ponto em cima da linha grossa de 21/06, um pixel para fora, diria que o sol nunca passa ali.
4. **Proposta: hora solar sempre; hora legal com os analemas.** As linhas horárias padrão são em hora solar (como no ensino e no SOL-AR 6.2), e as tarefas falam em hora solar. Com a hora legal na carta (opções da carta, F4.3), a leitura dá também a hora legal de cada passagem, que muda de uma data para outra pela equação do tempo.
5. **Mouse e toque.** Com mouse ou caneta, a leitura acompanha o cursor e some quando ele sai da carta; no toque, fica no ponto tocado até o próximo toque, e arrastar continua rolando a página. A caixa fica ao lado do ponto, do lado com mais espaço (acima do dedo no toque); uma marca em cruz mostra o ponto. A marca não vai para as exportações (SVG e PNG) nem para a impressão.
6. **Sem anúncio ao leitor de tela** a cada movimento (aria-live desligado): a leitura é um complemento visual; a carta continua com o título e a tabela das células.

## Alternativas consideradas

- **Prender a leitura às linhas desenhadas** (a trajetória do dia 21 e a linha horária mais próximas): dá "21/06 às 9 h" em cima da interseção, mas mente entre as linhas, onde o sol também passa, e esconde a simetria das datas.
- **Uma data só** (a do semestre do passo 4): esconderia a outra passagem; o semestre da carta já mostra que as duas metades do ano se sobrepõem.
- **Com a paralaxe** (direção topocêntrica): muda a declinação em até 0,0024°, menos de um centésimo de pixel; deixaria o cálculo iterativo sem ganho visível.
- **Caixa fixa embaixo da carta:** no celular, aumentaria a área fixa no topo, já apontada como grande na revisão antes do teste (achado 4).

## Consequências

- Núcleo: `src/core/chart/readout.ts`, com o teste de referência `tests/referencia/leituraCarta.test.ts` (852 pontos do pvlib em 6 locais) e o de unidade (ida e volta pelo SPA, solstícios, equinócios).
- Interface: `src/ui/chart/ChartReadout.tsx`, em cada carta (também nas duas da comparação); dica no texto abaixo da carta e na ajuda.
- Perto dos solstícios, as duas datas ficam dias antes e depois de 21/06 (ou 21/12) mesmo com o cursor quase em cima da linha: a declinação quase não muda nessas semanas. É o comportamento físico, explicado na spec.
