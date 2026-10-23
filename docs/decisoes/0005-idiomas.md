# 0005. Idiomas

- Data: 2026-10-23
- Status: aceita

## Contexto

O público principal é brasileiro, mas o SOL-AR também é usado em outros países da América Latina (o instalador 6.2 já trazia Concepción, no Chile).

## Decisão

- Interface em português do Brasil primeiro, com estrutura de tradução desde o início; espanhol e inglês na Fase 4.
- Nomes no código em inglês.
- Documentação, PRs e mensagens de commit em português.

## Alternativas consideradas

- **Tudo em inglês:** facilitaria contribuições internacionais, mas afastaria o público principal.
- **Traduções só no fim:** obrigaria a refazer todos os textos da interface.

## Consequências

- Nenhum texto de interface fica fixo no código: tudo passa pelo sistema de tradução.
- Formatação de números conforme o idioma (vírgula decimal em português).
