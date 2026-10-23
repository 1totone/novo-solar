# 0011. Convenções da spec v0 aprovadas no portão 0

- Data: 2026-10-23
- Status: aceita

## Contexto

A spec v0 (F0.4) deixou pontos de produto e de física para o Anthony decidir no portão 0 (`docs/spec/README.md`). O Anthony aprovou a Fase 0 e as recomendações em 23/10/2026.

## Decisão

- **Referência padrão do transferidor:** interna (α e β medidos a partir do plano da fachada, γ a partir da vertical), como AVS e AHS da INI-C e o material de aula do LabEEE; a externa fica disponível a um clique. Externo = 90° − interno.
- **Lado direito:** à direita de quem está dentro olhando para fora.
- **Índices 1 e 2:** brise afastado da parede; sombra entre a curva da aresta externa (1) e a da aresta interna (2).
- **ΔT:** 69 s, fixo.
- **Ano de referência:** 2026, não bissexto.
- **Refração:** posições geométricas em toda a geometria; refração só na definição de nascer e pôr do sol (h = −0,8333°).
- **CSV exportado:** ponto decimal e vírgula como separador, com cabeçalho que informa isso.

## Alternativas consideradas

Descritas em `docs/spec/01-convencoes-geometricas.md` e `docs/spec/02-tempo-e-posicao-solar.md` (referência externa como padrão; ano variável; posições aparentes com refração).

## Consequências

- Lado direito, índices 1 e 2 e o uso de γ na aleta finita continuam marcados "[conferir no 6.2]": são conferidos contra o SOL-AR 6.2 em execução no F2.2 e no F2.8. Se o 6.2 divergir, a diferença é registrada e levada ao Anthony antes de mudar o comportamento.
- A Fase 1 parte destas convenções sem reabri-las.
