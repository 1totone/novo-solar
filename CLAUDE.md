# CLAUDE.md

Instruções para o Claude Code neste repositório. Leia este arquivo e `docs/ROADMAP.md` no início de toda sessão.

## O projeto

Nova versão do **SOL-AR** (LabEEE/UFSC): carta solar, transferidor de ângulos e projeto de proteções solares no navegador, com dados climáticos atuais. Pedida pelo Prof. Roberto Lamberts; a manutenção futura será do LabEEE.

Dono do produto e validador técnico: **Anthony Aliardi** (engenheiro civil, mestrado em eficiência energética e desempenho térmico, usuário avançado de EnergyPlus). Ele decide produto, física e didática.

Mapa dos documentos:

- `docs/ROADMAP.md`: fases, passos, critérios de pronto e o "Você está aqui". **Fonte da verdade.**
- `docs/decisoes/`: decisões já tomadas. Não rediscutir sem fato novo.
- `docs/spec/`: especificação técnica (convenções, fórmulas, algoritmos, tolerâncias).
- `docs/validacao/`: casos de referência e relatórios de validação.
- `docs/referencias/diagnostico-solar-6.2.md`: engenharia reversa do SOL-AR 6.2 (interface, fórmulas, dados e erros conhecidos).
- `docs/ideias.md`: estacionamento de ideias fora da fase atual.

## Princípios (desempate de qualquer decisão)

1. **Simples primeiro.** O fluxo básico (local, carta, transferidor, máscara) nunca fica mais complicado; o que é avançado fica recolhido.
2. **Correto e verificável.** Todo cálculo físico tem teste contra referência independente, com tolerância documentada na spec.
3. **Transparente.** Origem, período e qualidade dos dados sempre visíveis; hipóteses de cada indicador explícitas.
4. **Didático.** Preserva o método e o vocabulário do ensino brasileiro (α, β, γ, transferidor, referência interna e externa).
5. **Acessível.** Navegador, sem instalação, offline, PT/ES/EN, computador modesto e tablet.
6. **Aberto e sustentável.** Código aberto, sem dependências pagas, sem servidor, sem coleta de dados pessoais.

## Modo de trabalho: autônomo

O Anthony quer que você conduza o projeto sem pedir permissão a cada ação.

- Siga o ROADMAP a partir do "Você está aqui", passo a passo, sem esperar confirmação entre passos.
- **Um passo por PR.** Branch `claude/<passo>-<descricao>` (ex.: `claude/f0.3-estrutura`), commits pequenos e descritivos. Abra o PR pela API REST com `gh api` (o `gh pr` usa GraphQL e não funciona nas sessões na nuvem). Integre com merge squash, também pela API, quando o CI passar e a definição de pronto estiver atendida.
- **Pare e reporte ao Anthony apenas:**
  1. nos portões de fase: resumo do que foi feito, link da prévia e o que ele deve conferir;
  2. quando faltar uma decisão de produto ou de física que o ROADMAP, as decisões e a spec não cobrem (proponha uma recomendação);
  3. quando algo exigir ação dele (configuração do GitHub, domínios de rede do ambiente, arquivos que você não consegue obter).
- **Ao terminar um passo,** no mesmo PR: marque `[x]` no ROADMAP, atualize o "Você está aqui", a seção "Não lançado" do `CHANGELOG.md` e registre decisões novas em `docs/decisoes/`.
- Se a sessão for terminar ou o contexto estiver longo, deixe a `main` verde e o ROADMAP atualizado; a próxima sessão continua dali.
- Ideias que não pertencem à fase atual vão para `docs/ideias.md`, não para o código.

## Definição de pronto (todo passo)

- Testes automatizados passando no CI.
- Cálculo físico: teste contra referência independente (pvlib/NREL SPA, casos analíticos, EnergyPlus), dentro da tolerância da spec. **O teste de referência vem antes da implementação.**
- Documentação atualizada (spec e/ou ajuda), ROADMAP e CHANGELOG.
- Prévia publicada no GitHub Pages.

## Stack e arquitetura

- TypeScript (strict) + Vite + React. D3 para SVG (carta e gráficos). Three.js para 3D. Vitest (unidade) e Playwright (ponta a ponta e visual).
- Aplicação 100% estática: sem backend, sem contas, sem rastreamento.
- **Build portátil:** caminhos relativos (`base: './'`), estado na URL via `#`, nenhuma rota de servidor. Precisa rodar igual no GitHub Pages, num subdomínio do LabEEE ou numa pasta de servidor.
- `src/core/`: cálculos puros (EPW, posição solar, projeções, transferidor, máscaras, vento, indicadores), sem dependência de interface. `src/ui/`: componentes React. A interface nunca contém física.
- Publicação: GitHub Actions roda verificação de estilo, testes e build, e publica no GitHub Pages; cada PR ganha uma prévia própria.

## Convenções

- Interface em português do Brasil, com estrutura de tradução (PT/ES/EN) desde o início. Nomes no código em inglês. Documentação, PRs e mensagens de commit em português.
- Textos para o Anthony (relatórios, PRs, mensagens): diretos, rigorosos, sem travessões.
- Unidades SI na interface (°C, m/s, W/m², Wh/m²); vírgula decimal em português.
- Física (detalhes em `docs/spec/`):
  - azimute a partir do Norte geográfico, sentido horário; orientação da fachada pela normal externa;
  - posição solar pelo NREL SPA;
  - conversão entre hora legal e hora solar com o fuso do cabeçalho do EPW, nunca com meridiano fixo (o SOL-AR 6.2 fixava 45°W, ver diagnóstico);
  - EPW: cada valor se refere à hora que termina; radiação integrada na hora anterior, posicionada no meio do intervalo.

## Ambiente (sessões do Claude Code na nuvem)

- Node 22 já instalado. Dependências com `npm ci` (ou `npm install` enquanto não houver lockfile).
- Git: o push funciona pelo proxy da sessão; não é possível enviar tags nem apagar branches. A criação de releases pela API também é bloqueada nas sessões na nuvem; as releases saem do workflow `release.yml` a partir do `CHANGELOG.md` (decisão 0012): no PR do portão aprovado, mova "Não lançado" para a seção `## [X.Y.Z] - AAAA-MM-DD (vX.Y, Nome)` e atualize a versão no `package.json`.
- Se a rede da sessão bloquear o download de navegadores do Playwright ou de arquivos climáticos, peça ao Anthony para liberar os domínios no ambiente (ROADMAP, seção 7) e, enquanto isso, rode esses testes no CI.

## Comandos

| Comando | O que faz |
|---|---|
| `npm ci` | Instala as dependências exatas do `package-lock.json`. |
| `npm run dev` | Servidor de desenvolvimento (Vite). |
| `npm run check` | Formatação, estilo, tipos e testes de unidade: o que o CI roda antes do build. |
| `npm run format` / `format:check` | Prettier (Markdown e `docs/` ficam de fora). |
| `npm run lint` | ESLint, sem avisos tolerados; impede `src/core/` de importar React, `src/ui/` ou APIs do navegador. |
| `npm run typecheck` | TypeScript (strict) em todos os projetos. |
| `npm test` | Testes de unidade (Vitest), inclusive os de física. |
| `npm run build` | Build de produção em `dist/`, com caminhos relativos; em `dist/teste/`, a página do teste do F2.9 sem moderador (build próprio, decisão 0042). |
| `npm run orcamento` | Soma o JavaScript inicial do `dist/` (com e sem gzip) e falha acima do orçamento (decisão 0039). Rode `npm run build` antes. |
| `npm run test:e2e` | Playwright no build de produção (`dist/`), servido numa subpasta (`/qualquer/pasta/`), em computador e celular. Rode `npm run build` antes. |

Notas:

- Versões fixadas: TypeScript 6.0 (o `typescript-eslint` ainda não aceita o 7) e `@playwright/test` 1.63.0, que usa o Chromium pré-instalado nas sessões na nuvem (`/opt/pw-browsers`). Ao atualizar o Playwright, confira se a sessão tem o navegador correspondente; no CI ele é baixado.
- Publicação: `.github/workflows/pages.yml` (decisão 0008). Site em `https://1totone.github.io/novo-solar/`; prévia de cada PR em `.../pr/<número>/`, com link no status "Prévia" do PR.
- Na sessão, o `gh api` não acessa `/actions` nem `/pages`; o estado do CI se lê pelas ferramentas `mcp__github__*` (ex.: `actions_list`, `get_job_logs`).

## Nunca

- Mudar a licença (MIT) ou remover os créditos da versão original: Roberto Lamberts, Alexandra Albuquerque Maciel e Edson T. Ono.
- Adicionar servidor, coleta de dados pessoais, cookies de rastreamento ou dependências pagas.
- Fazer force-push na `main` ou integrar com o CI vermelho.
- Afirmar que algo "faz sentido físico" sem verificação. O Anthony valida a física e espera rigor.
