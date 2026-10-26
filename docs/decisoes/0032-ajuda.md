# 0032. Ajuda dentro da aplicação, com exemplos resolvidos do tutorial da UFU (F4.8)

- Data: 2026-10-26
- Status: proposta (F4.8 na branch de integração da Fase 4; a confirmar com o Anthony no portão 4)

## Contexto

O ROADMAP pede, no F4.8, guia rápido, glossário, perguntas frequentes e 3 exemplos resolvidos, porque o SOL-AR 6.2 não tinha manual nem suporte. A instrução da sessão acrescenta que os exemplos incluam os pontos do tutorial do SOL-AR da UFU (Bortoli e Saramago) já levantados nos relatórios do F2.3 e do F3.6: o α2 medido da verga e não do peitoril, os 55° lidos contra os 57,5° exigidos pelo período e a curva de 0% com o vidro recuado; e que a ajuda traga as hipóteses dos indicadores. A aplicação é estática, funciona sem internet e tem três idiomas.

## Decisão (proposta)

1. **Ajuda dentro da aplicação**, num diálogo modal aberto pelo botão "Ajuda" do cabeçalho, com cinco partes em abas: guia rápido, exemplos resolvidos, glossário, perguntas frequentes e hipóteses e limites. A parte aberta fica no link (`ajuda=guia`, `exemplos`, `glossario`, `perguntas`, `hipoteses`), para que um professor ou a página do LabEEE possa apontar direto para uma delas. Fecha com Esc, com o botão ou com um clique fora; o foco volta ao botão.
2. **Texto como dados tipados por idioma** (`src/ui/help/help.pt-BR.ts`, `help.es.ts`, `help.en.ts`), com a mesma estrutura nos três (conferida em teste), fora dos catálogos de frases curtas da interface. Termos do glossário técnico (`docs/i18n/glossario-tecnico.md`); espanhol e inglês a revisar por falantes nativos, como o resto da interface.
3. **Três exemplos com o caso de Brasília do tutorial da UFU**, em sequência: (1) ângulos lidos (55°) contra os exigidos pelo período (57,5°); (2) do ângulo às dimensões, com o vidro recuado (α do peitoril junto ao vidro, D = H · tan α − d, curva de 0% reduzida a um ponto); (3) o brise afastado (α2 medido da verga; o desenho do tutorial sombreia a janela inteira em 18% dos instantes do período). Cada exemplo abre **numa nova aba**, por um link comum, com um cartão no alto dos passos (`exemplo=<id>`) que acompanha o passo a passo; a aba de origem não muda.
4. **Cada número dos exemplos é conferido pelo núcleo**, a partir do próprio link do exemplo (`tests/referencia/ajudaExemplos.test.ts`), e o brise afastado também contra o traçado de raios independente do F2.3. Os textos em espanhol e inglês têm de trazer os mesmos ângulos, percentuais e medidas do português (teste).
5. As hipóteses de cada parte (carta, máscara pelos ângulos, proteção pelas dimensões, dados, classificação e indicadores, vento) ficam reunidas na ajuda, com o mesmo conteúdo das frases curtas de cada passo.

## Alternativas consideradas

- **Manual em PDF ou páginas de documentação fora da aplicação:** mais fácil de imprimir, mas não abre os exemplos no estado certo, não acompanha o idioma escolhido e envelhece separado do código.
- **Painel lateral não modal:** deixaria a carta à vista enquanto se lê, mas cobre a carta ou os passos numa tela de computador comum e não cabe no celular; o cartão do exemplo faz esse papel onde ele importa.
- **Abrir o exemplo na mesma aba:** mais direto, mas troca o link inteiro e perde o estudo em andamento (inclusive um arquivo climático carregado) sem aviso.
- **Exemplos com casos novos:** o tutorial da UFU é o material que alunos e professores já usam, e os três pontos dele já estavam verificados nos relatórios; refazê-lo mostra o método e as correções do novo de uma vez.

## Consequências

- Componentes em `src/ui/help/`; chaves `ajuda` e `exemplo` no link (não se traduzem, como as demais).
- `e2e/ajuda.spec.ts`: abertura pelo cabeçalho e pelo link, setas nas abas, Esc e clique fora, foco de volta, exemplos abertos numa nova aba com os valores na tela, cartão, idiomas, axe nas cinco partes, tela cheia no celular e fora da impressão.
- Relatório `docs/validacao/relatorios/F4.8-exemplos.md`: de onde vem cada número e o que mudou em relação aos relatórios do F2.3 e do F3.6.
- O tutorial guiado e os textos de apoio do F4.5 podem reaproveitar o cartão do exemplo.
