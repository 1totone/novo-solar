# 0006. Público e escopo da v1.0

- Data: 2026-10-23
- Status: aceita; escopo da ponte com NBR 15220-3, INI-C e EnergyPlus corrigido pela decisão 0037 (27/10/2026)

## Contexto

O SOL-AR 6.2 é usado sobretudo no ensino de conforto ambiental e no projeto de proteções solares. Ferramentas como o CBE Clima Tool já cobrem a análise climática genérica.

## Decisão

- **Público:** estudantes e professores de arquitetura e engenharia (ensino) e projetistas e consultores (projeto); pesquisadores como público secundário.
- **Dentro do escopo:** carta solar e transferidor; máscaras por ângulos e calculadas pela geometria; sobreposição de dados climáticos; quantificação do efeito do sombreamento; rosa dos ventos; catálogo de arquivos climáticos; ponte com NBR 15220-3, INI-C e EnergyPlus (corrigido pela decisão 0037: na v1.0, a conferência contra o EnergyPlus e os dados exportáveis; as saídas para NBR 15220-3, INI-C e EnergyPlus ficam na v2.0, como no roteiro do ROADMAP); modo didático.
- **Fora do escopo:** simulação energética (o EnergyPlus faz isso; a exportação para ele fica na v2.0, decisão 0037); iluminação natural; simulação de ventilação ou CFD; painel climático genérico; contas de usuário e servidor.

## Alternativas consideradas

- **Ferramenta climática completa:** duplicaria o CBE Clima Tool e diluiria o foco.
- **Só ensino:** deixaria de fora a quantificação e as saídas para INI-C e EnergyPlus, que dão valor ao projeto real.

## Consequências

- Pedidos fora do escopo vão para `docs/ideias.md`.
- O modo básico continua tão simples quanto o SOL-AR 6.2; o avançado fica recolhido.
