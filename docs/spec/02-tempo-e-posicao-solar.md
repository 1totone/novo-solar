# 2. Tempo e posição solar

**Status:** v0, aprovada pelo Anthony no portão 0 (23/10/2026, decisão 0011).

## 2.1 Escalas de tempo

| Nome | Definição | Uso |
|---|---|---|
| **Hora legal** (hora padrão local, LST) | UTC + fuso do arquivo climático, sem horário de verão | instantes do EPW; linhas horárias em hora legal (analemas, F4.3) |
| **UTC** | LST − fuso | entrada do SPA (com ΔT) |
| **Hora solar verdadeira** (TST) | 12 h + ω/15, com ω o ângulo horário do sol | linhas horárias da carta (padrão) |

- O **fuso** vem sempre do cabeçalho do EPW (campo *Time Zone* da linha `LOCATION`, em horas, positivo a leste de Greenwich). Nunca de um meridiano fixo: o SOL-AR 6.2 usava 45°W para todos os arquivos, o que desloca as sobreposições em 1 h para dados em UTC−4 (Manaus, Concepción) e em 2 h no Acre (diagnóstico, seção 2.3).
- O EPW não tem horário de verão; o Brasil também não o adota desde 2019. Se o usuário digitar uma hora, ela é hora padrão local.
- Relação entre hora legal e hora solar verdadeira:

  TST = LST + [4 · (λ − 15 · fuso) + E] / 60 (em horas)

  com λ a longitude em graus (positiva a leste) e E a equação do tempo em minutos. No programa, a TST é obtida do ângulo horário calculado pelo SPA (TST = 12 + ω/15), e não por uma fórmula aproximada da equação do tempo; a expressão acima serve para explicar e para testar.

## 2.2 Convenção de hora do EPW

- A linha da hora h (1 a 24) do dia d descreve o intervalo **[h − 1, h]** em hora legal (valor da hora que termina).
- **Radiação** (GHI, DNI, DHI, em Wh/m²): energia integrada no intervalo. Ao combinar com a posição do sol (incidência, máscara, sobreposição), usa-se o sol no **meio do intervalo**, h − 0,5.
- **Temperatura, umidade, pressão, vento:** valores no instante h. Na sobreposição sobre a carta, cada grandeza é desenhada na posição do sol do instante que ela representa (radiação em h − 0,5; temperatura em h).
- A hora 24 do dia d é o instante 00:00 do dia d + 1.

Fonte: EnergyPlus, *Auxiliary Programs*, formato EPW; Wilcox e Marion (2008), manual do TMY3.

## 2.3 Algoritmo de posição solar

- **NREL SPA** (Reda e Andreas, 2004; revisão de 2008), implementado em TypeScript em `src/core/`. Incerteza declarada pelos autores: ±0,0003° entre os anos −2000 e 6000.
- Entradas: instante em UTC, ΔT, latitude, longitude e elevação do local (do cabeçalho do EPW). Pressão e temperatura só entram na correção de refração (ver 2.4).
- Saídas usadas: ângulo zenital topocêntrico, azimute topocêntrico (a partir do Norte, sentido horário, como na seção 1.1), ângulo horário topocêntrico, declinação e equação do tempo.
- **ΔT = 69 s**, fixo (portão 0). O valor medido pelo IERS ficou perto de 69 s entre 2020 e 2026; 1 s de erro em ΔT muda o ângulo horário em 0,004°, abaixo da tolerância.

### Ano de referência (portão 0)

Arquivos climáticos típicos (TMY, TRY) misturam meses de anos diferentes e não têm um ano próprio. A carta e todas as contas usam um **ano de referência fixo, não bissexto: 2026**. Motivo: dentro do ciclo de 4 anos, o instante do equinócio avança cerca de 6 h por ano e recua um dia no ano bissexto, uma oscilação de cerca de 0,75 dia; 2026, segundo ano depois do bissexto de 2024, fica a cerca de 0,1 dia da média do ciclo. Perto dos equinócios a declinação varia cerca de 0,4° por dia, então a escolha do ano muda a declinação em até cerca de 0,3° entre os anos extremos do ciclo e em até cerca de 0,15° em relação à média. Esse efeito é real e independente do algoritmo; fica documentado e não afeta a comparação com o pvlib, que usa os mesmos instantes.

## 2.4 Refração atmosférica (portão 0)

- Posições usadas na geometria (carta, transferidor, máscaras, ângulo de incidência, fração ensolarada): **geométricas** (topocêntricas, sem refração).
- Nascer e pôr do sol: definição do SPA (centro do disco a h = −0,8333°, que inclui refração padrão e semidiâmetro solar).
- Motivos: a máscara é uma construção geométrica; a refração depende do tempo atmosférico; o efeito é de cerca de 0,1° a 10° de altura e de cerca de 0,5° no horizonte, região onde a radiação direta é desprezível. A comparação com o EnergyPlus (F3.8) também fica mais limpa sem um ajuste a mais.

## 2.5 Grandezas derivadas

- **Nascer e pôr do sol**, em hora legal e em hora solar: SPA, Apêndice A.2.
- **Trajetórias da carta:** 12 datas do ano de referência: os dois solstícios e os dois equinócios, na data civil do fuso do local, e o dia 21 dos outros oito meses. Os instantes de equinócios e solstícios são aqueles em que a ascensão reta aparente do sol vale 0°, 90°, 180° e 270° (coincidem com a longitude eclíptica aparente a menos de segundos, porque a latitude eclíptica do sol é menor que 1"). Em 2026, no fuso −3: 20/03, 21/06, 22/09 e 21/12. Meses simétricos em relação ao solstício (ex.: 21/jan e 21/nov) têm declinações próximas, mas não iguais; desenhamos cada data com a sua declinação.
- **Trajetória de um dia:** posições a cada 10 min (5 min nos testes) desde 00:00 local, com o sol acima do horizonte geométrico, mais os pontos exatos de cruzamento do horizonte (bisseção até 1 ms).
- **Linhas horárias:** em hora solar verdadeira (padrão didático, linhas que cruzam as trajetórias): para cada data, o instante em que o ângulo horário do SPA vale 15° · (hora − 12), achado por iteração de Newton; a linha é desenhada com datas a cada 3 dias entre os solstícios de junho e de dezembro, intervalo em que a declinação é monótona. Em hora legal, viram analemas (seção 2.5.1).

### 2.5.1 Linhas horárias em hora legal: analemas (F4.3)

Proposta da decisão 0025.

- **Definição:** a linha da hora legal H é o lugar do sol às H:00 do fuso do arquivo (UTC = H − fuso), em cada dia do ano de referência. Ao longo do ano, a curva fecha um "8" (analema): a declinação dá a altura do laço, e a equação do tempo, a largura.
- **Por que difere da linha solar:** pela relação da seção 2.1, às H:00 legais a hora solar verdadeira é H + [4 · (λ − 15 · fuso) + E] / 60. Em Florianópolis (λ = −48,55°, fuso −3), a parcela da longitude é −14,2 min (o sol "atrasa" em relação ao relógio), e a equação do tempo vai de −14,2 min (11/02) a +16,4 min (03/11): o meio-dia legal fica entre 28 min antes e 2 min depois do meio-dia solar. Em Manaus (λ = −60,05°, fuso −4), a parcela da longitude é de −0,2 min, e o meio-dia legal acompanha só a equação do tempo; em Porto Alegre, −24,7 min; em Concepción (λ = −73,06°, fuso −4), −52,3 min, e o meio-dia legal acontece de 36 a 66 min antes do solar; em Rio Branco (fuso −5), +28,4 min.
- **Amostras:** dias 1, 4, 7, … do ano de referência (a cada 3 dias, 122 dias), às H:00 legais; a curva é fechada ligando o último dia ao primeiro. Horas desenhadas: de 5 a 19 h legais, só os trechos com o sol acima do horizonte geométrico (recortados na carta).
- **Rótulo:** a hora, junto do ponto do analema no solstício de inverno do local (21/06 com latitude negativa, 21/12 com latitude positiva), do lado de fora do laço; se esse ponto estiver abaixo do horizonte, junto do ponto visível mais baixo.
- **Opção na carta:** linhas horárias em hora solar (padrão, como no SOL-AR 6.2 e no ensino), em hora legal ou as duas juntas, para mostrar a diferença.
- **Validação:** posições às H:00 legais contra o pvlib (`spa_python`, mesmo ΔT), com o instante montado pelo fuso de forma independente (`Etc/GMT±n` ou deslocamento fixo do pandas, inclusive fuso fracionário de +5,5 h), em locais com fusos de −5 a +5,5; tolerância de 0,01° na direção, a da seção 2.6.

## 2.6 Validação e tolerâncias

| Grandeza | Referência | Tolerância |
|---|---|---|
| Ângulo zenital (geométrico) | pvlib `spa_python`, mesmo ΔT, mesma elevação | 0,01° |
| Direção do sol | pvlib, separação angular entre os vetores | 0,01° |
| Azimute | pvlib, só com altura < 89° | 0,01° |
| Nascer, pôr e passagem meridiana | pvlib `sun_rise_set_transit_spa` | 10 s |
| Hora solar verdadeira | equação do tempo do pvlib | 1 s |

**Resultado (F1.2):** todas as grandezas dentro da tolerância, com folga de várias ordens de grandeza; detalhes em [`../validacao/relatorios/F1.2-posicao-solar.md`](../validacao/relatorios/F1.2-posicao-solar.md). Implementação: `src/core/solar/` (`spa.ts`, `time.ts`, `constants.ts`).

O azimute é mal condicionado perto do zênite (uma diferença mínima de posição gera uma diferença grande de azimute); por isso a direção é comparada pela separação angular. Locais e fusos de teste: Belém (equatorial), Brasília, Florianópolis e Porto Alegre (UTC−3), Manaus (UTC−4) e Concepción, Chile (UTC−4, o arquivo do 6.2). Os valores de referência são gerados por script Python em `docs/validacao/scripts/` (F0.5).

## Referências

- Reda, I.; Andreas, A. *Solar Position Algorithm for Solar Radiation Applications*. NREL/TP-560-34302, 2004 (revisado em 2008).
- Holmgren, W. F.; Hansen, C. W.; Mikofski, M. A. pvlib python: a python package for modeling solar energy systems. *Journal of Open Source Software*, 3(29), 884, 2018.
- U.S. DOE. *EnergyPlus Auxiliary Programs*, capítulo "Weather Converter Program", formato EPW.
- Wilcox, S.; Marion, W. *Users Manual for TMY3 Data Sets*. NREL/TP-581-43156, 2008.
- IERS, Bulletin A (valores de ΔT = TT − UT1).
- Duffie, J. A.; Beckman, W. A. *Solar Engineering of Thermal Processes*, capítulo 1 (hora solar, equação do tempo).
