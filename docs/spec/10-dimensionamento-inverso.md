# 10. Dimensionamento inverso

**Status:** proposta (núcleo de cálculo do F3.6), 25/10/2026. Escrita antes do portão 2, numa branch separada, sem interface. As escolhas que dependem do Anthony estão na seção 10.8 e na decisão 0022 (proposta).

O caminho direto (seções 1.6 e 7) parte da proteção e chega à máscara. O inverso parte do **período que se quer sombrear** e chega aos ângulos α, β e γ (na referência escolhida) e às dimensões da proteção que sombreia **100% da janela** em todo o período, com as menores dimensões possíveis. É o exercício clássico da carta solar: marcar o período na carta, ler os ângulos no transferidor e desenhar a proteção.

## 10.1 Período a sombrear

- **Datas:** de um dia a outro do ano de referência (2026), inclusive; o intervalo pode passar pelo fim do ano (ex.: de 21/10 a 21/02). Todos os dias do intervalo entram.
- **Horas:** de uma hora a outra do dia, inclusive, em **hora solar verdadeira** (padrão: é a hora das linhas horárias da carta, seção 2.5, e a do método de ensino) ou em hora legal (no fuso do local, sem horário de verão).
- **Amostras:** a cada 5 min (editável), incluindo as duas pontas. Em hora solar, o instante de cada amostra é aquele em que o ângulo horário do SPA vale 15° · (hora − 12), achado por iteração de Newton, como nas linhas horárias (seção 2.5); em hora legal, o instante é direto.
- Só contam as amostras com o **sol na janela** (acima do horizonte e diante da fachada, seção 7.2); as outras já estão em sombra própria.

Os ângulos exigidos são extremos sobre as amostras. Com todos os dias amostrados e as pontas do intervalo de horas incluídas, os casos comuns (extremo numa das pontas, num solstício dentro do intervalo ou ao meio-dia) entram exatamente; um extremo entre duas amostras de 5 min pode faltar por pouco, e o relatório do F3.6 mede essa diferença contra amostras de 1 min.

## 10.2 Ângulos exigidos

Com os ângulos do sol da seção 1.3 (externos) em cada amostra: ângulo de perfil α_sol, ângulo azimutal relativo ψ e ângulo no plano da fachada γ_sol.

**Brise horizontal, sem afastamento.** Pelas condições de sombra da seção 1.3, o sol é bloqueado quando α_sol ≥ α_ext e, do lado em que está (ψ > 0 à direita, ψ < 0 à esquerda), γ_sol ≥ γ_ext daquele lado. Os ângulos que sombreiam todas as amostras com a menor proteção são:

- α_ext = mín α_sol sobre as amostras;
- γ_ext,direita = mín γ_sol sobre as amostras com ψ > 0 (sem amostras à direita, γ_ext,direita = 90°: nenhum prolongamento); idem à esquerda com ψ < 0.

**Brise horizontal afastado da fachada** (afastamento g dado). A fresta deixa passar o sol com perfil acima do ângulo da aresta interna, medido da verga (α2, seção 1.6). Além de α1 = α acima (aresta externa, medida do peitoril), é preciso:

- α2_ext = máx α_sol sobre as amostras: a aresta interna tem de ficar acima da verga o bastante para que a fresta não deixe passar o sol mais alto do período.

**Aletas, sem afastamento.** Uma aleta infinita à direita bloqueia o sol com ψ ≥ β_ext; limitada no topo, só enquanto γ_sol ≤ γ_ext da aleta (medido do canto superior oposto, seção 1.6). Para as amostras de cada lado:

- β_ext,direita = mín ψ sobre as amostras com ψ > 0; γ_ext,aleta direita = máx γ_sol sobre as mesmas amostras; idem à esquerda com |ψ|.
- Aletas não bloqueiam o sol na direção da normal (ψ = 0): se alguma amostra tem ψ muito pequeno, β_ext tende a 0 e a aleta a uma profundidade infinita; o núcleo devolve a profundidade e a interface deve dizer que aletas não servem para aquele período.

Os valores internos são 90° menos os externos (seção 1.3). Cada ângulo vem com a amostra que o determina (data e hora): é o ponto da carta por onde a curva do transferidor passa.

## 10.3 Dimensões

Janela de largura W e altura H; brise na altura e acima da verga (e ≥ 0, padrão 0); aletas encostadas nas laterais da janela. Com os ângulos internos (medidos do plano da fachada):

| Peça | Dimensão | Fórmula |
|---|---|---|
| Brise sem afastamento | profundidade | D = (H + e) · tan α_int |
| | prolongamento à direita | P_d = (H + e) · tan γ_int,direita (0 se γ_int = 0) |
| | prolongamento à esquerda | P_e = (H + e) · tan γ_int,esquerda |
| Brise afastado g | altura acima da verga | e = g · tan α2_ext (a aresta interna fica a e acima da verga, a g da fachada) |
| | profundidade (da aresta interna à externa) | D = (H + e) · tan α1_int − g, sempre positiva: com e = g · tan α2_ext e α2 ≥ α1, (H + e) · cot α1_ext ≥ H · cot α1_ext + g > g |
| | prolongamentos | como no brise sem afastamento, com o mesmo H + e |
| Aleta à direita | profundidade | D_a = W · tan β_int,direita |
| | prolongamento acima da verga | P_a = W · tan γ_ext,aleta direita |
| Aleta à esquerda | as mesmas, com os ângulos da esquerda | |

Cada fórmula é a da definição do ângulo na seção 1.3 (α1 do peitoril à aresta externa; α2 da verga à aresta interna; γ do canto inferior do mesmo lado à ponta do brise; β da aresta oposta à aresta externa da aleta; γ da aleta do canto superior oposto ao topo da aleta). O brise afastado com α2_ext perto de 90° (sol quase a pino no período) exige e muito grande: uma fresta junto à fachada não serve para aquele período.

## 10.4 Subdivisão em lâminas mantendo os ângulos

**Brise horizontal → n lâminas horizontais** (n faixas; o peitoril dispensa lâmina, porque o sol vem de cima). O brise de profundidade D na altura H + e é trocado por n lâminas horizontais (inclinação 0, encostadas na fachada) de corda c = D / n, com passo vertical p = (H + e) / n, a primeira na altura do brise (H + e) e as outras abaixo dela, e prolongamentos P_d / n e P_e / n. Cada faixa da janela entre duas lâminas vizinhas (ou entre a mais baixa e o peitoril) é uma janela de altura p com a sua lâmina acima, na mesma proporção do brise original: tan α_int = c / p = D / (H + e), e o γ do canto inferior da faixa à ponta da lâmina é o mesmo, porque p / (P / n) = (H + e) / P. Os ângulos α e γ ficam iguais e cada lâmina sombreia a sua faixa sempre que o brise inteiro sombreava a janela.

**Aletas → lâminas verticais.** As duas aletas são trocadas por n + 1 lâminas verticais (rotação 0), que dividem a janela em n faixas: corda c, passo horizontal p = W / n, a primeira na lateral esquerda da janela e a última na direita. Numa faixa entre duas lâminas, a do lado do sol faz o papel da aleta, então o mesmo β vale para os dois lados: usa-se o mais exigente, c = p · tan(máx(β_int,direita, β_int,esquerda)), e o prolongamento acima da verga é P_a / n com o γ de aleta mais exigente. Se os dois lados pedem β diferentes, a subdivisão sombreia mais que as aletas originais do lado menos exigente.

## 10.5 Implementação

`src/core/shading/inverse.ts`: amostras do período, ângulos exigidos, dimensões e subdivisão. As peças saem no formato de `src/core/shading/geometry.ts` (seção 7.1), prontas para a máscara pela geometria e para os indicadores.

## 10.6 Validação

| Grandeza | Referência | Tolerância |
|---|---|---|
| Ângulos exigidos (mínimos e máximos sobre as amostras) e a amostra que os determina | pvlib (NREL SPA), com a hora solar verdadeira pela equação do tempo (`docs/validacao/scripts/dimensionamento_inverso.py`), 5 casos | 0,01° |
| Ida e volta | máscara pela geometria do F3.2 (área exata): a proteção dimensionada sombreia 100% da janela em todas as amostras com sol na janela | f_s ≥ 1 − 10⁻⁹ |
| Minimalidade | o mesmo cálculo com cada dimensão reduzida em 0,1% (profundidade, prolongamentos, altura acima da verga, corda): alguma amostra deixa de ter 100% de sombra (um prolongamento curto demais abre só um triângulo no canto, de área proporcional ao quadrado da falta, por isso 0,1% e não menos) | f_s < 1 − 10⁻⁹ em pelo menos uma amostra |
| Subdivisão | ida e volta e minimalidade com as lâminas | as mesmas |
| Caso do tutorial do SOL-AR da UFU | leituras do tutorial (seção 10.7) | comparação documentada, sem tolerância: as leituras são gráficas |

## 10.7 Caso do tutorial do SOL-AR da UFU (Bortoli e Saramago)

Brasília (latitude −15,86°), fachada chamada nordeste com o transferidor a 30° (orientação 30°), referência interna (p. 9), sombrear das 9 h às 15 h (hora solar, a das linhas da carta). O tutorial lê α em torno de 55°, γ direita 50° e γ esquerda 60° (p. 10 a 13) e propõe o brise afastado 28 cm com α1 = 55° e α2 = 20° (p. 15).

**Datas (interpretação).** O texto não diz as datas do período. Adota-se **o ano todo** (todos os dias, das 9 h às 15 h): é a leitura natural de "sombrear das 9 h às 15 h", e é a única que explica o γ esquerda do tutorial, que só aparece com as tardes de junho, junto com o γ direita, que vem das manhãs de dezembro. Relatório do F3.6: valores com o ano todo e com outros recortes.

As dimensões das figuras 22 a 25 dependem das imagens das páginas (pendente).

## 10.8 Escolhas propostas (decisão 0022)

1. **Sombra de 100% da janela** como critério do dimensionamento (a sombra total da seção 1.6); dimensionar para uma sombra parcial fica para depois.
2. **Período em hora solar verdadeira** por padrão, hora legal como opção; amostras a cada 5 min, com as pontas; todos os dias do intervalo.
3. **Brise e aletas encostados nas laterais e na fachada**, com o brise na verga por padrão; afastamento do brise como opção, com a altura acima da verga calculada.
4. **Subdivisão** mantendo α e γ (lâminas horizontais) ou o β mais exigente (lâminas verticais).
5. **Tutorial da UFU com o ano todo** como interpretação das datas.

## Referências

- Bortoli, K. C. R.; Saramago, R. C. P. *Tutorial do programa SOL-AR*. Uberlândia: UFU (p. 9 a 15, exemplo de Brasília).
- Bittencourt, L. *Uso das cartas solares: diretrizes para arquitetos*. 4. ed. Maceió: EDUFAL, 2004 (dimensionamento de brises a partir da máscara).
- Olgyay, A.; Olgyay, V. *Solar control and shading devices*. Princeton: Princeton University Press, 1957.
