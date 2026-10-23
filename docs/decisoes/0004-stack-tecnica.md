# 0004. Stack técnica e arquitetura

- Data: 2026-10-23
- Status: aceita

## Contexto

O programa precisa rodar no navegador, sem instalação e sem servidor, em computadores modestos e tablets, com gráficos interativos (carta solar, transferidor, mapas mês × hora), uma vista 3D e cálculos físicos verificáveis. Deve ser fácil de manter por pessoas do meio acadêmico.

## Decisão

- **Linguagem e base:** TypeScript (strict), Vite, React.
- **Gráficos 2D:** SVG com D3 (escalas, caminhos, projeções).
- **3D:** Three.js.
- **Testes:** Vitest (unidade, incluindo os testes de física) e Playwright (ponta a ponta e visual).
- **Arquitetura:** `src/core/` com cálculos puros, sem dependência de interface; `src/ui/` com os componentes. A interface nunca contém física.
- **Aplicação estática e portátil:** caminhos relativos (`base: './'`), estado na URL via `#`, nenhuma rota de servidor. Roda igual no GitHub Pages, num subdomínio ou numa pasta de servidor; instalável e utilizável offline (PWA) na Fase 4.

## Alternativas consideradas

- **Svelte:** mais leve, mas com comunidade menor para manutenção futura.
- **Aplicativo desktop (Python, C++ ou similar):** exigiria instalação e versões por sistema operacional, o mesmo problema do SOL-AR 6.2.
- **Planilha:** acessível, mas sem a interatividade e a vista 3D necessárias.

## Consequências

- Os testes de física rodam no núcleo, sem navegador, rápidos e determinísticos.
- Qualquer navegador moderno executa a aplicação; não há custo de servidor.
- Testes visuais dependem de navegadores do Playwright, que rodam sempre no CI.
