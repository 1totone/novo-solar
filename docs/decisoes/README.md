# Decisões

Uma nota curta por decisão relevante. Antes de mudar algo decidido aqui, escreva uma nova nota que substitua a anterior (e marque a antiga como "substituída").

| Nº | Decisão | Data | Status |
|---|---|---|---|
| [0001](0001-repositorio-e-hospedagem.md) | Repositório público no GitHub e site no GitHub Pages | 2026-10-23 | aceita |
| [0002](0002-ambiente-e-autonomia.md) | Claude Code na nuvem em modo autônomo; Codespaces como complemento | 2026-10-23 | aceita |
| [0003](0003-licenca-mit.md) | Licença MIT | 2026-10-23 | aceita |
| [0004](0004-stack-tecnica.md) | TypeScript, Vite, React, D3, Three.js, Vitest, Playwright; aplicação estática e portátil | 2026-10-23 | aceita |
| [0005](0005-idiomas.md) | Interface em português com tradução desde o início; código em inglês | 2026-10-23 | aceita |
| [0006](0006-publico-e-escopo-v1.md) | Público e escopo da v1.0 | 2026-10-23 | aceita |
| [0007](0007-origem-creditos-e-manutencao.md) | Origem do projeto, créditos e manutenção | 2026-10-23 | aceita |
| [0008](0008-publicacao-e-previas.md) | Publicação no GitHub Pages com prévia por PR | 2026-10-23 | aceita |
| [0009](0009-traducao-e-estado-na-url.md) | Tradução sem biblioteca externa e estado da aplicação no # da URL | 2026-10-23 | aceita |
| [0010](0010-epw-de-terceiros-nao-versionados.md) | EPWs de terceiros não são versionados até a confirmação dos termos | 2026-10-23 | aceita (provisória) |
| [0011](0011-convencoes-aprovadas-no-portao-0.md) | Convenções da spec v0 aprovadas no portão 0 | 2026-10-23 | aceita |
| [0012](0012-releases-pelo-changelog.md) | Releases criadas por workflow a partir do CHANGELOG | 2026-10-23 | aceita |
| [0013](0013-interface-da-fase-2.md) | Interface da Fase 2 (wireframes do F2.1) | 2026-10-24 | aceita |
| [0014](0014-mascara-pelos-angulos.md) | Máscara pelos ângulos: sombra total e parcial, índices 2 e γ das aletas | 2026-10-24 | aceita |
| [0015](0015-sobreposicao-de-dados.md) | Sobreposição de dados: bordas das células, faixas e leiaute do celular | 2026-10-24 | aceita (faixas de UR e DHI e cores provisórias) |
| [0016](0016-rosa-dos-ventos.md) | Rosa dos ventos: estações, períodos do dia e setores | 2026-10-24 | aceita (a conferir no portão 2) |
| [0017](0017-cidades-e-dados-historicos.md) | Cidades, dados recentes e dados históricos do SOL-AR 6.2 | 2026-10-24 | aceita (radiação histórica a confirmar no portão 2) |
| 0018 a 0025 | Decisões das Fases 3 e 4, nas branches de integração (PRs #35 e #51); entram aqui quando as fases forem integradas | 2026-10-24 a 2026-10-26 | propostas ou aceitas provisoriamente |
| [0026](0026-criterio-sus-do-portao-4.md) | Critério da SUS no portão 4: média de pelo menos 70, com o intervalo de confiança | 2026-10-26 | proposta (confirmar antes da coleta do F4.9) |
| [0037](0037-ponte-com-normas-e-energyplus.md) | Ponte com NBR 15220-3, INI-C e EnergyPlus: na v1.0, conferência contra o EnergyPlus e dados exportáveis; saídas para normas e EnergyPlus na v2.0 (corrige o escopo da 0006 para o que o ROADMAP diz) | 2026-10-26 | proposta (a decidir pelo Anthony) |
| [0041](0041-integracao-das-fases-por-merge-commit.md) | Integração das Fases 3 e 4 na `main` por merge commit (exceção ao squash só para os dois PRs de integração de fase) | 2026-10-26 | proposta (a decidir pelo Anthony) |

## Modelo

```markdown
# NNNN. Título

- Data: AAAA-MM-DD
- Status: proposta | aceita | substituída por NNNN

## Contexto
O problema e as restrições.

## Decisão
O que foi decidido.

## Alternativas consideradas
O que mais foi avaliado e por que não.

## Consequências
O que muda, o que fica mais fácil e o que fica mais difícil.
```
