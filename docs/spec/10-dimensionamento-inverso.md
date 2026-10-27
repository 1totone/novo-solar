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

**Janela recuada** (recuo d entre o vidro e o plano externo da fachada, seção 7.1). Os ângulos continuam medidos dos pontos de referência no vidro, e as peças, do plano da fachada, onde se apoiam:

| Peça | Dimensão | Fórmula com recuo |
|---|---|---|
| Brise | profundidade | D = (H + e) · tan α1_int − g − d |
| Brise afastado | altura acima da verga | e = g · tan α2_ext (g medido do plano da fachada: o raio crítico passa rente à aresta externa da verga da parede) |
| Aleta | profundidade | D_a = W · tan β_int − d |
| Brise e aletas | prolongamentos | os mesmos de sem recuo, pelo γ |

Se H · tan α1_int ≤ d, a verga da parede já corta todo raio com perfil acima de α1 (e as ombreiras, os que saem pelo lado antes de chegar à altura da verga): não há brise a dimensionar. Do mesmo modo, se W · tan β_int ≤ d, a ombreira basta daquele lado.

Os **prolongamentos pelo γ** são os do método do transferidor (γ medido do canto inferior) e sombreiam o período, mas com recuo não são os mínimos: a ombreira corta parte do sol rasante, e o prolongamento mínimo de um brise é o maior valor de (H + e) · cot γ_sol − d · tan |ψ_sol| nas amostras do lado (no topo da aleta, W · tan γ_sol − d · tan α_sol). No exemplo do tutorial, com parede de 15 cm e janela de 1,2 × 1,0 m, são 0,61 m e 0,85 m em vez de 0,91 m e 1,63 m (relatório do F3.6). O núcleo mantém o γ: é a leitura do transferidor, vale também para as lâminas (em que o raio pode passar pela fresta junto ao vidro e sair pela ponta da lâmina de cima, e a fórmula por amostra não vale) e fica do lado seguro; o mínimo com a ombreira está em `docs/ideias.md`.

## 10.4 Subdivisão em lâminas mantendo os ângulos

**Brise horizontal → n lâminas horizontais** (n faixas; o peitoril dispensa lâmina, porque o sol vem de cima). O brise de profundidade D na altura H + e é trocado por n lâminas horizontais (inclinação 0, encostadas na fachada) de corda c = D / n, com passo vertical p = (H + e) / n, a primeira na altura do brise (H + e) e as outras abaixo dela, e prolongamentos P_d / n e P_e / n. Cada faixa da janela entre duas lâminas vizinhas (ou entre a mais baixa e o peitoril) é uma janela de altura p com a sua lâmina acima, na mesma proporção do brise original: tan α_int = c / p = D / (H + e), e o γ do canto inferior da faixa à ponta da lâmina é o mesmo, porque p / (P / n) = (H + e) / P. Os ângulos α e γ ficam iguais e cada lâmina sombreia a sua faixa sempre que o brise inteiro sombreava a janela.

**Aletas → lâminas verticais.** As duas aletas são trocadas por n + 1 lâminas verticais (rotação 0), que dividem a janela em n faixas: corda c, passo horizontal p = W / n, a primeira na lateral esquerda da janela e a última na direita. Numa faixa entre duas lâminas, a do lado do sol faz o papel da aleta, então o mesmo β vale para os dois lados: usa-se o mais exigente, c = p · tan(máx(β_int,direita, β_int,esquerda)), e o prolongamento acima da verga é P_a / n com o γ de aleta mais exigente. Se os dois lados pedem β diferentes, a subdivisão sombreia mais que as aletas originais do lado menos exigente.

**Com recuo d.** As lâminas ficam no plano da fachada; a primeira tem a verga da parede atrás de si, mas as outras ficam afastadas do vidro por d, sem nada na fresta. Um raio que sai da parte de cima de uma faixa passa pela fresta, entra na faixa de cima e pode sair por baixo da aresta externa da lâmina seguinte. Para fechar essa passagem, a corda de todas as lâminas é **c = p · tan α_int = (D + d) / n**, medida do plano da fachada (e não p · tan α_int − d, que daria o mesmo α medido do vidro): os raios que passam pela fresta percorrem menos de d em y até a lâmina, e a lâmina seguinte, a p acima, alcança d + c ≥ p · tan α_int. Com n = 1, a lâmina é o próprio brise (a verga fecha a fresta). O mesmo vale para as lâminas verticais, com c = p · tan β_int = (D_a + d) / n. O tutorial da UFU desconta a parede da corda de cada lâmina e o sol entra pela fresta (seção 10.7).

## 10.5 Implementação

`src/core/shading/inverse.ts`: amostras do período, ângulos exigidos, dimensões e subdivisão. As peças saem no formato de `src/core/shading/geometry.ts` (seção 7.1), prontas para a máscara pela geometria e para os indicadores.

## 10.6 Validação

| Grandeza | Referência | Tolerância |
|---|---|---|
| Ângulos exigidos (mínimos e máximos sobre as amostras) e a amostra que os determina | pvlib (NREL SPA), com a hora solar verdadeira pela equação do tempo (`docs/validacao/scripts/dimensionamento_inverso.py`), 5 casos | 0,01° |
| Ida e volta | máscara pela geometria do F3.2 (área exata): a proteção dimensionada sombreia 100% da janela em todas as amostras com sol na janela | f_s ≥ 1 − 10⁻⁹ |
| Minimalidade | o mesmo cálculo com cada dimensão reduzida em 0,1% (profundidade, prolongamentos, altura acima da verga, corda): alguma amostra deixa de ter 100% de sombra (um prolongamento curto demais abre só um triângulo no canto, de área proporcional ao quadrado da falta, por isso 0,1% e não menos) | f_s < 1 − 10⁻⁹ em pelo menos uma amostra |
| Subdivisão | ida e volta e minimalidade com as lâminas | as mesmas |
| Janela recuada (d = 0,15 m e d que basta sozinho) | ida e volta e minimalidade da profundidade e da corda; prolongamentos suficientes; a parede sozinha sombreia as amostras quando o núcleo diz que basta | as mesmas |
| Caso do tutorial do SOL-AR da UFU | leituras do tutorial (seção 10.7) | comparação documentada, sem tolerância: as leituras são gráficas |

## 10.7 Caso do tutorial do SOL-AR da UFU (Bortoli e Saramago)

Brasília (latitude −15,86°), fachada chamada nordeste com o transferidor a 30° (orientação 30°), referência interna (p. 9), sombrear das 9 h às 15 h (hora solar, a das linhas da carta). O tutorial lê α em torno de 55°, γ direita 50° e γ esquerda 60° (p. 10 a 13) e propõe o brise afastado 28 cm com α1 = 55° e α2 = 20° (p. 15).

**Datas.** O texto não diz as datas do período, mas a Figura 13 (p. 10) marca em verde a área entre as trajetórias de 22/06 e 22/12 e as linhas das 9 h e das 15 h da carta: **o ano todo, em hora solar**. É também o único recorte que explica o γ esquerda do tutorial, que só aparece com as tardes de junho, junto com o γ direita, que vem das manhãs de dezembro (relatório do F3.6: valores com o ano todo e com outros recortes).

**Dimensões (Figuras 22 a 25, p. 13 e 14).** Janela de 200 × 100 cm, com o vidro na face interna de uma parede de 15 cm (a parede não é cotada; medida na escala do corte, em que o α = 55° vai do canto interno do peitoril à aresta externa do brise). Com os ângulos lidos (55°, 50° e 60°) e d = 0,15 m, as fórmulas da seção 10.3 dão:

| Figura | Peça | Tutorial (cm) | Fórmula (cm) |
|---|---|---|---|
| 22 | brise: profundidade, prolongamento direito e esquerdo | 128, 120, 170 | 127,8, 119,2, 173,2 |
| 23 | 2 lâminas: corda, passo, prolongamentos | 56, 50, 60 e 85 | 56,4 (p · tan α − d), 50, 59,6 e 86,6 |
| 24 | 3 lâminas: corda, passo, prolongamentos | 32,5, 33, 40 e 57 | 32,6 (p · tan α − d), 33,3, 39,7 e 57,7 |
| 25 | 3 lâminas, prolongamentos arredondados | 60 e 60 (γ = 61° dos dois lados) | 60,1 com γ = 61° |

O tutorial usa as mesmas fórmulas, com o γ e o α medidos dos pontos de referência no vidro; o prolongamento esquerdo da Figura 22 é arredondado para baixo (3,2 cm a menos). Nas lâminas, a corda do tutorial desconta a parede (p · tan α − d), e o sol entra pela fresta entre o vidro e as lâminas de baixo: com a geometria das figuras e o ano todo, a sombra total cai de 99,2% das amostras do período (brise da Figura 22) para 94,6% (Figura 23) e 90,6% (Figuras 24 e 25), com até 19% e 28% da janela ao sol. Com a corda da seção 10.4, as lâminas voltam aos 99,2% do brise (só escapam as 9 h de maio a julho, pelo α lido de 55° contra os 57,5° do período).

**Brise afastado (Figura 26).** O α2 = 20° do tutorial é medido do peitoril, e não da verga: com o brise desenhado na altura da verga, não há sombra total na faixa de perfil entre α1 e α2 (relatório do F2.3, seção 2). Pela seção 10.3, para o período de 21/05 a 21/07 a fresta de 28 cm exige a aresta interna 1,33 m acima da verga; com o ano todo, a fresta é inviável.

## 10.8 Escolhas propostas (decisão 0022)

1. **Sombra de 100% da janela** como critério do dimensionamento (a sombra total da seção 1.6); dimensionar para uma sombra parcial fica para depois.
2. **Período em hora solar verdadeira** por padrão, hora legal como opção; amostras a cada 5 min, com as pontas; todos os dias do intervalo.
3. **Brise e aletas encostados nas laterais e na fachada**, com o brise na verga por padrão; afastamento do brise como opção, com a altura acima da verga calculada.
4. **Subdivisão** mantendo α e γ (lâminas horizontais) ou o β mais exigente (lâminas verticais).
5. **Tutorial da UFU com o ano todo**, confirmado pela Figura 13.
6. **Janela recuada:** peças medidas do plano da fachada; profundidades e cordas descontam o recuo só onde a parede fecha a fresta (o brise e a aleta, não as lâminas de baixo); prolongamentos pelo γ, do lado seguro.

## 10.9 Interface (F3.6)

No passo 6, a seção "Dimensionar pelo período" (decisão 0023, proposta) recebe o período: primeiro e último dia ("dd/mm", passando pelo fim do ano se preciso), primeira e última hora e a base das horas (hora solar verdadeira, padrão, a das linhas da carta, ou hora legal do fuso do local); em opções, o afastamento do brise e o número de lâminas da subdivisão. Começa com o verão (21/10 a 21/2, das 9 às 15 h solares). Estado no link: `dpi`, `dpf`, `dhi`, `dhf`, `dtb` (`l`, hora legal), `dbg` e `dbn`; `dvc=0` tira o período da carta.

- **Saídas:** quantas das posições do sol do período (a cada 5 min) ficam diante da janela; tabela dos ângulos exigidos (seção 10.2), internos com os externos entre parênteses, cada um com o sol que o determina (dia e hora); o brise (profundidade, altura acima da verga, afastamento e prolongamentos; ou o aviso de que a verga da parede já basta), as aletas de cada lado (ou o aviso de que não há sol daquele lado, de que a ombreira basta ou de que a aleta não serve, quando passaria de 3 vezes a largura da janela, o que acontece com o sol passando de frente para a janela) e as lâminas da subdivisão (seção 10.4). Aviso quando o brise passa de 3 vezes a altura da janela ou um prolongamento de 3 vezes a largura.
- **Na carta:** a área do período em verde (posições do sol nas horas inicial e final de cada dia e as trajetórias dos dias de menor e de maior declinação; `periodOutline`, exata em hora solar) e o sol que determina cada ângulo, marcado com o nome do ângulo, por cima das trajetórias.
- **Usar:** as peças vão para o passo 6 (substituindo as que havia), com as medidas arredondadas para cima, ao centímetro, para não ficarem menores que as calculadas; os ângulos vão para a sombra total do passo 3, na referência escolhida lá (os de aleta só do lado em que a aleta serve).
- **Cálculo:** num web worker (`src/ui/sizing/`), com cache: o ano inteiro em hora solar leva cerca de 1 s num computador.

Conferência de ponta a ponta (`e2e/dimensionamento.spec.ts`), com o exemplo de Brasília do tutorial (fachada a 30°, janela de 2,00 × 1,00 m com recuo de 0,15 m, o ano todo, das 9 às 15 h solares): 19 712 das 26 645 posições diante da janela; α de 57,5° (21/6, 9 h), γ direita de 42,2° (21/12, 9 h) e γ esquerda de 58,5° (21/6, 15 h), os valores do relatório do F3.6 (seção 3); brise de 1,42 m com prolongamentos de 1,63 e 0,91 m; aletas que não servem. Na carta, uma grade de pontos separada pelo contorno desenhado (dentro, esverdeados; fora, quase nunca) e o ponto de α sobre a trajetória de 21/6 e a linha das 9 h da própria carta. Usando o brise, o mapa mês × hora do passo 6 fica com 100% à sombra (ou sem sol na janela) das 10 às 14 h legais em todos os meses, horas que ficam dentro do período em qualquer época do ano; os ângulos vão para o passo 3. Também a hora legal, as lâminas, os campos inválidos, o teclado e o axe.

## Referências

- Bortoli, K. C. R.; Saramago, R. C. P. *Tutorial do programa SOL-AR*. Uberlândia: UFU (p. 9 a 15, exemplo de Brasília).
- Bittencourt, L. *Uso das cartas solares: diretrizes para arquitetos*. 4. ed. Maceió: EDUFAL, 2004 (dimensionamento de brises a partir da máscara).
- Olgyay, A.; Olgyay, V. *Solar control and shading devices*. Princeton: Princeton University Press, 1957.
