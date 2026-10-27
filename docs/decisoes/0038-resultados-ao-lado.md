# 0038. Resultados ao lado da carta no computador

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 22 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)). Na integração da Fase 3.

## Contexto

Na inspeção visual da prévia da Fase 4 (computador de 1366 × 900), o conteúdo pesado dos passos avançados ficava espremido na coluna dos passos, de cerca de 290 px: o mapa mês × hora do passo 6, a classificação das horas, os indicadores e a tabela das alternativas do passo 7 (e, na Fase 4, o mapa do catálogo, com 579 estações). Enquanto isso, o painel da direita, com cerca de 650 px, mostrava só a carta, com uma área em branco abaixo dela. A decisão 0023 pedia os passos 1 a 5 sem mudança.

## Decisão

1. **No computador** (página em duas colunas, a partir de 52rem de largura) e **com a aba "Carta solar"**, os resultados pesados de um passo avançado aberto vão para o painel da direita, **abaixo da carta**, na ordem dos passos, cada um com o cabeçalho "Do passo N, nome do passo":
   - passo 6: "Sombra ao longo do ano" (mapa mês × hora, legenda, hipóteses, tabela e exportações);
   - passo 7: as hipóteses da classificação, as barras e a tabela das classes, os indicadores e as alternativas (as hipóteses vão junto, como pede a decisão 0020, item 7).
2. **No passo fica uma linha**, "Sombra ao longo do ano: ao lado, abaixo da carta. [Ver]"; o botão rola até o resultado e põe o foco no cabeçalho dele. Os controles (método, limiares, peças, período) continuam no passo.
3. **O painel da direita acompanha a rolagem** com um passo avançado aberto, como já fazia (decisão 0023), e rola por dentro quando a carta e os resultados não cabem na altura da tela.
4. **No celular, nas abas "Vista 3D" e "Rosa dos ventos" e com o passo fechado**, nada muda: o resultado fica dentro do passo.
5. **Passos 1 a 5 sem mudança.** O mapa do catálogo do passo 1 (Fase 4, parte recolhida, fora do caminho básico) também vai para o painel da direita, mas **acima da carta**, à altura do passo 1, que fica no alto da página: abaixo da carta, ele começaria perto do pé da tela. A carta desce enquanto o catálogo está aberto e volta ao fechar.
6. Sem estado novo no link: o lugar do resultado depende só da largura da tela e da aba.

## Alternativas consideradas

- **Abas novas no painel da direita** ("Sombra no ano", "Efeito no ano"): esconderiam a carta enquanto se olha o mapa, e a comparação entre as curvas da carta e o mapa é o motivo do mapa (decisão 0018, item 6). Também alongariam a lista de abas do caminho básico.
- **Botão "ampliar" em cada resultado**, com o painel da direita trocando a carta pelo resultado: um clique a mais e um estado a mais para lembrar; o resultado continuaria espremido até o clique.
- **Coluna dos passos mais larga com um passo avançado aberto**: encolheria a carta, que é o resultado principal do passo 6 (curvas e máscara).
- **Rolagem independente das duas colunas** (painel da direita com altura da tela sempre): muda o comportamento do caminho básico, que a decisão 0023 preservou.

## Consequências

- Novo módulo `src/ui/layout/` (`SideSlot` e o contexto dos lugares), usado pelo mapa do ano e pelo passo 7; a física não muda.
- O componente continua montado no mesmo ponto da árvore do React (portal): os cálculos do ano no web worker não recomeçam quando o resultado muda de lugar.
- Teste de ponta a ponta `e2e/resultados-ao-lado.spec.ts`: lugar e largura no computador, volta ao passo com o passo fechado e em outra aba, e o celular sem mudança.
- Os testes que procuram o mapa ou os indicadores pelo `data-testid` continuam valendo nos dois lugares.
