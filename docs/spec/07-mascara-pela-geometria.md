# 7. Máscara pela geometria e fração ensolarada

**Status:** proposta (núcleo de cálculo do F3.2 e do F3.3), 24/10/2026. Escrita antes do portão 2, numa branch separada, sem interface. As escolhas que ainda dependem do Anthony estão na seção 7.9 e na decisão 0018 (proposta), cada uma com a recomendação adotada no código enquanto isso.

A seção 1.6 calcula a máscara a partir de ângulos (α, β, γ) e tem duas limitações conhecidas: a sombra total de peças soltas é só uma parte da real, e a sombra parcial é o critério do centro (50%). Aqui a máscara vem da geometria da janela e das proteções: o percentual sombreado é exato para qualquer combinação de peças, e dele saem as curvas de 0 a 100% e a fração ensolarada hora a hora.

## 7.1 Modelo geométrico

Referencial da fachada (seção 1.2): x à direita de quem está dentro olhando para fora, y na normal externa, z para cima. Comprimentos em metros, ângulos em graus.

- **Janela:** retângulo no plano y = 0 (o plano do vidro), x de 0 a W (largura) e z de 0 (peitoril) a H (altura).
- **Recuo** (opcional, padrão 0): distância d entre o vidro e o plano externo da fachada (parede espessa). O recuo gera quatro placas nas bordas da janela, de y = 0 a y = d (verga, peitoril e ombreiras), e as proteções passam a ser medidas a partir do plano externo da fachada, y = d.
- **Placas:** polígonos planos e convexos, de espessura nula, com todos os vértices em y ≥ 0 (diante do vidro). É o mesmo modelo das superfícies de sombreamento do EnergyPlus; se a espessura de uma peça importar, ela é modelada com mais placas.
- **Infinito:** um prolongamento infinito vale 10⁶ m. A sombra de uma placa se desloca y · tan ψ na horizontal; com profundidades de até 10 m, o resultado só difere do de uma placa realmente infinita para |ψ| > 89,999°, onde o sol está praticamente no plano da fachada.

### Dispositivos

| Dispositivo | Parâmetros | Placas |
|---|---|---|
| Brise horizontal | profundidade D; altura acima da verga e (≥ 0); afastamento da fachada g; prolongamentos além das laterais da janela, à esquerda P_e e à direita P_d (≥ 0 ou infinitos) | z = H + e; y de d + g a d + g + D; x de −P_e a W + P_d |
| Aleta (brise vertical) à direita | profundidade D; distância à lateral da janela s (≥ 0); afastamento g; prolongamentos acima da verga P_a e abaixo do peitoril P_b (≥ 0 ou infinitos) | x = W + s; y de d + g a d + g + D; z de −P_b a H + P_a |
| Aleta à esquerda | os mesmos | x = −s |
| Lâminas horizontais | número n; largura (corda) c; passo vertical p; inclinação θ, de −90° a 90°, positiva com a borda externa para baixo; afastamento g da borda interna; altura da borda interna da primeira lâmina acima da verga e (pode ser negativa); prolongamentos P_e e P_d | lâmina k (k = 0 a n − 1): borda interna em y = d + g, z_k = H + e − k · p; borda externa em y = d + g + c · cos θ, z = z_k − c · sen θ; x de −P_e a W + P_d |
| Lâminas verticais | número n; corda c; passo horizontal p; rotação θ, de −90° a 90°, positiva com a borda externa para a direita; afastamento g; posição da borda interna da primeira lâmina x_0, a partir da lateral esquerda da janela; prolongamentos P_a e P_b | lâmina k: borda interna em x_k = x_0 + k · p, y = d + g; borda externa em x = x_k + c · sen θ, y = d + g + c · cos θ; z de −P_b a H + P_a |
| Recuo | d | verga: z = H, x de 0 a W, y de 0 a d; peitoril: z = 0; ombreiras: x = 0 e x = W, z de 0 a H |
| Placa livre | vértices (x, y, z) | a própria |

A **grelha** (brise misto) é um brise com aletas encostadas, das mesmas profundidades; não precisa de tipo próprio, porque a união das sombras (seção 7.3) fecha as junções sem regra especial. Lâminas giram em torno da borda interna, então mudar a inclinação não muda o afastamento.

O peitoril do recuo e qualquer placa abaixo da janela não fazem sombra com o sol acima do horizonte; entram no modelo só para que a geometria fique completa.

## 7.2 Sombra de uma placa

Com o sol na direção s = (s_x, s_y, s_z) do referencial da fachada (seção 1.2), um ponto Q da janela recebe sol direto se o raio Q + t · s, com t > 0, não atravessa nenhuma placa. Se s_y > 0, um ponto P = (x, y, z) da placa está nesse raio quando t = y / s_y ≥ 0; logo, o raio atravessa a placa se, e só se, Q pertence à **projeção da placa sobre o plano do vidro na direção do sol**:

  (x, y, z) ↦ (x − y · s_x / s_y, z − y · s_z / s_y) = (x − y · tan ψ, z − y · tan α_sol)

com ψ o ângulo azimutal relativo e α_sol o ângulo de perfil do sol (seção 1.3). É a construção clássica da sombra com os ângulos de sombra horizontal e vertical. A projeção paralela é afim: uma placa convexa projeta uma sombra convexa (ou um segmento de área nula, se a placa for paralela ao sol).

**Sol na janela.** A janela recebe sol direto quando o sol está acima do horizonte e diante da fachada, com os limites do EnergyPlus (`SunIsUpValue = 0,00001` em `DataEnvironment.hh`; `SolarShading.cc`, versão 24.2):

  s_z ≥ 10⁻⁵ e s_y ≥ 10⁻⁵

(seno da altura solar e cosseno do ângulo de incidência). Fora disso, a fração ensolarada é 0: sombra própria da fachada ou noite. Os limites diferem de zero por menos de 0,0006°, uma faixa em que a radiação direta na janela é desprezível (menos de 10⁻⁵ da DNI); servem para que a projeção nunca divida por um número próximo de zero.

## 7.3 Percentual sombreado

Para o sol na janela, o **percentual sombreado** é a fração da área da janela coberta pela união das sombras:

  f_s(s) = área(janela ∩ ⋃ sombras) / (W · H)

e a **fração ensolarada** é f_e = 1 − f_s. Com o sol fora da janela, f_e = 0. É a grandeza *Surface Outside Face Sunlit Fraction* do EnergyPlus, que divide a área ensolarada pela área da superfície e vale 0 quando a superfície não vê o sol.

**Algoritmo (exato, sem amostragem):**

1. projetar cada placa (seção 7.2) e descartar as sombras cuja caixa envolvente não toca a janela;
2. recortar cada sombra pela janela (algoritmo de Sutherland e Hodgman: polígono convexo contra um retângulo, resultado convexo);
3. calcular a área da união pelo **método das faixas verticais**. As abscissas dos vértices das sombras recortadas e das interseções entre arestas de sombras diferentes dividem a janela em faixas. Dentro de uma faixa, cada sombra corta a reta vertical x = constante num intervalo cujos extremos variam linearmente com x, e a ordem dos extremos não muda (nenhuma aresta cruza outra dentro da faixa). Então o comprimento da união dos intervalos é linear em x, e a área da faixa é **exatamente** o comprimento no meio da faixa vezes a largura.

Com uma sombra só, ou com sombras que não se sobrepõem, a área é a soma das áreas (fórmula do polígono). O erro é só de arredondamento (da ordem de 10⁻¹⁵ em f_s). O EnergyPlus usa o mesmo princípio (projeção das superfícies que fazem sombra sobre o plano da superfície que recebe o sol e recorte de polígonos; *Engineering Reference*, módulo de sombreamento), com outro algoritmo para as sobreposições.

A versão v0 da spec (README) previa amostrar a janela numa grade; a área exata é mais precisa e mais rápida, e a grade passa a ser só uma referência de teste (seção 7.8).

## 7.4 Máscara de um ponto

A máscara de um ponto Q da janela é o conjunto das direções do céu em que Q fica à sombra: a união, sobre as placas, das direções que vão de Q à placa. Para uma placa convexa que não contém Q no seu plano, essas direções formam um cone convexo, que é a interseção dos semiespaços {d : m_i · d ≥ 0}, um para cada aresta i, com m_i a normal unitária ao plano que passa por Q e pela aresta, orientada para dentro da placa. Placas cujo plano passa por Q (vistas de perfil) não têm máscara.

Na carta, cada semiespaço é a imagem de um hemisfério limitado por um círculo máximo (spec 03, seção 3.3). Com m = (m_E, m_N, m_U) no referencial Leste, Norte, Cima e a carta de raio 1:

- m_U > 0: o disco de centro (m_E, m_N) / m_U e raio 1 / |m_U|;
- m_U < 0: o exterior desse disco;
- m_U = 0 (|m_U| < 10⁻¹²): o semiplano dos pontos p com p · (m_E, m_N) ≥ 0.

A máscara do ponto é, portanto, uma região exata da carta, do mesmo tipo das regiões da seção 1.6 (interseções e uniões de discos e semiplanos), limitada ao horizonte e ao semiplano da fachada. Com Q no centro da janela, é exatamente o critério de 50% da seção 1.6, agora para qualquer combinação de peças.

## 7.5 Curvas de percentual

As curvas de 0, 25, 50, 75 e 100% são as bordas das regiões {f_s > 0}, {f_s ≥ 0,25}, {f_s ≥ 0,5}, {f_s ≥ 0,75} e {f_s = 1}, dentro do quarto de esfera em que o sol está na janela. As de 0 e 100% usam os limiares 10⁻⁹ e 1 − 10⁻⁹, para separar o valor exato do ruído de arredondamento; a diferença em ângulo é menor que 0,01°.

**Algoritmo.** Fora dos casos analíticos, as curvas não são circunferências, e o cálculo é numérico:

1. **Grade no disco da fachada.** As direções diante da fachada são mapeadas num disco pela projeção estereográfica centrada na normal: ρ = tan(θ/2), com θ o ângulo de incidência, e φ o ângulo no plano da fachada, de 0° (à direita, no horizonte) a 180° (à esquerda, no horizonte), passando por 90° (para cima). O quarto de esfera vira o retângulo φ de 0° a 180° e ρ de 0 a ρ_máx (cos θ_máx = 10⁻⁵, seção 7.2); as bordas do retângulo são o horizonte (φ = 0° e 180°) e o plano da fachada (ρ = ρ_máx), e as curvas terminam exatamente nelas. Grade padrão: 1° em φ e ρ_máx/120 em ρ (181 × 121 pontos; células de até 1° no céu).
2. **Quadrados marchantes** (*marching squares*) em cada nível. O ponto em que a curva cruza a aresta de uma célula é refinado por bisseção até 10⁻⁹ do comprimento da aresta, com o percentual exato da seção 7.3; células ambíguas (sela) são resolvidas pelo percentual no centro da célula. Os segmentos são ligados em linhas.
3. Cada vértice volta para uma direção (altura e azimute) e é desenhado na carta como qualquer direção.

**Precisão.** Os vértices estão sobre a curva exata (|f_s − nível| ≤ 10⁻⁶); entre dois vértices vizinhos, a curva é aproximada por um segmento na carta, com afastamento menor que 0,01° nos casos de teste. Regiões menores que uma célula podem não aparecer.

**Casos analíticos.** Brise horizontal infinito, sem afastamento (g = 0), a uma altura e acima da verga: a sombra cobre a faixa da janela abaixo da verga de altura D · tan α_sol − e, então

  f_s = mín(1, máx(0, (D · tan α_sol − e) / H))

e a curva do nível p é a curva α do transferidor com tan α_ext = (e + p · H) / D: a de 100% é o α medido do peitoril e a de 0% é o α medido da verga, como na seção 1.6. Aleta infinita à direita, a uma distância s da lateral, sem afastamento: f_s = mín(1, máx(0, (D · tan ψ − s) / W)) para ψ > 0, e a curva do nível p é a reta β com tan β_ext = (s + p · W) / D. Com afastamento g, os extremos da faixa sombreada usam g e g + D (testes, seção 7.8).

## 7.6 Fração ensolarada hora a hora

**Instantes.** Para cada hora h (1 a 24) de cada dia do ano de referência (2026, 8760 horas), a linha do EPW descreve o intervalo [h − 1, h] em hora legal, no fuso do arquivo (seção 2.2). O intervalo é dividido em N subintervalos (padrão N = 6, de 10 min), e o sol é calculado no meio de cada um:

  t_k = h − 1 + (k + ½) / N, k = 0 a N − 1

As amostras ficam simétricas em torno de h − 0,5, o instante da convenção da radiação (seção 2.2). Opção para a comparação com o EnergyPlus (F3.8): t_k = h − 1 + (k + 1) / N, o fim de cada passo de tempo, que é onde o EnergyPlus calcula o sol quando há mais de um passo por hora (`FigureSunCosines`, `SolarShading.cc`; com um passo por hora, ele usa o meio da hora).

**Posição do sol:** NREL SPA, geométrica (sem refração, seção 2.4), com a latitude, a longitude e a elevação do arquivo e ΔT = 69 s.

**Grandezas de cada amostra k:** e_k = 1 se o sol está na janela (seção 7.2), senão 0; fração ensolarada f_e,k = e_k · (1 − f_s(s_k)); cosseno do ângulo de incidência c_k = e_k · s_y.

**Grandezas de cada hora:**

| Grandeza | Definição | Uso |
|---|---|---|
| Fração ensolarada F_e | (1/N) Σ f_e,k | a do EnergyPlus (média dos passos de tempo da hora) |
| Exposição E | (1/N) Σ e_k | fração da hora com sol na janela, sem a proteção |
| Incidência ensolarada C_e | (1/N) Σ c_k · f_e,k | a radiação direta que chega ao vidro na hora é DNI · C_e, supondo a DNI constante na hora (indicadores, F3.5) |
| Incidência sem proteção C | (1/N) Σ c_k | o mesmo, sem a proteção |

**Mapa mês × hora** (12 × 24): para cada mês e hora, a média sobre os dias do mês de F_e e de E, e o **percentual sombreado pela proteção com sol na janela**, S = 1 − F̄_e / Ē, definido só onde Ē > 0. O mapa separa as datas que a carta sobrepõe (meses simétricos em relação aos solstícios, que têm trajetórias quase iguais) e é em hora legal, como o EPW. Horas com Ē = 0 são de noite ou de sol atrás da fachada.

**Precisão da média horária.** Com amostras no meio dos subintervalos, a média é de segunda ordem onde f_e varia suavemente. Onde f_e salta (nascer e pôr do sol, sol cruzando o plano da fachada), o erro de uma hora pode chegar a 1/(2N) = 0,083; esses saltos acontecem com o sol rasante, quando a radiação direta na janela é pequena, e na média do mês os erros de dias diferentes se compensam em parte.

**Custo.** O sol depende só do local; as 52 560 posições do ano (N = 6) são calculadas uma vez por local, e a sombra é recalculada a cada mudança de geometria.

## 7.7 Implementação

`src/core/shading/`:

- `geometry.ts`: janela, placas, dispositivos e a montagem da cena;
- `shadedFraction.ts`: direção do sol no referencial da fachada, projeção, recorte e área exata da união;
- `pointMask.ts`: máscara de um ponto como região da carta (tipo `Region` de `src/core/mask/mask.ts`);
- `contours.ts`: curvas de percentual;
- `hourly.ts`: amostras do sol no ano, fração ensolarada hora a hora e mapa mês × hora.

## 7.8 Validação e tolerâncias

| Grandeza | Referência independente | Tolerância |
|---|---|---|
| Placas de cada dispositivo | construção em Python a partir dos mesmos parâmetros | 10⁻¹² m |
| Percentual sombreado | área da união com shapely (GEOS), em direções aleatórias, para 15 cenas (as 9 do F2.3, lâminas, recuo e combinações) | 10⁻⁹ |
| Percentual sombreado | traçado de raios: grade de 400 × 400 pontos da janela, raio até o sol e interseção com as placas, sem projeção | 0,01 (resolução da grade) |
| Percentual sombreado do F2.3 | traçado de raios do F2.3 (grade de 41 × 41) | 0,05 (resolução da grade) |
| Casos analíticos (brise e aleta infinitos, com e sem afastamento) | fórmulas da seção 7.5 | 10⁻⁹ no percentual; 0,01° nos vértices das curvas |
| Máscara de um ponto | traçado de raios do F2.3, critério do centro (1500 direções × 9 casos) | nenhuma direção classificada errada |
| Sombra total (100%) | máscara pelos ângulos (seção 1.6) nos casos em que a união é exata; nos demais, a máscara pelos ângulos não pode ter direção fora da sombra total | nenhuma direção classificada errada |
| Fração ensolarada horária e mapa mês × hora | pvlib (SPA) e shapely, ano inteiro, 3 locais × 3 cenas | 10⁻⁶ |
| Coerência com a máscara | em todas as amostras do ano: f_s = 1 implica o centro à sombra (máscara de um ponto), f_s = 0 implica o centro ao sol | nenhuma exceção |
| Fração ensolarada horária | EnergyPlus, *Surface Outside Face Sunlit Fraction* (F3.8) | RMSE ≤ 0,02 |

## 7.9 Escolhas propostas (decisão 0018)

1. **Placas finas**, como no EnergyPlus. Espessura, quando importar, com mais placas.
2. **Percentual exato** pela área da união das sombras, no lugar da amostragem em grade da spec v0.
3. **Fração ensolarada por área** (a do EnergyPlus). A versão ponderada pela radiação direta (cos θ) sai do mesmo cálculo (C_e e C) e é a base dos indicadores do F3.5.
4. **Sol na janela** com s_z ≥ 10⁻⁵ e s_y ≥ 10⁻⁵ (limites do EnergyPlus); fora disso, fração ensolarada 0.
5. **Média horária** de 6 amostras no meio de subintervalos de 10 min; os instantes do EnergyPlus (fim de cada passo) ficam como opção para o F3.8.
6. **Mapa mês × hora** em hora legal, com a fração ensolarada, a exposição e o percentual sombreado pela proteção com sol na janela; recomendação: a interface mostra o terceiro, com as horas sem sol na janela em cinza.
7. **Curvas** de 0 e 100% pelos limiares 10⁻⁹ e 1 − 10⁻⁹, na grade de 1° do disco da fachada.
8. **Recuo da janela** opcional, padrão 0 (o EnergyPlus tem o equivalente em *Outside Reveal Depth*).
9. **Lâminas** giram em torno da borda interna; inclinação positiva com a borda externa para baixo (horizontais) ou para a direita (verticais).
10. **29 de fevereiro:** o cálculo usa as 8760 horas do ano de referência; arquivos com 29/02 (anos bissextos reais) ficam para o F3.5, que cruza a fração ensolarada com os dados.

## Referências

- Olgyay, A.; Olgyay, V. *Solar control and shading devices*. Princeton: Princeton University Press, 1957.
- Sutherland, I. E.; Hodgman, G. W. Reentrant polygon clipping. *Communications of the ACM*, 17(1), 32-42, 1974.
- U.S. DOE. *EnergyPlus Engineering Reference*, módulo de sombreamento (*Shading Module*): projeção de sombras e recorte de polígonos.
- EnergyPlus 24.2.0, código-fonte: `src/EnergyPlus/SolarShading.cc` (`FigureSunCosines`, `FigureSolarBeamAtTimestep`, `SHADOW`) e `src/EnergyPlus/DataEnvironment.hh` (`SunIsUpValue`).
- Gillies, S. et al. *Shapely* (GEOS), usado só na referência de teste.
- Holmgren, W. F.; Hansen, C. W.; Mikofski, M. A. pvlib python. *Journal of Open Source Software*, 3(29), 884, 2018.
