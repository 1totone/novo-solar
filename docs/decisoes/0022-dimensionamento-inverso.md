# 0022. Dimensionamento inverso (F3.6)

- Data: 2026-10-25
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 5 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)).

## Contexto

O F3.6 vai do período a sombrear para os ângulos (na referência escolhida) e as dimensões da proteção, com a subdivisão em lâminas mantendo os ângulos, e deve reproduzir o exemplo de Brasília do tutorial do SOL-AR da UFU. O Anthony pediu testes de ida e volta com o núcleo do F3.2 (o dispositivo dimensionado sombreia 100% das amostras do período), de minimalidade (reduzir qualquer dimensão deixa sol entrar) e a documentação da interpretação das datas do tutorial, que não estão no texto. Modelo na spec 10.

## Decisão

1. **Critério: sombra de 100% da janela** em todas as amostras do período (a sombra total da seção 1.6 da spec 01), com as menores dimensões. Dimensionar para uma sombra parcial (ex.: 50% ou um percentual da radiação) fica para depois.
2. **Período** em dias do ano de referência (todos os dias, inclusive, podendo passar pelo fim do ano) e horas em **hora solar verdadeira** (padrão, a das linhas da carta e do ensino) ou legal; amostras a cada 5 min, com as pontas.
3. **Ângulos** pelos extremos sobre as amostras: α1 = menor perfil; γ de cada lado = menor γ das amostras daquele lado; α2 do brise afastado = maior perfil; β de cada lado = menor |ψ|; γ do topo da aleta = maior γ. Cada ângulo sai com a amostra que o determina.
4. **Dimensões** pelas definições dos ângulos (spec 10, seção 10.3), com o brise na verga por padrão (altura acima da verga como opção) e aletas encostadas nas laterais. Com afastamento, a altura acima da verga é calculada para fechar a fresta. Sem limites artificiais de viabilidade: dimensões absurdas (aletas com o sol perto da normal, fresta com o sol rente à fachada) são devolvidas como estão, e a interface avisa.
5. **Subdivisão:** n lâminas horizontais com corda D / n e passo (H + e) / n (mesmos α e γ); n + 1 lâminas verticais com o β e o γ de aleta mais exigentes.
6. **Tutorial da UFU com o ano todo** como interpretação das datas: único recorte que combina os três ângulos lidos (γ esquerda das tardes de junho, γ direita das manhãs de dezembro). Confirmado em 25/10/2026 pela Figura 13 do tutorial (área verde de 22/06 a 22/12, das 9 h às 15 h da carta).
7. **Janela recuada** (acrescentado em 25/10/2026, com as figuras do tutorial): as peças são medidas do plano da fachada. O brise desconta o recuo, D = (H + e) · tan α_int − g − d, e a aleta, D_a = W · tan β_int − d, porque a verga e as ombreiras da parede fecham a fresta junto ao vidro; as lâminas não descontam, c = p · tan α_int = (D + d) / n, porque as de baixo ficam afastadas do vidro sem nada na fresta. Quando a parede sozinha basta, o núcleo diz isso em vez de dimensionar a peça. Prolongamentos pelo γ, como no transferidor: suficientes, mas não mínimos com recuo (a ombreira corta parte do sol rasante).

## Alternativas consideradas

- Dimensionar pela máscara pela geometria (otimização numérica das dimensões): mais geral (peças combinadas, sombra parcial), mas sem a ligação direta com os ângulos do transferidor que o método de ensino usa; as fórmulas fechadas são exatas para brise e aletas e ficam conferidas pela geometria (ida e volta).
- Período em hora legal por padrão: coerente com o EPW, mas a carta e o tutorial usam a hora solar.
- Um único β nas aletas dos dois lados: dimensionaria demais o lado menos exigente; fica só na subdivisão em lâminas verticais, em que uma lâmina serve aos dois lados.
- Interpretar o tutorial com outro recorte de datas: nenhum outro explica os três ângulos ao mesmo tempo (relatório do F3.6).

## Consequências

- Nova spec 10 (proposta) e núcleo em `src/core/shading/inverse.ts`, com as peças no formato de `geometry.ts`, prontas para a máscara pela geometria e os indicadores do F3.5.
- O caso do tutorial fica conferido nos ângulos e, com as figuras obtidas em 25/10/2026, nas dimensões das Figuras 22 a 25 (iguais às fórmulas com os ângulos lidos e o vidro na face interna de uma parede de 15 cm). As lâminas das Figuras 23 a 25 descontam a parede da corda e deixam sol entrar pela fresta (até 28% da janela); a regra do item 7 corrige isso (spec 10, seção 10.7).
- O prolongamento mínimo com recuo, calculado amostra por amostra, fica para depois (`docs/ideias.md`).
- A interface (marcar o período, ver as curvas e as peças) fica para depois do portão 2.
