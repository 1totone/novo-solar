# Changelog

Todas as mudanças relevantes do projeto. Formato baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões seguem o [SemVer](https://semver.org/lang/pt-BR/), com 0.x durante o desenvolvimento.

## [Não lançado]

### Adicionado

- Carta solar estereográfica (`src/core/chart/`, `src/ui/chart/`): horizonte, círculos de altura, azimutes, trajetórias nos solstícios, nos equinócios e no dia 21 dos outros meses, linhas horárias em hora solar verdadeira; solstícios e equinócios calculados pelo SPA. Prévia na página inicial, para Florianópolis.
- Posição solar pelo NREL SPA (`src/core/solar/`): ângulo zenital, azimute, ângulo horário, declinação, equação do tempo, nascer, pôr e passagem meridiana; conversão entre hora legal e UTC com o fuso do EPW e instantes das horas do EPW (fim e meio do intervalo). Conferida contra o pvlib e contra o caso publicado do SPA.
- Leitor de EPW (`src/core/epw/`): cabeçalho, 8760 ou 8784 horas, códigos de ausente, checagens de sequência e de valores, com mensagens de erro em português que indicam linha e campo. Conferido contra o `pvlib.iotools.read_epw` nos 6 EPWs de teste.
- CI baixa os EPWs de teste (com cache) e roda os testes de referência.

## [0.0.0] - 2026-10-23 (v0.0, Fundação)

Portão 0 aprovado pelo Anthony (decisão 0011).

### Adicionado

- Dados e casos de referência (`docs/validacao/`): manifesto e script de download dos 6 EPWs de teste, dados do SOL-AR 6.2 extraídos do instalador, posição solar de referência com o pvlib e o caso publicado do NREL SPA.
- Especificação v0 (`docs/spec/`): convenções geométricas com α, β e γ nas referências interna e externa do SOL-AR 6.2 (figuras e diagramas originais), tempo e posição solar (SPA, fuso do EPW, convenção de hora), projeção estereográfica e curvas exatas do transferidor, formato dos dados climáticos e tolerâncias.
- Estrutura técnica: Vite, React e TypeScript (strict), com `src/core/` (cálculos puros) separado de `src/ui/` e a separação verificada pelo ESLint; Prettier, Vitest e Playwright.
- Página "em construção" com a tela "Sobre" e os créditos da versão original; textos pela estrutura de tradução (português) e estado da tela no `#` da URL.
- CI no GitHub Actions (formatação, estilo, tipos, testes de unidade, build e ponta a ponta em computador e celular) e publicação no GitHub Pages com prévia de cada PR.
- Fundação do projeto: `CLAUDE.md` com as regras de trabalho, roteiro em `docs/ROADMAP.md`, decisões iniciais em `docs/decisoes/`, diagnóstico do SOL-AR 6.2, esqueletos da especificação e da validação, estacionamento de ideias.
