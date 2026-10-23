# 0012. Releases criadas por workflow a partir do CHANGELOG

- Data: 2026-10-23
- Status: aceita

## Contexto

Os portões de fase terminam com uma versão publicada como release (ROADMAP, seção 4.4). As sessões do Claude Code na nuvem não podem enviar tags nem criar releases pela API (o proxy recusa). O Anthony aprovou, no portão 1, um workflow que crie as releases.

## Decisão

- O `CHANGELOG.md` é a fonte das versões: cada seção `## [X.Y.Z] - AAAA-MM-DD (vX.Y, Nome)` é uma versão lançada.
- O workflow `.github/workflows/release.yml` roda a cada push na `main` que altera o CHANGELOG (e sob demanda). O script `scripts/release.ts` cria as releases que faltam: tag `vX.Y.Z` no commit que introduziu o cabeçalho da versão, título "vX.Y: Nome", notas iguais ao texto da seção, pré-lançamento enquanto a versão for 0.x.
- No PR de cada portão aprovado, o Claude move o conteúdo de "Não lançado" para a nova seção e atualiza a versão no `package.json`. O merge publica a release.

## Alternativas consideradas

- **Release manual pelo Anthony:** funciona, mas exige uma ação dele a cada portão.
- **Workflow acionado manualmente com a versão como entrada:** depende de alguém acionar e duplica a informação do CHANGELOG.

## Consequências

- Versão, notas e tag saem de um só lugar e ficam rastreáveis no PR do portão.
- A v0.0.0, aprovada no portão 0 antes do workflow existir, é criada na primeira execução, no commit do portão 0.
- O parser do CHANGELOG tem teste (`tests/scripts/changelog.test.ts`); um cabeçalho fora do formato não vira release.
