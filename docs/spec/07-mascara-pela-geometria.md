# 7. Máscara pela geometria e fração ensolarada

**Status:** proposta (núcleo de cálculo do F3.2 e do F3.3), 24/10/2026. Escrita antes do portão 2, numa branch separada, sem interface. As escolhas que ainda dependem do Anthony estão na seção 7.9 e na decisão 0018 (proposta), cada uma com a recomendação adotada no código enquanto isso.

A seção 1.6 calcula a máscara a partir de ângulos (α, β, γ) e tem duas limitações conhecidas: a sombra total de peças soltas é só uma parte da real, e a sombra parcial é o critério do centro (50%). Aqui a máscara vem da geometria da janela e das proteções: o percentual sombreado é exato para qualquer combinação de peças, e dele saem as curvas de 0 a 100% e a fração ensolarada hora a hora.

## 7.1 Modelo geométrico

Referencial da fachada (seção 1.2): x à direita de quem está dentro olhando para fora, y na normal externa, z para cima. Comprimentos em metros, ângulos em graus.

- **Janela:** retângulo no plano y = 0 (o plano do vidro), x de 0 a W (largura) e z de 0 (peitoril) a H (altura).
- **Recuo** (opcional, padrão 0): distância d entre o vidro e o plano externo da fachada (parede espessa). O recuo gera quatro placas nas bordas da janela, de y = 0 a y = d (verga, peitoril e ombreiras), e as proteções passam a ser medidas a partir do plano externo da fachada, y = d.
- **Placas:** polígonos planos e convexos, de espessura nula, com todos os vértices em y ≥ 0 (diante do vidro). É o mesmo modelo das superfícies de sombreamento do EnergyPlus; se a espessura de uma peça importar, ela é modelada com mais placas.
- **Infinito:** um prolongamento infinito vale 10⁶ m. A sombra de um ponto da placa se desloca y · tan ψ na horizontal e y · tan α_sol na vertical, no máximo y / cos θ ≤ y · 10⁵ com o sol na janela (seção 7.2); com placas a até 9 m do vidro, o deslocamento fica abaixo de 10⁶ m e o resultado é o de uma placa realmente infinita.

### Dispositivos

| Dispositivo | Parâmetros | Placas |
|---|---|---|
| Brise horizontal | profundidade D; altura acima da verga e (≥ 0); afastamento da fachada g; prolongamentos além das laterais da janela, à esquerda P_e e à direita P_d (≥ 0 ou infinitos) | z = H + e; y de d + g a d + g + D; x de −P_e a W + P_d |
| Aleta (brise vertical) à direita | profundidade D; distância à lateral da janela s (≥ 0); afastamento g; prolongamentos acima da verga P_a e abaixo do peitoril P_b (≥ 0 ou infinitos) | x = W + s; y de d + g a d + g + D; z de −P_b a H + P_a |
| Aleta à esquerda | os mesmos | x = −s |
| Lâminas horizontais | número n; largura (corda) c; passo vertical p; inclinação θ, de −90° a 90°, positiva com a borda externa para baixo; afastamento g da borda interna; altura da borda interna da primeira lâmina acima da verga e (pode ser negativa); prolongamentos P_e e P_d | lâmina k (k = 0 a n − 1): borda interna em y = d + g, z_k = H + e − k · p; borda externa em y = d + g + c · cos θ, z = z_k − c · sen θ; x de −P_e a W + P_d |
| Lâminas verticais | número n; corda c; passo horizontal p; rotação θ, de −90° a 90°, positiva com a borda externa para a direita; afastamento g; posição da borda interna da primeira lâmina x_0, a partir da lateral esquerda da janela; prolongamentos P_a e P_b | lâmina k: borda interna em x_k = x_0 + k · p, y = d + g; borda externa em x = x_k + c · sen θ, y = d + g + c · cos θ; z de −P_b a H + P_a |
| Recuo | d | verga: z = H, x de 0 a W, y de 0 a d; peitoril: z = 0; ombreiras: x = 0 e x = W, z de 0 a H |
| Placa livre | vértices (x, y, z), em ordem ao longo do contorno | a própria; o núcleo recusa placa não plana, côncava ou sem área |

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

Com uma sombra só, ou com sombras que não se sobrepõem, a área é a soma das áreas (fórmula do polígono). O erro é só de arredondamento: contra o shapely, a diferença ficou no arredondamento do arquivo de referência (5 × 10⁻¹³). O EnergyPlus usa o mesmo princípio (projeção das superfícies que fazem sombra sobre o plano da superfície que recebe o sol e recorte de polígonos; *Engineering Reference*, módulo de sombreamento), com outro algoritmo para as sobreposições.

A versão v0 da spec (README) previa amostrar a janela numa grade; a área exata é mais precisa e mais rápida, e a grade passa a ser só uma referência de teste (seção 7.8).

## 7.4 Máscara de um ponto

A máscara de um ponto Q da janela é o conjunto das direções do céu em que Q fica à sombra: a união, sobre as placas, das direções que vão de Q à placa. Para uma placa convexa que não contém Q no seu plano, essas direções formam um cone convexo, que é a interseção dos semiespaços {d : m_i · d ≥ 0}, um para cada aresta i, com m_i a normal unitária ao plano que passa por Q e pela aresta, orientada para dentro da placa. Placas cujo plano passa por Q (vistas de perfil) não têm máscara.

Na carta, cada semiespaço é a imagem de um hemisfério limitado por um círculo máximo (spec 03, seção 3.3). Com m = (m_E, m_N, m_U) no referencial Leste, Norte, Cima e a carta de raio 1:

- m_U > 0: o disco de centro (m_E, m_N) / m_U e raio 1 / |m_U|;
- m_U < 0: o exterior desse disco;
- m_U = 0 (na prática, |m_U| < 10⁻⁸): o semiplano dos pontos p com p · (m_E, m_N) ≥ 0. O limite equilibra o erro de trocar o círculo enorme pela reta e o arredondamento do teste de ponto no disco: os dois ficam perto de 10⁻⁸ na carta de raio 1.

A máscara do ponto é, portanto, uma região exata da carta, do mesmo tipo das regiões da seção 1.6 (interseções e uniões de discos e semiplanos), limitada ao horizonte e ao semiplano da fachada. Com Q no centro da janela, é exatamente o critério de 50% da seção 1.6, agora para qualquer combinação de peças.

## 7.5 Curvas de percentual

As curvas de 0, 25, 50, 75 e 100% são as bordas das regiões {f_s > 0}, {f_s ≥ 0,25}, {f_s ≥ 0,5}, {f_s ≥ 0,75} e {f_s = 1}, dentro do quarto de esfera em que o sol está na janela. As de 0 e 100% usam os limiares 10⁻⁹ e 1 − 10⁻⁹, para separar o valor exato do ruído de arredondamento. Onde o percentual cresce linearmente a partir de 0 (uma borda de sombra entrando na janela), o efeito do limiar em ângulo é desprezível (10⁻⁷ grau no brise infinito); onde cresce com o quadrado (o canto de uma sombra entrando pelo canto da janela, f ≈ L² · ψ · α_sol / (2 · A)), o desvio é de √(2 · A · 10⁻⁹) / L radianos: cerca de 0,003° para uma janela de 1 m² e uma peça de 1 m, maior em janelas muito grandes com peças pequenas.

**Algoritmo.** Fora dos casos analíticos, as curvas não são circunferências, e o cálculo é numérico:

1. **Grade no disco da fachada.** As direções diante da fachada são mapeadas num disco pela projeção estereográfica centrada na normal: ρ = tan(θ/2), com θ o ângulo de incidência, e φ o ângulo no plano da fachada, de 0° (à direita, no horizonte) a 180° (à esquerda, no horizonte), passando por 90° (para cima). O quarto de esfera vira o retângulo φ de 0° a 180° e ρ de 0 a ρ_máx (cos θ_máx = 10⁻⁵, seção 7.2); as bordas do retângulo são o horizonte (φ = 0° e 180°) e o plano da fachada (ρ = ρ_máx), e as curvas terminam exatamente nelas. Grade padrão: 1° em φ e ρ_máx/120 em ρ (181 × 121 pontos; células de até 1° no céu).
2. **Quadrados marchantes** (*marching squares*) em cada nível. O ponto em que a curva cruza a aresta de uma célula é refinado por bisseção (34 passos, menos de 10⁻¹⁰ do comprimento da aresta), com o percentual exato da seção 7.3; células ambíguas (sela) são resolvidas pelo percentual no centro da célula. Os segmentos são ligados em linhas.
3. Cada vértice volta para uma direção (altura e azimute) e é desenhado na carta como qualquer direção.

**Precisão.** Os vértices estão sobre a curva exata (|f_s − nível| ≤ 10⁻⁶; no brise infinito, a menos de 10⁻⁸ grau da curva α). Entre dois vértices vizinhos (até cerca de 1° de distância no céu), a curva é aproximada por um segmento reto na carta; no brise infinito, o meio dos segmentos fica a até 0,002° da curva exata (distância angular na esfera; o erro cai com o quadrado do passo da grade). Regiões menores que uma célula podem não aparecer.

**Região de sombra total.** A região {f_s ≥ 1 − 10⁻⁹}, que a carta preenche, sai da mesma grade e dos mesmos pontos de cruzamento da curva de 100%: as linhas fechadas entram como anéis; cada linha aberta termina no contorno do retângulo (φ, ρ), e o anel segue pelo contorno, a partir de uma ponta, pelo lado em que os nós da grade estão dentro da região, até a ponta de linha vizinha (entre duas pontas vizinhas no contorno, os nós estão todos dentro ou todos fora), e assim por diante até fechar. Sem pontas no contorno, o retângulo inteiro entra como anel se o contorno está dentro. Os anéis são preenchidos pela regra par-ímpar, que dá os furos e as ilhas sem precisar do sentido de cada anel. No céu, o contorno do retângulo é o horizonte (φ = 0° e 180°), o plano da fachada (ρ = ρ_máx) e a normal (ρ = 0, um ponto só). Conferência: em campos analíticos (disco, meio disco na borda, quadrado com furo, coroa, dois cantos, faixa de borda a borda) e em quatro cenas (brise infinito, brise e aletas, brise da Figura 22 com o recuo do vidro e lâminas verticais que se sobrepõem de frente), o preenchimento coincide com f_s ≥ 1 − 10⁻⁹ em todas as direções sorteadas a mais de 0,01 da borda na carta (`contours.test.ts`).

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

**Precisão da média horária.** Com amostras no meio dos subintervalos, a média é de segunda ordem onde f_e varia suavemente. Onde f_e salta (nascer e pôr do sol, sol cruzando o plano da fachada), o erro de uma hora pode chegar a 1/(2N) = 0,083 por salto; esses saltos acontecem com o sol rasante, quando a radiação direta na janela é pequena, e na média do mês os erros de dias diferentes se compensam em parte.

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
| Percentual sombreado | área da união com shapely (GEOS), em 254 direções por cena, 15 cenas (as 8 geometrias do F2.3, lâminas horizontais e verticais, recuo, placa livre e combinações) | 10⁻⁹ |
| Percentual sombreado | traçado de raios, sem projeção: 400 × 400 células da janela com um ponto sorteado em cada (amostragem estratificada), raio até o sol e interseção com as placas; 20 direções por cena | 0,002 (erro de amostragem; o maior encontrado foi 0,0004) |
| Percentual sombreado do F2.3 | traçado de raios do F2.3 (grade de 41 × 41 com os pontos das bordas), 1500 direções × 9 casos; sombra total como "todos os pontos da grade à sombra" | 0,05 na fração (uma linha ou coluna da grade, 1/41, por borda de sombra); sombra total sem nenhuma direção diferente |
| Casos analíticos (brise e aleta infinitos, com e sem afastamento) | fórmulas da seção 7.5 | 10⁻¹² no percentual; 10⁻⁶ grau nos vértices das curvas; 0,01° no meio dos segmentos |
| Máscara de um ponto | traçado de raios: critério do centro do F2.3 (1500 direções × 9 casos) e dois pontos de cada uma das 15 cenas (254 direções) | nenhuma direção classificada errada |
| Sombra total (100%) | máscara pelos ângulos (seção 1.6) nos casos em que a união é exata; nos demais, a máscara pelos ângulos não pode ter direção fora da sombra total | nenhuma direção classificada errada |
| Fração ensolarada horária e mapa mês × hora | pvlib (SPA) e shapely, ano inteiro, 3 locais × 3 cenas | 10⁻⁶ |
| Coerência com a máscara | em todas as amostras do ano com o sol na janela (Florianópolis, 3 cenas): f_s = 1 implica o centro à sombra (máscara de um ponto), f_s = 0 implica o centro ao sol | nenhuma exceção |
| Fração ensolarada por passo de tempo e horária | EnergyPlus 26.2, *Surface Outside Face Sunlit Fraction* (F3.8), 8 cenas em 5 locais | seção 7.10 (proposta, decisão 0019) |

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

## 7.10 Verificação contra o EnergyPlus (F3.8)

**Arranjo** (`docs/validacao/scripts/energyplus_fracao_ensolarada.py`; modelos em `docs/validacao/casos/energyplus/modelos/`). Cada cena vira um modelo do EnergyPlus 26.2.0: uma zona em caixa atrás da fachada (paredes com 1 m de margem em volta da janela e 4 m de fundo), a janela (*FenestrationSurface:Detailed*, sem caixilho) na parede da frente e cada placa da seção 7.1 como *Shading:Building:Detailed*, nas coordenadas do mundo (x Leste, y Norte, z para cima). O EnergyPlus espelha as placas (*Mir-*), então as duas faces fazem sombra, como as placas finas daqui. Configuração: *Solar Distribution* FullExterior; *ShadowCalculation* PolygonClipping, Timestep, Sutherland e Hodgman; 6 passos por hora; ano de 2026, sem horário de verão; o local vem do cabeçalho do EPW. Saídas por passo de tempo: *Surface Outside Face Sunlit Fraction* da janela e *Surface Outside Face Beam Solar Incident Angle Cosine Value* da janela, da cobertura e das paredes laterais.

**Sol do EnergyPlus** (`SolarShading.cc`, versão 26.2.0). Com mais de um passo por hora, o sol de cada passo é calculado no fim do passo (`FigureSunCosines`), com a declinação e a equação do tempo do dia por séries de Fourier ajustadas por mínimos quadrados (`SUN3`, constantes no dia) e o ângulo horário pelo meridiano do fuso (`SUN4`). Os três cossenos de saída são as componentes, no referencial da fachada, do sol usado na sombra daquele passo (o cosseno reportado é o `SurfCosIncAng` do passo). Eles valem 0 nos passos em que o módulo do clima dá o sol abaixo do horizonte ou o arquivo climático não tem radiação (`currSolRadPositive` em `HeatBalanceSurfaceManager.cc`), mesmo com o sol da sombra acima do horizonte; por isso o teste reproduz o `SUN3` e o `SUN4` e confere a reprodução contra os cossenos onde eles são reportados (diferença nula nas 8 cenas; tolerância de 10⁻¹² no teste). Contra o SPA (seção 2.4), o sol do EnergyPlus difere 0,32° a 0,34° em média e até 0,59°: a declinação do `SUN3` difere até 0,67° (desvio padrão de 0,35°) e a equação do tempo, até 0,87 min.

**Regras de saída do EnergyPlus**, aplicadas também ao valor da aplicação na comparação: fração 0 com o seno da altura solar ou o cos θ abaixo de 10⁻⁵ (seção 7.2) e fração abaixo de 10⁻⁵ trocada por 0 (`FigureSolarBeamAtTimestep`).

**Limitações do EnergyPlus encontradas** (relatório do F3.8):

- O recorte de polígonos trabalha com coordenadas inteiras em unidades de 0,01 mm (`HCMULT` = 10⁵) e junta vértices a menos de 6 unidades (0,06 mm) dos vértices da superfície que recebe a sombra. A fração difere da exata em até 3 × 10⁻⁵ (percentil 99) e uma fresta de sombra de 0,05 mm de largura (lâmina quase de perfil para o sol) desaparece (1,7 × 10⁻⁴ da janela).
- Com o sol rasante à fachada (cos θ < 10⁻⁴), a sombra projetada tem quilômetros, e os produtos de inteiros de 64 bits do cálculo das interseções (`INTCPT`) passam do limite; o EnergyPlus erra a fração nos dois sentidos (13 passos no ano das 8 cenas, sempre com cos θ < 10⁻⁴, sombras de 3,6 a 43 km). Nesses passos a radiação direta no vidro é menor que 10⁻⁴ da DNI.

**Critérios (proposta, decisão 0019):**

| Comparação | Sol | Critério |
|---|---|---|
| Por passo de tempo, dias 1, 11 e 21 de cada mês | o do EnergyPlus, nos dois cálculos | com cos θ ≥ 10⁻³: diferença ≤ 5 × 10⁻⁴ e percentil 99 ≤ 5 × 10⁻⁵; com cos θ < 10⁻³: diferença × cos θ ≤ 5 × 10⁻⁴; nenhum passo com fração positiva no EnergyPlus e sol fora da janela no cálculo daqui |
| Hora a hora, ano inteiro | o do EnergyPlus, nos dois cálculos | ≤ 10⁻⁴ nas horas sem passo rasante (cos θ < 10⁻³); horas com passo rasante ≤ 1% do ano |
| Hora a hora, ano inteiro (ponta a ponta) | SPA aqui, `SUN3`/`SUN4` no EnergyPlus | sobre as horas com sol na janela em pelo menos um dos dois: RMSE ≤ 0,03 e viés ≤ 0,002 em módulo; o RMSE é o da posição do sol: a mesma geometria com os dois sóis dá o mesmo RMSE, com diferença ≤ 0,002 |

Resultados (8 cenas, 5 locais, latitudes de −1,4° a −36,8°, fusos UTC−3 e UTC−4): por passo, diferença máxima de 6 × 10⁻⁶ a 6,5 × 10⁻⁵ e percentil 99 de até 2,9 × 10⁻⁵; hora a hora com o mesmo sol, até 3 × 10⁻⁵ (6 a 25 horas rasantes por ano); ponta a ponta, RMSE de 0,006 a 0,026 e viés de até 3 × 10⁻⁴. A proposta do ROADMAP (RMSE ≤ 0,02 com o sol de cada programa) não separava a geometria da posição do sol; com ela, três cenas ficariam de fora só pela diferença entre os modelos de sol.

## 7.11 Janela e peças na interface: corte e vista (F3.1)

O passo 6 da interface (decisão 0023, proposta) descreve a janela e as peças da seção 7.1 em metros: largura e altura da janela, recuo do vidro e até 9 peças (brise horizontal, aleta à direita ou à esquerda, lâminas horizontais ou verticais), com os mesmos parâmetros e os mesmos padrões (campo em branco vale 0; profundidade, corda, passo e número de lâminas são obrigatórios; "i" ou "∞" é prolongamento infinito). O estado vai para o link: `jl`, `ja` e `jr` (janela) e `pc1` a `pc9` (uma peça cada, com o texto digitado em cada campo).

O corte e a vista são desenhados a partir das mesmas placas que entram no cálculo (`buildScene`), então o desenho mostra a geometria calculada, sem uma segunda descrição:

- **Corte:** plano vertical pelo meio da janela (x = W / 2), com a normal para a direita do desenho; as placas que cruzam o plano aparecem cortadas e as demais (aletas, lâminas verticais que não o cruzam) "em vista", tracejadas. Mostra α de cada brise e da lâmina mais baixa, do peitoril, no vidro, à aresta externa (o α interno da seção 1.6), e as cotas de altura da janela, profundidade, altura acima da verga e recuo.
- **Vista de fora:** projeção no plano da fachada, vista de fora, como na Figura 22 do tutorial da UFU: X = W − x, então o lado direito de quem está dentro aparece à esquerda do desenho, e a tela diz isso. Mostra γ de cada brise, do canto inferior do mesmo lado à ponta (o γ interno da seção 1.6), e as cotas da janela.
- **Escala:** o desenho é em metros. Na tela, a letra tem cerca de 12 px; na exportação em SVG e na impressão do passo 5, corte e vista saem lado a lado com o tamanho real na escala escolhida (1:10, 1:20, 1:25, 1:50 ou 1:100, padrão 1:50) e letra de 2,5 mm no papel.

Conferência: as funções do desenho reproduzem os ângulos e as cotas da Figura 22 do tutorial (α = 55,0° com a parede de 15 cm; γ = 50,2° e 59,5°) e o espelhamento da vista (`src/ui/geometry/drawings.test.ts`); os testes de ponta a ponta leem os pixels do corte e da vista (brise escuro na verga, vidro azul, prolongamento direito à esquerda do desenho, parede além das pontas), o tamanho do SVG exportado e o tamanho impresso (`e2e/geometria.spec.ts`).

## 7.12 Curvas e máscara de um ponto na carta (F3.2)

Com a janela e ao menos uma peça (ou um recuo do vidro, que já sombreia) no passo 6, a carta ganha duas camadas, cada uma com a sua opção no passo, na seção "Na carta":

- **Curvas de 0, 25, 50, 75 e 100%** (seção 7.5), para a orientação do passo 2, com o percentual escrito no meio de cada curva (ou num ponto de reserva da curva, quando o meio cai sobre outro rótulo). A curva de 0% é tracejada e a de 100% é mais grossa, para que o nível não dependa só da cor; a região de sombra total tem preenchimento leve, ou hachura horizontal quando há dados climáticos sobre a carta (como a máscara do passo 3). As curvas aparecem por padrão; `cs=0` no link as oculta.
- **Máscara de um ponto** (seção 7.4), em hachura vertical violeta, para o ponto (x, z) do vidro: x medido da lateral esquerda de quem está dentro olhando para fora e z acima do peitoril, de 0 à largura e de 0 à altura da janela. Liga com o ponto no centro da janela; o ponto pode ser digitado ou escolhido com um clique na vista de fora (arredondado a 5 cm, porque um pixel da vista passa de 1 cm no celular), e aparece marcado no corte e na vista. No link, `pt=x_z`.

Cores provisórias até a paleta da Fase 4 (decisão 0023): azul-petróleo #005f73 nas curvas e nos rótulos (contraste de 7,3:1 sobre o branco) e violeta #6f42c1 na hachura do ponto.

As curvas de uma geometria levam de 0,2 a 0,6 s num computador (mais num celular): o cálculo roda num web worker (`src/ui/shading/`), com cache das últimas 16 geometrias, e só depende da janela, das peças e da orientação, não do local nem do arquivo. Enquanto o worker calcula, a carta mostra as curvas anteriores esmaecidas e o aviso "Calculando as curvas da proteção…", sobre o canto da carta, sem empurrar o resto da tela; um pedido que ninguém mais espera (a geometria mudou de novo) sai da fila antes de começar. A máscara de um ponto é uma região exata (seção 7.4), leve, calculada na linha principal. A impressão leva as duas camadas como estão na tela; "só o transferidor" as tira.

Conferência de ponta a ponta (`e2e/curvas.spec.ts`), com pixels lidos da carta no caso analítico do brise infinito: cada curva de 25 a 100% passa pela altura h com tan h = cos ψ · (e + p · H) / D a ψ = 25° (e não a 3° dela), o preenchimento está dentro da curva de 100% e não entre as de 75% e 100%, e a hachura do ponto do centro da janela fica acima da curva de 50% e não abaixo dela (seção 7.4: é o mesmo critério); também o clique na vista, o cálculo no worker, a impressão, o teclado e o axe.

## Referências

- Olgyay, A.; Olgyay, V. *Solar control and shading devices*. Princeton: Princeton University Press, 1957.
- Sutherland, I. E.; Hodgman, G. W. Reentrant polygon clipping. *Communications of the ACM*, 17(1), 32-42, 1974.
- U.S. DOE. *EnergyPlus Engineering Reference*, módulo de sombreamento (*Shading Module*): projeção de sombras e recorte de polígonos.
- EnergyPlus 24.2.0 e 26.2.0, código-fonte: `src/EnergyPlus/SolarShading.cc` (`FigureSunCosines`, `FigureSolarBeamAtTimestep`, `SHADOW`, `SUN3`, `SUN4`, `HTRANS1`, `INTCPT`), `src/EnergyPlus/HeatBalanceSurfaceManager.cc` e `src/EnergyPlus/DataEnvironment.hh` (`SunIsUpValue`).
- U.S. DOE. *EnergyPlus 26.2.0* (pacote Linux, Ubuntu 24.04), https://github.com/NREL/EnergyPlus/releases/tag/v26.2.0, usado na verificação do F3.8.
- Gillies, S. et al. *Shapely* (GEOS), usado só na referência de teste.
- Holmgren, W. F.; Hansen, C. W.; Mikofski, M. A. pvlib python. *Journal of Open Source Software*, 3(29), 884, 2018.
