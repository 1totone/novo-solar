# 0018. Máscara pela geometria e fração ensolarada hora a hora

- Data: 2026-10-24
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 1 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)).

## Contexto

O Anthony pediu, enquanto aplica o teste com usuários do F2.9, que o núcleo de cálculo da Fase 3 fosse adiantado numa branch separada (F3.2 e F3.3: máscara exata, percentual sombreado e fração ensolarada hora a hora, só em `src/core`, com testes de referência), sem integrar nada antes do portão 2 e sem mexer na interface. As escolhas de física que surgissem deveriam ser anotadas e seguidas com a recomendação.

A máscara pelos ângulos (decisão 0014, spec 01, seção 1.6) é exata só com uma peça ou com a grelha, e a sombra parcial é o critério do centro. A máscara pela geometria resolve as duas coisas, mas exige escolhas que a spec v0 não fixava. A spec 07 descreve o modelo e os algoritmos; as escolhas estão abaixo.

## Decisão

1. **Placas finas.** Proteções são polígonos planos convexos de espessura nula, diante do vidro, como as superfícies de sombreamento do EnergyPlus. Espessura, se importar, com mais placas.
2. **Percentual exato.** O percentual sombreado é a área da união das sombras projetadas na janela, calculada sem aproximação (faixas verticais), e não a amostragem em grade da spec v0. A grade fica como referência de teste.
3. **Fração ensolarada por área**, igual à *Surface Outside Face Sunlit Fraction* do EnergyPlus: 0 quando o sol está atrás da fachada ou abaixo do horizonte. A versão ponderada pelo cosseno do ângulo de incidência sai do mesmo cálculo e fica para os indicadores (F3.5).
4. **Sol na janela** quando o seno da altura solar e o cosseno do ângulo de incidência são de pelo menos 10⁻⁵, os limites do EnergyPlus (`SunIsUpValue`).
5. **Média horária** de 6 amostras, no meio de subintervalos de 10 min da hora [h − 1, h] do EPW (simétricas em torno de h − 0,5, o instante da radiação). Os instantes do EnergyPlus, no fim de cada passo de tempo, ficam como opção do núcleo para a comparação do F3.8.
6. **Mapa mês × hora** em hora legal, com três grandezas: fração ensolarada, exposição (fração da hora com sol na janela) e percentual sombreado pela proteção com sol na janela. Recomendação para a interface: mostrar o terceiro e pintar de cinza as horas sem sol na janela.
7. **Curvas de 0 a 100%** por quadrados marchantes numa grade de 1° no disco da fachada, com os pontos das curvas refinados até o percentual exato; 0% e 100% pelos limiares 10⁻⁹ e 1 − 10⁻⁹.
8. **Recuo da janela** como opção (padrão 0): verga, peitoril e ombreiras viram placas, e as proteções são medidas do plano externo da fachada.
9. **Lâminas** giram em torno da borda interna; inclinação positiva com a borda externa para baixo (lâminas horizontais) ou para a direita (verticais).
10. **29 de fevereiro** fica para o F3.5: o F3.3 calcula as 8760 horas do ano de referência (2026).

## Alternativas consideradas

- Amostrar a janela numa grade (spec v0): erro da ordem de 1/n por borda de sombra e custo n² por direção; a área exata é mais precisa e mais rápida.
- Uma amostra por hora, no meio (convenção da radiação): não vê a hora parcial do nascer e do pôr do sol nem as transições de sombra dentro da hora.
- Repetir os instantes do EnergyPlus como padrão: amostrar no fim dos passos desloca a média da hora em meio passo (5 min); fica como opção para a comparação.
- Fração ponderada pela radiação direta como grandeza principal: depende do cosseno de incidência e mistura geometria com radiação; o mapa do F3.3 mostra só a geometria, e a ponderação entra no F3.5.
- Curvas exatas por arcos de circunferência: só existem nos casos de uma peça (0% e 100%); as curvas intermediárias não são circunferências.

## Consequências

- Nova spec 07 (proposta), já listada no README da spec, que deixa de prever a amostragem em grade. O ROADMAP e o CHANGELOG são atualizados na integração.
- A máscara pelos ângulos (F2.3) continua: é o método do ensino, e a máscara pela geometria serve para conferir e quantificar. A máscara de um ponto no centro reproduz o critério de 50%, agora para qualquer combinação de peças.
- O modelo de dispositivos do F3.1 (parâmetros e placas) já fica pronto no núcleo; o formulário, o corte e a vista esquemáticos continuam no F3.1.
- O F3.5 e o F3.8 usam as grandezas horárias e a opção de instantes descritas aqui.
