# 0013. Interface da Fase 2 (wireframes do F2.1)

- Data: 2026-10-24
- Status: aceita

## Contexto

O F2.1 apresentou o fluxo e os wireframes da Fase 2 (`docs/ux/F2.1-fluxo-e-wireframes.md`, `public/wireframes/`). O Anthony aprovou as propostas de fluxo e de tela e ajustou as de sobreposição de dados, faixas e vento.

## Decisão

- **Tela:** uma tela com passos numerados (Local, Fachada, Proteção, Dados) e a carta sempre visível, atualizada na hora; transferidor sobre a carta; máscara calculada a cada número; avançado em "Mais opções"; celular com a carta no topo e os passos numa folha; máscara total vermelha e parcial amarela até a paleta da Fase 4.
- **Sobreposição (F2.4):** células como áreas, limitadas pelas trajetórias do primeiro e do último dia do período e pelas linhas de hora legal do intervalo; radiação de h − 1 a h, temperatura e umidade de h − 0,5 a h + 0,5; quinzenas, com o primeiro e o último período de cada semestre absorvendo os dias junto ao solstício; semestres de 22/12 a 21/06 e de 22/06 a 21/12; cor padrão pela média; em "Mais opções", frequência de horas acima de um limiar.
- **Faixas de temperatura:** as 5 do 6.2 (até 10, 10 a 14, 14 a 20, 20 a 25, acima de 25 °C) por padrão; percentis do arquivo a um clique, com aviso de que não são comparáveis entre cidades.
- **Vento (F2.5):** calmaria abaixo de 0,5 m/s; classes [0,5; 2), [2; 4), [4; 6) e ≥ 6 m/s; resolução da velocidade do arquivo sempre visível, com aviso de viés quando for em passos inteiros.
- **Dados (F2.7):** sem CORS nem termos de redistribuição no Climate.OneBuilding.org, a v0.5 oferece o link para a fonte e o carregamento do arquivo pelo usuário.

## Alternativas consideradas

- Células por mês (variação de declinação de até 12° por período, mistura posições perto dos equinócios).
- Ponto na posição média do sol (perde a extensão real do intervalo de tempo e do período).
- Semestres "até 21 de junho" e "após 21 de junho", como no 6.2 (os dias de 22 a 31/12 se sobrepõem aos do início de dezembro na carta).

## Consequências

- A spec ganha a seção de sobreposição (`docs/spec/05-sobreposicao-de-dados.md`) e os parâmetros do vento.
- O teste do F2.4 verifica que cada hora do arquivo cai na célula certa, com o fuso do arquivo (Florianópolis e Manaus).
