# 0046. Desenho de onde se mede cada ângulo

- Data: 2026-10-27
- Status: proposta (item d da decisão 0044; escolhas do Claude sem base clara, marcadas abaixo).

## Contexto

No piloto do F2.9 (problema 4 de `docs/ux/F2.9-piloto-P0.md`), α, β, γ, AVS e AHS confundiram: o texto do passo 3 dizia em palavras de onde cada ângulo se mede ("α medido da base da janela, β da aresta oposta à aleta...") e citava AVS e AHS entre parênteses, sem figura. O Anthony pediu um desenho pequeno de corte e planta, atualizado com os valores digitados, nas duas referências, e AVS e AHS só na ajuda e no glossário (decisão 0044, item d).

As figuras da spec (`docs/spec/figuras/alfa.svg`, `beta.svg`, `gama.svg`, spec 01, seção 1.3) já mostram as definições; faltava trazê-las para a tela, com os números do usuário.

## Decisão

1. **Três desenhos, um por vez.** α no corte, β na planta e **γ na vista de dentro para fora** (proposta: a 0044 fala em "corte e planta", mas γ é medido no plano da fachada e não aparece em nenhum dos dois). Um grupo de três botões ("α no corte", "β na planta", "γ na vista") escolhe o desenho, com as setas do teclado.
2. **Proposta: o desenho segue o campo em foco.** Ao clicar num campo de α, β ou γ (também os índices 2 e os da sombra parcial), o desenho passa para o do ângulo daquele campo. Abre no de α. Os três lado a lado ficariam pequenos demais para ler na coluna dos passos (e no celular), e um embaixo do outro alongariam o passo 3, o contrário do item a da 0044.
3. **Geometria com o valor digitado, sem limite.** O ângulo desenhado é o digitado, na referência escolhida (interna: α e β a partir do plano da fachada, γ a partir da vertical; externa: α a partir da horizontal, β a partir da normal, γ a partir da horizontal; spec 01, seção 1.3). Um brise longo sai do quadro e é cortado, em vez de o desenho encolher o ângulo para caber. A linha de referência fica tracejada na cor de destaque, o arco do ângulo e o rótulo ("α 50°") na cor do sol, e o raio vai do ponto de medida até o sol, na borda do quadro.
4. **Sem valor, um exemplo de 45°**, em cinza tracejado e com o rótulo só com o símbolo ("α"), para mostrar onde se mede antes de digitar.
5. **Sombra total.** O desenho usa os ângulos da sombra total (índice 1). Os índices 2, o γ das aletas e a sombra parcial continuam explicados no texto de "Mais opções".
6. **AVS e AHS saem do passo 3** e ficam na ajuda: nas definições de α e β e da referência interna, como antes, e em duas entradas próprias do glossário, "AVS (ângulo vertical de sombreamento)" e "AHS (ângulo horizontal de sombreamento)", com a definição da INI-C (Inmetro, 2020, itens 4.7 e 4.8) e a equivalência com α e β na referência interna.
7. **Acessível.** Cada desenho é uma imagem com nome que diz o ângulo, o valor e de onde se mede ("Corte da janela: α 50°, do peitoril até a aresta externa do brise, medido a partir do plano da fachada.").

## Alternativas consideradas

- **As figuras da spec, fixas:** mostram a definição, mas não o valor digitado; o problema do piloto era ligar o número ao desenho.
- **Os três desenhos sempre visíveis:** pequenos demais na coluna ou longos demais em sequência (item 2).
- **Desenho em 3D da janela com as peças:** já existe na aba "Vista 3D" (Fase 3), a partir das dimensões do passo 6; o passo 3 trabalha com ângulos, e o corte, a planta e a vista são o vocabulário do ensino (princípio 4).

## Consequências

- Interface: `src/ui/protractor/AngleDiagrams.tsx` e `angleView.ts`, no passo 3, abaixo dos campos da sombra total. O texto do passo perde a frase de onde se mede cada ângulo, que o desenho mostra.
- Ajuda: duas entradas novas no glossário, nos três idiomas.
- Teste de ponta a ponta (`e2e/angulos.spec.ts`): o ângulo entre o raio e a linha de referência, lido das coordenadas do próprio desenho, é o digitado, nas duas referências, para α, β (dos dois lados) e γ; a ponta da peça fica no raio; pixels da peça e do sol; exemplo sem valor; teclado, axe e celular.
- Orçamento do JavaScript inicial: o desenho vai no conteúdo do passo 3, que fica fora do bloco inicial (decisão 0044, consequências); entram no bloco só os textos em português (de 461,4 para 462,2 kB).
