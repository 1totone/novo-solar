# 0039. Carregamento sob demanda e orçamento do JavaScript inicial

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 23 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)). Na integração da Fase 3, para os passos 6 e 7 e a vista 3D, e na da Fase 4, para o resto.

## Contexto

Na revisão do F2.9 (24/10/2026), o JavaScript da aplicação tinha 330 kB (104 kB com gzip) e a primeira abertura num celular emulado (Pixel 7, CPU 4 vezes mais lenta, Slow 4G) levava 3,5 s até a carta. A inspeção da prévia da Fase 4 mediu 739 kB (231 kB com gzip) no bloco inicial: tudo o que as Fases 3 e 4 acrescentaram vinha junto, mesmo o que o caminho básico (local, carta, transferidor, máscara) nunca usa. Os maiores itens eram os textos em espanhol e inglês (114 kB), a ajuda nos três idiomas (86 kB) e os passos 6 e 7 (cerca de 50 kB).

## Decisão

1. **Fica no bloco inicial só o caminho básico** (passos 1 a 5, carta, transferidor, máscara, dados na carta, rosa dos ventos) e o que a carta desenha a partir do link.
2. **Carregados sob demanda** (`import()`), cada um no seu bloco:
   - os passos 6 e 7, quando abertos; enquanto recolhidos, a aplicação mostra só o cabeçalho deles (título e resumo, iguais aos do passo), e o foco volta ao resumo quando o passo chega;
   - a aba "Vista 3D" (o Three.js já vinha sob demanda);
   - na Fase 4: os textos em espanhol e em inglês (só o idioma em uso, carregado antes do primeiro desenho, para a página não aparecer em português e trocar), a ajuda (ao abrir, só no idioma da interface), os cartões dos exemplos, do tutorial guiado e dos exercícios (com o link deles), o corpo do catálogo nacional (ao abrir) e o corte e a vista da impressão (com uma janela no link).
   - Ficam no bloco inicial, por serem pequenos ou usados pela carta a partir do link: o painel "Projeção e linhas horárias" (cerca de 2 kB) e o desenho das projeções, as camadas da Fase 3 e o núcleo da sombra que a carta usa quando o worker falha.
3. **Orçamento no CI:** `npm run orcamento` soma o JavaScript inicial do `dist/` (o script de entrada, os `modulepreload` e o que eles importam de forma estática) e falha acima do limite. O limite fica alguns kB acima do medido, para que qualquer acréscimo ao caminho básico seja uma escolha explícita (mudar o número no `scripts/orcamento-js.mjs`, no mesmo PR, com o motivo).
4. **Medida da primeira abertura** com `scripts/desempenho/primeira-abertura.mjs`, no mesmo método da revisão do F2.9, com e sem gzip, como mediana de 5 aberturas com o cache vazio. Resultado em `docs/ux/F4-acabamento-desempenho.md`: na integração da Fase 4, de 699 kB (220 kB com gzip) para 472 kB (152 kB); a carta chega em 3,12 s com gzip, contra 3,40 s antes e 2,55 s na `main`. Orçamento: 480 kB (156 kB com gzip).

## Alternativas consideradas

- **Só o aviso do Vite (500 kB por bloco):** não distingue o caminho básico do resto e não mede o gzip.
- **Pré-carregar os blocos avançados depois da primeira pintura:** gasta dados no celular de quem nunca abre os passos avançados; o bloco do passo leva de 0,1 a 0,3 s para chegar quando aberto.
- **Separar também os textos em português das Fases 3 e 4:** os títulos e resumos dos passos 6 e 7 e as mensagens do passo 1 aparecem no caminho básico; o ganho (cerca de 10 kB com gzip) não paga a complexidade.

## Consequências

- O primeiro clique num passo avançado espera o bloco dele ("Carregando o passo…"); depois fica guardado pelo navegador e pelo service worker (decisão 0031).
- Um passo recolhido não monta o corpo: o estado local dele (por exemplo, o tipo de peça escolhido para acrescentar) recomeça ao reabrir; o estado do link não muda.
- Teste de ponta a ponta `e2e/sob-demanda.spec.ts`: o caminho básico não baixa os blocos avançados, e abrir o passo baixa só o dele.
