# Primeira abertura no celular: antes e depois do carregamento sob demanda

- Data: 26/10/2026
- Achado 2c da inspeção visual da prévia da Fase 4; decisão 0039 (proposta).
- Script: `scripts/desempenho/primeira-abertura.mjs` (uso no cabeçalho dele).

## 1. Método

O mesmo da revisão do F2.9 (`docs/ux/F2.9-revisao-antes-do-teste.md`, seção 6): Pixel 7 emulado no Chromium do Playwright, CPU 4 vezes mais lenta e rede "Slow 4G" (150 ms de latência, 1,6 Mbit/s), como no Lighthouse. Cada abertura começa com o cache vazio e o service worker bloqueado; o link é `#local=florianopolis` (caminho básico, carta sem dados). Mediana de 5 aberturas, servindo o `dist/` sem gzip (como na revisão do F2.9) e com gzip (como o GitHub Pages serve).

Medidas: primeira pintura (`first-contentful-paint`), carta na tela (o SVG da carta visível), JavaScript transferido e tarefas longas (Long Tasks API, de mais de 50 ms) até 1,5 s depois da carta.

A CPU desta máquina limitada 4 vezes é mais lenta que um celular médio (revisão do F2.9, seção 6): os tempos absolutos são pessimistas; a comparação entre os builds, medidos na mesma máquina e na mesma sessão, é o que vale.

## 2. Resultado

| Build | JavaScript inicial (build) | Sem gzip: carta na tela | Com gzip: carta na tela | Maior tarefa longa |
|---|---|---|---|---|
| `main` (caminho das 9 tarefas do F2.9) | 332 kB (106 kB com gzip) | 3,76 s | 2,55 s | 1,3 s |
| Integração da Fase 4, antes | 699 kB (220 kB) | 6,00 s | 3,40 s | 1,4 s |
| Integração da Fase 4, depois | 472 kB (152 kB) | 4,82 s | 3,12 s | 1,4 s |

A primeira pintura fica de 0,02 a 0,08 s antes da carta em todos os casos (a carta sai no primeiro desenho). Na revisão do F2.9, a mesma medida sem gzip deu 3,5 s na `main`.

## 3. Leitura

- O carregamento sob demanda tirou 227 kB (68 kB com gzip) do JavaScript inicial: 1,2 s a menos sem gzip e 0,3 s a menos com gzip, na primeira abertura.
- Ainda sobram 0,6 s (com gzip) em relação à `main`: cerca de 45 kB com gzip a mais para baixar (0,2 s nesta rede) e o resto em leitura e execução do código. O que ficou no bloco inicial é do caminho básico ou do que ele desenha a partir do link: os textos em português das Fases 3 e 4 (títulos e resumos dos passos 6 e 7, do catálogo e do painel das projeções, mensagens do passo 1), o desenho das projeções e das camadas da Fase 3 na carta, e o núcleo da sombra que a carta usa quando o worker falha.
- A maior tarefa longa (1,3 a 1,4 s, igual nos três builds) é o primeiro desenho da carta, que já existia na `main`: calcula no navegador as trajetórias e as linhas horárias pelo SPA. Não é efeito das Fases 3 e 4; fica registrada em `docs/ideias.md` (calcular a geometria da carta no worker ou guardar por local).

## 4. Orçamento

`npm run orcamento` (no CI, depois do build) soma o JavaScript inicial e falha acima de 480 kB (156 kB com gzip), alguns kB acima dos 472 kB (152 kB) medidos. Subir o número exige mudar `scripts/orcamento-js.mjs` no mesmo PR, com o motivo.
