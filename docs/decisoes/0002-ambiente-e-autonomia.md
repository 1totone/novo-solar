# 0002. Claude Code na nuvem em modo autônomo; Codespaces como complemento

- Data: 2026-10-23
- Status: aceita

## Contexto

O computador do Anthony tem pouco espaço livre, e ele prefere trabalhar na nuvem. Ele também quer que o Claude conduza o desenvolvimento sem pedir permissão a cada ação, revisando nos portões de fase.

## Decisão

- Ambiente principal: sessões do Claude Code na nuvem (claude.ai/code, também acessível pelo app desktop e pelo celular), conectadas ao repositório.
- Complemento: GitHub Codespaces, para ver a aplicação rodando ao vivo quando for útil (por exemplo, no ajuste fino da interface).
- Nada é instalado no computador do Anthony.
- Modo autônomo: o Claude segue o ROADMAP, um passo por PR, e integra quando o CI passa. Para apenas nos portões de fase, em decisões não cobertas pelo roteiro e quando precisa de uma ação do Anthony (regras em `CLAUDE.md`).

## Alternativas consideradas

- **Computador local:** exigiria cerca de 1 GB livre e instalação de Node.js e git.
- **Codespaces como principal:** consome a cota mensal de horas (60 h no plano gratuito, 90 h com o GitHub Education).
- **Revisão de cada PR pelo Anthony:** mais controle, porém mais lento; substituída por revisão nos portões, com tudo rastreável nos PRs.

## Consequências

- Cada sessão na nuvem começa do zero: `CLAUDE.md` e `docs/ROADMAP.md` precisam estar sempre atualizados.
- Nas sessões na nuvem, PRs são abertos e integrados pela API REST (`gh api`), porque `gh pr` usa GraphQL, bloqueado pelo proxy; tags não podem ser enviadas por git, então versões viram releases pela API.
- O uso das sessões entra no limite do plano do Claude do Anthony, sem cobrança separada pela máquina.
