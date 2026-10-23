# 3. Projeções e transferidor

**Status:** v0 (F0.4). A projeção estereográfica é a padrão (F1.3); as projeções equidistante e cilíndrica entram no F4.3.

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

Só o trecho dentro do círculo do horizonte e do lado da normal (y > 0) interessa. Para α_ext → 90° (ou α interno → 0°), o arco tende à reta da fachada.

**Passagem para a carta** (azimute da normal A_f): um vetor (x, y) do referencial da fachada vai para

E = x · cos A_f + y · sen A_f,  N = −x · sen A_f + y · cos A_f

(com A_f = 0°, fachada norte, x aponta para Leste, como esperado para quem olha para o Norte).

## 3.4 Impressão em escala

- O raio da carta impressa é dado em centímetros (padrão 6 cm, como no 6.2) e sai em SVG ou PDF vetorial, com o tamanho físico declarado no arquivo.
- Tolerância: ±1 mm no raio, medido com régua numa impressão a 100% (F2.6).

## 3.5 Outras projeções (F4.3)

- **Equidistante** (polar equidistante): r = R · z / 90°. Os círculos máximos deixam de ser circunferências; o transferidor correspondente é traçado ponto a ponto.
- **Cilíndrica:** eixo horizontal = azimute, eixo vertical = altura.

## Referências

- Snyder, J. P. *Map Projections: A Working Manual*. USGS Professional Paper 1395, 1987 (projeção estereográfica, preservação de circunferências).
- Bittencourt, L. *Uso das cartas solares*, capítulos sobre a carta estereográfica e o transferidor.
