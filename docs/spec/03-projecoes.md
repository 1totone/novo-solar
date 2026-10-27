# 3. Projeções e transferidor

**Status:** v0 (F0.4); seção 3.5 detalhada no F4.3 (26/10/2026, proposta, decisão 0025). A projeção estereográfica é a padrão (F1.3); as projeções equidistante e cilíndrica são opções.

## 3.1 Projeção estereográfica (padrão)

- Pólo de projeção no nadir, plano do horizonte como plano de projeção. A carta é vista **de cima**, como um mapa: Norte para cima, Leste à direita.
- Uma direção (Leste, Norte, Cima) = (s_E, s_N, s_U) vai para o ponto

  P = R · (s_E, s_N) / (1 + s_U)

  com R o raio da carta (o horizonte). Em coordenadas polares: raio r = R · tan(z/2), ângulo polar dado pelo azimute.
- **Círculos de altura** (h constante): circunferências concêntricas de raio R · tan((90° − h)/2).
- **Linhas de azimute:** retas radiais.
- **Inversa** (para cliques e leitura de pontos): com (X, Y) = P / R e ρ = √(X² + Y²), z = 2 · atan(ρ) e A = atan2(X, Y), reduzido a [0, 360).
- **Escala angular:** dr/dz = (R/2) · sec²(z/2). Para R = 6 cm (padrão de impressão do 6.2), 1° vale 0,52 mm no zênite e 1,05 mm no horizonte.
- No SVG, o eixo vertical cresce para baixo: y_svg = centro − Y.
- Implementação: `src/core/chart/stereographic.ts`; validação em `docs/validacao/relatorios/F1.3-carta-estereografica.md`.

## 3.2 Propriedade usada nas máscaras

A projeção estereográfica leva circunferências da esfera em circunferências (ou retas) do plano. Todo plano que passa pelo observador corta a esfera num círculo máximo; logo, as bordas de máscara de arestas retas (brises, aletas, bordas de obstrução) são arcos de circunferência na carta, e o transferidor é exato.

## 3.3 Imagem de um círculo máximo

Para o círculo máximo de polo unitário m = (m_E, m_N, m_U), com m_U ≠ 0:

- centro: C = R · (m_E, m_N) / m_U
- raio: ρ = R / |m_U|

Se m_U = 0, o plano é vertical e a imagem é a reta radial na direção perpendicular a (m_E, m_N). (Verificado numericamente para polos aleatórios: os pontos projetados do círculo ficam a ρ do centro C com erro relativo menor que 10⁻⁷.)

**Curvas do transferidor** (seção 1.4), no referencial 2D da fachada (x à direita de quem olha para fora, y na direção da normal):

| Curva | Centro | Raio |
|---|---|---|
| α (referência externa α_ext) | (0, −R · tan α_ext) | R / cos α_ext |
| γ à direita (γ_ext) | (−R · tan γ_ext, 0) | R / cos γ_ext |
| γ à esquerda (γ_ext) | (+R · tan γ_ext, 0) | R / cos γ_ext |
| β (β_ext, de cada lado) | reta radial no azimute relativo ±β_ext | |

Só o trecho dentro do círculo do horizonte e do lado da normal (y > 0) interessa. Implementação: `src/core/protractor/protractor.ts`; grade de fundo como a do 6.2 (curvas de α de 5° em 5°, de 5° a 85°, e retas de β de 10° em 10°). Para α_ext → 90° (ou α interno → 0°), o arco tende à reta da fachada.

**Passagem para a carta** (azimute da normal A_f): um vetor (x, y) do referencial da fachada vai para

E = x · cos A_f + y · sen A_f,  N = −x · sen A_f + y · cos A_f

(com A_f = 0°, fachada norte, x aponta para Leste, como esperado para quem olha para o Norte).

## 3.4 Impressão em escala

- O raio da carta impressa é dado em centímetros (padrão 6 cm, como no 6.2; aceita de 2 a 20 cm). Como o desenho vai até 1,32 raio (rótulos de azimute), a carta impressa tem 2,64 raios de largura: 15,84 cm com o raio padrão. Numa folha A4 em pé (margens de 12 mm) cabe até 7 cm de raio; a tela avisa quando o raio pede folha maior.
- Impressão pelo navegador (imprimir ou salvar em PDF), com cabeçalho (local, coordenadas, fuso, origem dos dados, data, raio) e uma régua de 5 cm para conferir a escala. Opções: incluir ou não transferidor, máscara, dados e legenda; "só o transferidor", para imprimir em transparência.
- SVG exportado com largura e altura em centímetros (2,64 raios) e os estilos embutidos em cada elemento; PNG de 2400 × 2400 pixels.
- Tolerância: ±1 mm no raio, medido com régua numa impressão a 100% (F2.6). Verificação automática: raio do horizonte na mídia de impressão (CSS) e num PDF gerado pelo Chromium e rasterizado a 600 dpi (relatório do F2.6).

## 3.5 Outras projeções (F4.3)

Proposta da decisão 0025. As três projeções mostram o mesmo céu e as mesmas camadas; muda só o desenho. Coordenadas da carta: x para a direita e y para cima (no SVG, y_svg = −y), com a mesma unidade R da carta estereográfica.

### 3.5.1 Equidistante polar

- Mesma orientação da estereográfica: zênite no centro, Norte para cima, Leste à direita, carta vista de cima.
- r = R · z / 90°, com z o ângulo zenital em graus: x = r · sen A, y = r · cos A. O horizonte tem raio R, como na estereográfica.
- **Inversa:** z = 90° · ρ, A = atan2(x, y) reduzido a [0, 360), com ρ = √(x² + y²) / R.
- **Círculos de altura** equidistantes: raio R · (90° − h) / 90°. **Linhas de azimute:** retas radiais.
- **Escala angular constante:** 1° vale R / 90 em toda a carta (0,67 mm com R = 6 cm), contra 0,52 mm no zênite e 1,05 mm no horizonte na estereográfica.
- **Transferidor:** a projeção não leva circunferências em circunferências (seção 3.2), então as curvas de α e de γ e as bordas da máscara são traçadas ponto a ponto, amostrando o círculo máximo na esfera (seção 3.5.3). Os planos verticais pelo observador continuam retas pelo centro: as retas de β, a normal e a linha da fachada são as mesmas da estereográfica.

### 3.5.2 Cilíndrica

- **Centrada na normal da fachada** do passo 2: eixo horizontal com o azimute relativo ψ = A − A_f, reduzido a [−180°, 180°), positivo à direita de quem está dentro olhando para fora (spec 01, seção 1.2); eixo vertical com a altura h.
- x = R · ψ / 180°, y = R · h / 90°: a faixa de 0° a 90° de altura tem altura R, e a volta inteira, largura 2R. A escala vertical por grau é o dobro da horizontal (carta de 2 × 1, que cabe na folha com o mesmo R das outras projeções).
- **Inversa:** ψ = 180° · x / R, h = 90° · y / R, A = A_f + ψ.
- **Rótulos** do eixo horizontal com o azimute verdadeiro (A, de 30° em 30°, e os pontos cardeais); a normal fica no centro.
- **Costura:** a direção oposta à normal (ψ = ±180°) fica nas duas bordas laterais. Curvas e regiões que a atravessam são desenhadas dos dois lados (cópias deslocadas de ±2R, recortadas na carta).
- **Zênite:** é a borda superior inteira (y = R). Uma trajetória que passa perto dele corre junto à borda; as polilinhas são densificadas na esfera (seção 3.5.3) para que o trecho perto do zênite saia certo.
- **Transferidor** (fórmulas fechadas, com ψ e h em graus e os ângulos na referência externa):
  - curva de α: tan h = tan α · cos ψ, para |ψ| ≤ 90°;
  - curva de γ à direita: tan h = tan γ · sen ψ, para 0° ≤ ψ ≤ 180° (à esquerda, ψ → −ψ);
  - retas de β: verticais em ψ = ±β; linha da fachada: verticais em ψ = ±90°; normal: vertical em ψ = 0.

### 3.5.3 O que vale para as três

- **Camadas:** trajetórias, linhas horárias, células dos dados, máscara pelos ângulos, máscara pela geometria (curvas e máscara de um ponto), período do dimensionamento e desenho à mão são definidos por direções do céu e desenhados em qualquer projeção.
- **Polilinhas:** entre duas direções vizinhas, a curva é o arco de círculo máximo, densificado na esfera até passos de no máximo 0,5° antes de projetar (na estereográfica, como antes, as polilinhas são projetadas sem densificar).
- **Regiões da máscara** (spec 01, seção 1.6): cada borda é um círculo na esfera (círculos de α e γ, horizonte) ou um plano vertical (β, fachada). Na estereográfica, continuam arcos e retas exatos. Nas outras, o círculo de borda é amostrado a cada 0,5° no céu e a região é o lado certo dele:
  - a calota do círculo de α ou de γ contém o zênite ou o nádir (círculos máximos que não passam pelo zênite); na equidistante, a calota que contém o nádir é o lado de fora da curva; na cilíndrica, a curva dá a volta inteira e a calota é fechada pela borda de cima (zênite) ou de baixo (nádir);
  - um semiplano pelo centro (plano vertical) é, na equidistante, o mesmo semiplano, e, na cilíndrica, a faixa de 180° de azimute;
  - o polígono desenhado à mão tem arestas retas na carta estereográfica (a projeção do SOL-AR 6.2); nas outras, as arestas são amostradas nessa reta e projetadas.
- **Erro de desenho** fora da estereográfica: a distância entre a polilinha e a curva exata fica abaixo de 10⁻⁴ R (0,006 mm com R = 6 cm), conferida no teste (seção 3.5.4). A região continua sendo exatamente o mesmo conjunto de direções; só a borda desenhada é uma polilinha.
- **Clique e cursor:** inversa da projeção ativa. Um clique fora do horizonte (ou abaixo de h = 0 na cilíndrica) vai para o horizonte, na mesma direção.
- **Impressão em escala** (seção 3.4): o raio pedido, R em cm, é o raio do horizonte nas projeções azimutais e a altura da faixa de 0° a 90° na cilíndrica. A tolerância é a mesma (±1 mm).

### 3.5.4 Validação

| Grandeza | Referência | Tolerância |
|---|---|---|
| Coordenadas na equidistante e na cilíndrica das posições do sol nos analemas | pvlib (`spa_python`) e as fórmulas acima, num script Python independente (`docs/validacao/scripts/gerar_projecoes_analemas.py`) | 10⁻⁶ R (a direção do sol tem a tolerância de 0,01° da spec 02; com o mesmo ponto, as fórmulas coincidem a 2 × 10⁻⁸ R, o arredondamento da referência) |
| Curvas do transferidor (α, γ, β) na equidistante e na cilíndrica | pontos das curvas pelas fórmulas da seção 3.5.2, no mesmo script | 10⁻⁴ R da polilinha desenhada (0,006 mm com R = 6 cm) |
| Regiões da máscara fora da estereográfica | a região exata da spec 01 (seção 1.6) em direções sorteadas | nenhuma direção a mais de 0,5° da borda classificada errada |
| Ida e volta (projeção e inversa) | direções sorteadas | 10⁻⁹ grau |

## 3.6 Leitura de um ponto (decisão 0045)

Passar o mouse sobre a carta, ou tocar nela, mostra a leitura do ponto: altura, azimute e quando o sol passa por ali. Núcleo em `src/core/chart/readout.ts`; interface em `src/ui/chart/ChartReadout.tsx`.

1. **Direção:** inversa da projeção ativa (seção 3.5.3). Fora do céu desenhado (fora do horizonte nas azimutais; fora da faixa de 0° a 90° ou da largura na cilíndrica), não há leitura. Altura e azimute arredondados a 1°, com o rumo de 16 pontos.
2. **Declinação e ângulo horário** que levam o sol à direção (triângulo de posição, com φ a latitude, z o ângulo zenital e A o azimute a partir do Norte, sentido horário):

   sen δ = cos z · sen φ + sen z · cos A · cos φ
   H = atan2(−sen z · sen A, cos z · cos φ − sen z · cos A · sen φ), positivo à tarde

   A hora solar verdadeira do ponto é 12 + H/15. A conta é geocêntrica: a paralaxe do sol (até 0,0024°) fica de fora; as trajetórias da carta são topocêntricas (spec 02), e a diferença é menor que um centésimo de pixel numa carta de 600 px.
3. **Datas:** a declinação do sol vem do SPA (spec 02) a cada 0 h UT do ano de referência, com a equação do tempo, e é interpolada pela parábola dos três dias mais próximos. Para cada dia, no instante da hora solar do ponto, compara-se a declinação do sol com a do ponto. Onde a diferença muda de sinal entre dois dias, o ponto fica entre as trajetórias desses dias; a passagem é dada no dia mais próximo (a declinação muda até 0,41° por dia; a meio caminho, 0,2°, menos que o raio do disco solar, 0,267°). Entre os solstícios, a declinação passa por cada valor duas vezes: duas datas, simétricas em relação ao solstício.
4. **Além da trajetória do solstício:** sem cruzamento, o ponto fica do lado de fora da trajetória de 21/06 (ou de 21/12). Se a distância a ela for menor que o raio do disco solar (959,63″ a 1 UA, raio nominal da IAU 2015), o disco ainda cobre o ponto: uma data, a do dia em que a trajetória passa mais perto, com o aviso "a borda do sol". Mais longe, o sol nunca passa por ali.
5. **Hora legal:** com os analemas na carta (seção 3.5 e spec 02, seção 2.5.1), a leitura dá também a hora legal (fuso do arquivo) de cada passagem; a hora solar é a mesma nas duas datas, a legal não (equação do tempo).
6. **Perto dos solstícios, a data é mal condicionada:** a declinação quase não muda de um dia para outro (δ ≈ δₘₐₓ − 0,0036° · d², com d em dias a partir do solstício). Um ponto 0,2° para dentro da trajetória de 21/06 dá datas cerca de 7 dias antes e depois dela. É o que o céu faz, e a leitura diz: o sol passa ali nas duas datas.

### 3.6.1 Validação

| Grandeza | Referência | Tolerância |
|---|---|---|
| Hora solar do ponto | posições do sol pelo pvlib nas linhas horárias de 6 locais, dia 21 de cada mês de 2026 (`docs/validacao/casos/carta/linhas-horarias.csv`, 852 pontos) | 1 min |
| Instante da passagem, fora dos solstícios | os mesmos pontos (exceto 21/06 e 21/12) | 30 min (paralaxe: até 17 min a 31 dias do solstício) |
| Passagem nos solstícios | os mesmos pontos de 21/06 e 21/12 | declinação do sol na passagem a menos de 0,003° da do ponto do pvlib, até 2 dias dele |
| Ida e volta | direções de 5° a 85° de ângulo zenital, a cada 15° de azimute, em Recife, Florianópolis e Helsinque | o disco do sol (SPA) cobre o ponto em cada passagem devolvida |

## Referências

- Snyder, J. P. *Map Projections: A Working Manual*. USGS Professional Paper 1395, 1987 (projeção estereográfica, preservação de circunferências).
- Bittencourt, L. *Uso das cartas solares*, capítulos sobre a carta estereográfica e o transferidor.
- Mazria, E. *The Passive Solar Energy Book*. Emmaus: Rodale Press, 1979 (cartas cilíndricas do sol e máscaras de sombra nessa projeção).
- Prša, A. et al. Nominal values for selected solar and planetary quantities: IAU 2015 Resolution B3. *The Astronomical Journal*, v. 152, n. 2, 41, 2016 (raio nominal do Sol).
