# Especificação técnica

**Status:** v0, aprovada pelo Anthony no portão 0 (23/10/2026, decisão 0011). Cada módulo ganha detalhe no passo em que é implementado, sempre com referências e tolerâncias. O teste de referência de cada cálculo vem antes da implementação.

## Seções

1. [Convenções geométricas](01-convencoes-geometricas.md): azimute, orientação da fachada, referencial da fachada, α, β e γ nas referências interna e externa (com figuras), condições de sombra, curvas do transferidor, unidades, máscara pelos ângulos (sombra total e parcial).
2. [Tempo e posição solar](02-tempo-e-posicao-solar.md): hora legal, UTC e hora solar; convenção de hora do EPW; NREL SPA, ΔT, ano de referência, refração; linhas horárias em hora legal (analemas, seção 2.5.1); tolerâncias contra o pvlib.
3. [Projeções e transferidor](03-projecoes.md): projeção estereográfica, inversa, imagem de círculos máximos, fórmulas das curvas do transferidor, impressão em escala; projeções equidistante e cilíndrica (seção 3.5, proposta, decisão 0025).
4. [Dados climáticos](04-dados-climaticos.md): EPW (campos, unidades, códigos de ausente, checagens), CSV legado do SOL-AR 6.2, indicadores de qualidade (inclusive o tempo da radiação), catálogo nacional (seção 4.5, F4.1).
5. [Sobreposição de dados](05-sobreposicao-de-dados.md): células como áreas (quinzenas, semestres pelos solstícios, intervalos de radiação e temperatura, bordas entre quinzenas), cor pela média ou pela frequência acima de um limiar, faixas padrão e pelo arquivo.
6. [Vento](06-vento.md): rosa dos ventos (calmaria, setores, classes de velocidade, estações e períodos do dia, resolução da velocidade); filtro pela condição térmica e correção para a altura e o terreno (F4.4).
7. [Máscara pela geometria e fração ensolarada](07-mascara-pela-geometria.md) (proposta): janela, placas e dispositivos; percentual sombreado exato; máscara de um ponto; curvas de 0 a 100%; fração ensolarada hora a hora e mapa mês × hora.
8. [Classificação das horas](08-classificacao-das-horas.md) (proposta): temperatura da hora, temperatura média predominante do EPW, faixa adaptativa da ASHRAE 55, limiares fixos e temperatura de equilíbrio; hipóteses mostradas.
9. [Indicadores de sombreamento](09-indicadores.md) (proposta): radiação direta incidente na janela por hora, bloqueada nas horas quentes e admitida nas horas frias; comparação entre alternativas; diferenças em relação ao EnergyPlus.
10. [Dimensionamento inverso](10-dimensionamento-inverso.md) (proposta): do período a sombrear para os ângulos α, β e γ e as dimensões de brise e aletas; subdivisão em lâminas.
11. [Arquivo de projeto e link](11-arquivo-de-projeto.md) (proposta, decisão 0028): o que o link e o projeto guardam, formato JSON com versão de esquema, abrir, salvar e compatibilidade com os links.
12. [Modo didático](12-modo-didatico.md) (proposta, decisão 0033): tutorial guiado, exercícios de máscara e a métrica da comparação (índice de Jaccard em ângulo sólido e nas horas de sol).

## Resumo do que está fixado

- **Azimute:** a partir do Norte geográfico, sentido horário (0° = N, 90° = L).
- **Orientação da fachada:** azimute da normal externa; qualquer valor real, normalizado para [0, 360).
- **α, β, γ:** definidos como no SOL-AR 6.2, com as duas referências; externo = 90° − interno. α interno = AVS e β interno = AHS da INI-C.
- **Posição solar:** NREL SPA. Tolerância contra o pvlib: 0,01°.
- **Tempo:** o EPW está em hora padrão local; a conversão para UTC usa o fuso do cabeçalho, nunca um meridiano fixo. A hora solar verdadeira vem do ângulo horário.
- **Convenção do EPW:** a linha da hora h descreve o intervalo que termina em h. Radiação é a energia integrada nesse intervalo e é associada ao sol no meio dele (h − 0,5); temperatura e umidade são valores no instante h.
- **Projeção estereográfica:** r = R · tan(z/2); carta vista de cima, Norte para cima, Leste à direita.
- **Máscara pelos ângulos:** sombra total (100%) com os ângulos medidos das arestas e cantos da janela e sombra parcial (50%) com os ângulos medidos do centro; regiões exatas na carta, como união das peças (decisão 0014).
- **Unidades:** SI (°C, m/s, W/m², Wh/m²); vírgula decimal na interface em português.

## Decisões do portão 0 (aprovadas em 23/10/2026)

| Ponto | Decisão | Onde |
|---|---|---|
| Referência padrão do transferidor ao abrir o programa | **Interna**: coincide com AVS/AHS da INI-C e com a aula do LabEEE; a externa continua a um clique | 01, seção 1.3 |
| Lado "direito" | à direita de quem está dentro olhando para fora (coincide com a direita do papel com a normal para cima); confirmado no código do 6.2 (F2.2) | 01, seção 1.2 |
| Índices 1 e 2 de α, β, γ | brise afastado da parede: sombra entre a curva da aresta externa (1) e a da aresta interna (2); o 6.2 ordena as duas curvas (F2.2), o novo mantém a ordem digitada (F2.3, decisão 0014) | 01, seções 1.3 e 1.6 |
| ΔT | 69 s, fixo | 02, seção 2.3 |
| Ano de referência | 2026, não bissexto | 02, seção 2.3 |
| Refração | posições geométricas em toda a geometria; refração só no nascer e pôr do sol (h = −0,8333°) | 02, seção 2.4 |
| CSV exportado | ponto decimal e vírgula como separador, com cabeçalho que informa isso | 01, seção 1.5 |

## Módulos ainda não detalhados

Serão escritos no passo de cada módulo, com referências e testes:

- **Máscaras por geometria (F3.1 a F3.3):** núcleo descrito na seção 7 (proposta, decisão 0018): percentual sombreado exato pela área da união das sombras, no lugar da amostragem em grade prevista na v0. Falta o formulário e o desenho da janela e dos dispositivos (F3.1).
- **Vento, correção para altura e rugosidade e filtro por condição térmica (F4.4):** como no EnergyPlus: V_z = V_met · (δ_met / z_met)^α_met · (z / δ)^α, com os parâmetros de terreno da *Engineering Reference*. A rosa em si está na seção 6.
- **Classificação das horas (F3.4):** núcleo descrito na seção 8 (proposta, decisão 0020). Falta a interface com as hipóteses na tela.
- **Indicadores de sombreamento (F3.5):** núcleo descrito na seção 9 (proposta, decisão 0021). Falta a interface; a difusa com o fator de visão do céu fica para a Fase 5.

## Tolerâncias de validação

| Grandeza | Referência | Tolerância |
|---|---|---|
| Posição solar (ângulo zenital e separação angular) | pvlib (NREL SPA) | 0,01° |
| Nascer, pôr e passagem meridiana | pvlib (SPA) | 10 s |
| Curvas do transferidor e de máscara em casos analíticos | solução analítica | 0,1° |
| Coordenadas nas projeções equidistante e cilíndrica | fórmulas da seção 3.5 num script independente, com o pvlib | 10⁻⁶ R |
| Curvas do transferidor fora da estereográfica | fórmulas fechadas (seção 3.5.2) | 10⁻⁴ R da polilinha |
| Analemas (sol às H:00 legais) | pvlib, com o instante montado pelo fuso | 0,01° |
| Máscara pelos ângulos (sombra total e centro da janela) | traçado de raios com janela e placas | nenhuma direção classificada errada (1500 por caso); onde a união das peças não é exata, nenhum falso positivo |
| Sobreposição: hora do EPW na sua célula | posição do sol no instante da convenção do EPW (Florianópolis e Manaus) | todas dentro da sua célula e fora das outras, com 10⁻⁴ na carta de raio 1 |
| Percentual sombreado (máscara pela geometria) | área da união com shapely; traçado de raios | 10⁻⁹; 0,01 (grade de 400 × 400) |
| Fração ensolarada horária | pvlib e shapely, ano inteiro | 10⁻⁶ |
| Fração ensolarada horária | EnergyPlus, *Surface Outside Face Sunlit Fraction* | RMSE ≤ 0,02 |
| Estatísticas de vento | cálculo independente em Python | 0,1 ponto percentual (diferença encontrada no F2.5: menor que 10⁻⁶) |
| Escala de impressão | régua | ±1 mm no raio |
