# 0041. Integração das Fases 3 e 4 na `main` por merge commit

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 25 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)). Exceção à regra do squash do `CLAUDE.md`, só para os PRs de integração de fase e os que atualizam uma integração com outra.

## Contexto

O `CLAUDE.md` manda integrar cada PR com merge squash. As Fases 3 e 4 foram construídas em duas branches de integração empilhadas: a da Fase 4 (PR #51) parte da da Fase 3 (PR #35), e cada passo entrou nelas por squash. Se o PR #35 entrar na `main` por squash, o commit novo na `main` não é ancestral da integração da Fase 4; o merge seguinte da `main` na Fase 4 conflita em todo trecho que a Fase 4 alterou de novo depois da Fase 3 (no ensaio de 26/10/2026, 28 arquivos, entre eles `App.tsx`, `SunChart.tsx`, os catálogos de texto e o `CHANGELOG.md`; pelo merge commit, nenhum). Plano em `docs/lancamento/plano-de-integracao-e-versoes.md`, seção 3.

## Decisão

1. **Os dois PRs de integração de fase (#35 e #51) entram na `main` por merge commit.** O histórico de cada passo, já squash dentro da branch de integração, fica preservado, e a Fase 4 continua descendente da `main` depois da v0.8.
2. **Também por merge commit, os PRs que atualizam uma branch de integração com outra** (a `main` na da Fase 3, a da Fase 3 na da Fase 4). Em 26/10/2026, o PR #70 trouxe a Fase 3 para a Fase 4 por squash e a Fase 3 deixou de ser ancestral; o PR #71 refez a ancestralidade com um merge `-s ours`, sem mudar arquivo nenhum.
3. **Todo o resto continua por squash**, como manda o `CLAUDE.md`.
4. O `CLAUDE.md` ganha a exceção numa linha, no PR que integrar a Fase 3.

## Alternativas consideradas

- **Squash também nas fases:** exige resolver os conflitos à mão na integração da Fase 4, com risco de perder uma correção da Fase 3 que a Fase 4 já tinha.
- **Integrar as Fases 3 e 4 juntas, depois do portão 4:** a v0.8 não passaria pela `main`, e o `release.yml` só cria releases a partir da `main`; o portão 3 perderia a versão publicada.
- **Rebase das branches de integração:** reescreve o histórico de branches com PRs abertos e prévias publicadas.

## Consequências

- A `main` mostra os commits de cada passo das Fases 3 e 4 (um por PR de passo), mais o merge de cada fase.
- O `release.yml` continua igual: a tag aponta para o commit que introduziu o cabeçalho da versão no `CHANGELOG.md`.
