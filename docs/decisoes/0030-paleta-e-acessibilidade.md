# 0030. Paleta segura para daltonismo, teclado e contraste (F4.6)

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 13 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)).

## Contexto

As decisões 0013, 0015 e 0023 deixaram cores provisórias "até a paleta da Fase 4": a máscara vermelha e amarela, as rampas dos dados sobre a carta, as classes das horas, o mapa do ano e as camadas da Fase 3 na carta. A revisão do F2.9 deixou para o F4.6 três achados de gravidade 1: setas do teclado nas abas e nos grupos de botões (15), nomes acessíveis dos campos de ângulo (16) e contraste da grade da carta (17). A conferência foi feita com o método da skill de visualização de dados do projeto: ΔE em OKLab ×100 com a simulação de Machado, Oliveira e Fernandes (2009, severidade 1,0), alvo de 8 na protanopia e na deuteranopia e piso de 15 na visão normal, e contraste da WCAG 2.

## O que a conferência mostrou nas cores provisórias

- **Trajetória do sol (#b5651d) e curvas da sombra parcial do transferidor (#9a6700):** ΔE 5,3 na visão normal e 1,4 com daltonismo: quase a mesma cor, mesmo para quem enxerga todas as cores.
- **Linhas horárias (#1f4e79) e curvas da proteção (#005f73):** ΔE 5,7 na visão normal.
- **Com daltonismo:** linhas horárias e linhas em hora legal (#9c2f6b), 2,3; trajetória e contorno do período (#1a7f37), 2,5; hachuras da máscara total (#a40e26) e parcial (#7d4e00), 1,7.
- **Grade da carta (#d0d7de):** 1,45:1 sobre o branco (achado 17).
- **Sem problema:** as rampas sequenciais (um matiz, luminosidade monótona, passos de pelo menos 0,06), os dois braços da temperatura (ΔE 18,1 e 18,8 com daltonismo), as classes frias e quentes (18,8), o preenchimento da máscara total e parcial (9,6 na deuteranopia, a pior) e as cores da rosa dos ventos.

## Decisão

1. **Cores da carta em variáveis de CSS** (`:root` de `src/ui/styles.css`), conferidas por `tests/acessibilidade/paleta.test.ts`:

| Camada | Antes | Agora | Por quê |
|---|---|---|---|
| Grade (alturas e azimutes) | #d0d7de (1,45:1) | #8c959f (3,04:1) | achado 17; WCAG 1.4.11 |
| Curvas da sombra parcial do transferidor | #9a6700, tracejada | a cor do transferidor (#8250df), tracejada e mais fina, rótulo em itálico | eram iguais à trajetória do sol |
| Curvas da proteção (F3.2) | #005f73 | linha #4493a1, rótulo #2d6e7a (5,8:1), preenchimento a 20% | eram iguais às linhas horárias |
| Linhas em hora legal (F4.3) | #9c2f6b | #a01642 | ΔE 2,3 das linhas horárias com daltonismo |
| Contorno do período (F3.6) | #1a7f37 | #1c500e (o preenchimento verde fica) | ΔE 2,5 da trajetória com daltonismo |
| Hachura da sombra parcial (com dados na carta) | #7d4e00 | #b5820c | ΔE 1,7 da hachura total com daltonismo |

   Ficam: trajetória do sol, linhas horárias, transferidor, máscara total e parcial, rampas dos dados, classes, mapa do ano e rosa dos ventos.
2. **Regras conferidas nos testes:** cada par de linhas da carta com ΔE de pelo menos 15 na visão normal e 8 na protanopia e na deuteranopia (o pior par agora: 9,0); linhas com pelo menos 3:1 e rótulos com pelo menos 4,5:1 sobre o branco; grade com pelo menos 3:1; rampas sequenciais com um matiz e luminosidade caindo em passos de pelo menos 0,06; temperatura e classes com os dois lados distintos com daltonismo.
3. **O que não depende só da cor** (codificação secundária): máscara com hachuras de ângulos diferentes quando há dados na carta; sombra parcial tracejada; curva de 0% tracejada e de 100% grossa; linhas em hora legal tracejadas; rótulos nas curvas; legenda sempre presente; tabelas com os números. Os preenchimentos claros (máscara, sombra total das curvas, período) recuam para o fundo de propósito: a identidade vem do contorno, do rótulo e da legenda.
4. **Teclado** (achado 15): setas nas abas (esquerda e direita, Home e End) e nos grupos de botões de opção (as quatro setas), como nos padrões do WAI-ARIA APG, com tabindex itinerante (só a opção escolhida fica na sequência do Tab).
5. **Nomes acessíveis** (achado 16): cada campo de ângulo diz o símbolo, o que descreve, a sombra e o lado, ex.: "β (brises verticais), sombra total, esquerda", nos três idiomas.

## Alternativas consideradas

- **Paleta categórica genérica** (a de referência da skill, oito matizes em ordem fixa): validada, mas trocaria as convenções que o ensino já reconhece (sol alaranjado, máscara vermelha e amarela, transferidor violeta) sem necessidade; aqui só as camadas que falharam mudaram.
- **Grade preta ou mais grossa:** passa no contraste com folga, mas compete com os dados; o cinza de 3,04:1 com 0,75 px fica no limite pedido.
- **Contorno nas regiões da máscara** (para o preenchimento parcial ter 3:1 com o fundo): exigiria desenhar a borda exata de cada região; com o transferidor visível (o padrão), as curvas já desenham essas bordas. Fica em `docs/ideias.md`.

## Consequências

- Os testes de pixels das curvas (F3.2) passaram a reconhecer o azul-petróleo novo.
- As cores ficam documentadas em um lugar (variáveis de CSS) e conferidas a cada mudança.
- Se o Anthony preferir as cores antigas de alguma camada, o teste mostra o que se perde (o par que deixa de passar).
