# 1. Convenções geométricas

**Status:** v0 (F0.4), para aprovação no portão 0. Itens marcados **[confirmar]** dependem de conferência com o SOL-AR 6.2 em execução (F2.2 e F2.8) ou de decisão do Anthony.

## 1.1 Direções no céu

- **Azimute** (A): ângulo horizontal a partir do Norte geográfico, no sentido horário, em graus no intervalo [0, 360). N = 0°, L = 90°, S = 180°, O = 270°.
- **Altura solar** (h): ângulo acima do plano do horizonte, de 0° (horizonte) a 90° (zênite). **Ângulo zenital** z = 90° − h.
- Vetor unitário da direção do sol, nas componentes (Leste, Norte, Cima):

  s = (cos h · sen A, cos h · cos A, sen h)

- Norte geográfico (verdadeiro), nunca magnético. A declinação magnética, se um dia for mostrada, é só informação ao usuário.

## 1.2 Fachada e referencial da fachada

- **Orientação da fachada** (A_f): azimute da **normal externa** (a direção para onde a fachada "olha"). Uma fachada norte tem A_f = 0°.
- Entrada de orientação: qualquer número real, inclusive negativo ou maior que 360; o programa normaliza para [0, 360). Ex.: −30° equivale a 330°. (O SOL-AR 6.2 só aceitava valores positivos.)
- Superfícies verticais apenas na v1. Superfícies inclinadas estão em `docs/ideias.md`.
- **Referencial da fachada** (x, y, z), usado em todas as fórmulas de máscara:
  - y: normal externa (horizontal, apontando para fora);
  - x: horizontal, no plano da fachada, **à direita de quem está dentro olhando para fora**;
  - z: vertical, para cima.
- **Ângulo azimutal relativo** do sol (ψ): diferença com sinal entre o azimute do sol e a normal da fachada, reduzida a (−180°, 180°]:

  ψ = A − A_f (reduzido); ψ > 0: sol à direita de quem olha para fora.

  Na literatura em inglês, |ψ| é o *horizontal shadow angle* (HSA).
- Componentes do sol no referencial da fachada:

  s_x = cos h · sen ψ, s_y = cos h · cos ψ, s_z = sen h

- O sol **está diante da fachada** quando s_y > 0 (|ψ| < 90°) e h > 0. Fora disso, a fachada está em sombra própria e nenhuma proteção é necessária.

**Direita e esquerda [confirmar].** Adotamos "à direita de quem está dentro olhando para fora". Na carta (vista de cima, Norte para cima), com o transferidor girado para a normal apontar para cima, esse lado coincide com a direita do papel. O SOL-AR 6.2 rotula "Beta Direita" e "Gama Direita" sem dizer o observador; a convenção dele será conferida na regressão (F2.8).

## 1.3 Ângulos de sombra: α, β e γ

Os três ângulos descrevem a proteção vista de um ponto da abertura e são o vocabulário do ensino brasileiro (Bittencourt, *Uso das cartas solares*; Frota e Schiffer, *Manual de conforto térmico*; aulas do LabEEE). O SOL-AR 6.2 tem um seletor **"Ângulo de Referência: Interna / Externa"** que muda a linha a partir da qual cada ângulo é medido. Os diagramas que o próprio 6.2 mostra para cada caso, extraídos do executável, estão em [`../referencias/solar-6.2/angulos-referencia-6.2.png`](../referencias/solar-6.2/angulos-referencia-6.2.png); as figuras abaixo os reproduzem.

Nas duas referências vale, para os três ângulos:

**valor externo = 90° − valor interno**

| Ângulo | Proteção que descreve | Plano onde é medido | Ponto da abertura (sombra de 100%) | Interna: medido a partir de | Externa: medido a partir de |
|---|---|---|---|---|---|
| α | brise horizontal (beiral, marquise) | corte vertical perpendicular à fachada (plano y–z) | base da abertura (peitoril) | plano da fachada (vertical) | horizontal (normal) |
| β | brise vertical (aleta) | planta (plano x–y) | aresta vertical **oposta** à aleta | plano da fachada | normal da fachada |
| γ | limite lateral de um brise horizontal finito, ou limite superior de um brise vertical finito | plano da fachada, vista de dentro para fora (plano x–z) | canto inferior do **mesmo lado** do limite | vertical (aresta da abertura) | horizontal (peitoril) |

![α](figuras/alfa.svg)

![β](figuras/beta.svg)

![γ](figuras/gama.svg)

As figuras são geradas por [`figuras/gerar_figuras.py`](figuras/gerar_figuras.py).

### Coerência com outras fontes

- **α interno** coincide com o **AVS** da INI-C (Inmetro, 2020, item 4.7: ângulo entre o plano vertical na base da folha de vidro e o plano que passa pela extremidade mais distante da proteção) e com a figura da aula "Orientação e diagrama solar" do LabEEE (Lamberts), em que α é marcado a partir da vertical no corte e transferido para o transferidor a partir do zênite.
- **β interno** coincide com o **AHS** da INI-C (item 4.8: ângulo entre o plano que contém a base da folha de vidro e o plano que passa pela extremidade mais distante da aleta e pela extremidade **oposta** da base).
- **α externo** é o *vertical shadow angle* (ângulo de perfil) da literatura em inglês; **β externo** é o *horizontal shadow angle*.
- A INI-C limita AVS a 0° a 90° e AHS a 0° a 80° no metamodelo; aqui os ângulos aceitam 0° a 90°.

### Ângulos do sol nas mesmas grandezas

Para comparar o sol com uma proteção, calculamos os ângulos que a própria direção do sol faz nos mesmos planos (sol diante da fachada, s_y > 0):

- α do sol (externo, ângulo de perfil): tan α_ext,sol = s_z / s_y = tan h / cos ψ
- β do sol (externo): β_ext,sol = |ψ|, do lado de ψ (direita se ψ > 0)
- γ do sol (externo): tan γ_ext,sol = s_z / |s_x| = tan h / |sen ψ|, do lado de ψ

Os valores internos são 90° menos os externos.

### Condições de sombra (sombra de 100%, proteções infinitas ou limitadas)

Com os ângulos em referência **externa**:

| Proteção | O sol está bloqueado quando |
|---|---|
| Brise horizontal infinito, ângulo α | α_ext,sol ≥ α_ext |
| Aleta vertical infinita à direita, ângulo β | ψ > 0 e β_ext,sol ≥ β_ext (idem à esquerda com ψ < 0) |
| Brise horizontal finito: α limitado por γ à direita | α_ext,sol ≥ α_ext **e**, se ψ > 0, γ_ext,sol ≥ γ_ext,direita (idem à esquerda) |
| Aleta vertical finita: β limitado por γ | condição de β **e** γ_ext,sol ≤ γ_ext da aresta superior da aleta **[confirmar]** |

As três primeiras linhas foram verificadas numericamente contra traçado de raios (ponto na abertura, raio até o sol, interseção com a placa) em 20 000 casos aleatórios cada. A quarta segue da mesma geometria, mas o ponto da abertura que define a sombra de 100% para a aresta superior da aleta e a forma como o 6.2 usa γ nesse caso precisam de conferência (F2.2).

### Índices 1 e 2 [confirmar]

O SOL-AR 6.2 tem campos α1 e α2, β direita 1 e 2, β esquerda 1 e 2, γ direita 1 e 2, γ esquerda 1 e 2; o campo "2" só fica ativo depois do "1". Pelo diagnóstico, o "2" representa brises afastados da parede. Interpretação proposta: um brise afastado deixa uma fresta junto à parede, e a sombra fica entre duas curvas, a da aresta externa (índice 1) e a da aresta interna (índice 2); por exemplo, para o brise horizontal, o sol é bloqueado quando α_ext,1 ≤ α_ext,sol ≤ α_ext,2. Essa leitura será conferida contra o 6.2 no F2.2 antes de ser implementada.

## 1.4 Curvas do transferidor

Cada valor de α, β ou γ corresponde a um plano que passa pelo observador; na esfera celeste, esse plano é um círculo máximo, e na projeção estereográfica (seção 3) um círculo máximo vira uma circunferência ou uma reta. Por isso as curvas do transferidor são exatas, não aproximações:

| Curva | Plano | Polo do plano (referencial da fachada) | Imagem na carta |
|---|---|---|---|
| α constante | contém o eixo x, inclinado α_ext sobre a horizontal | m = (0, −sen α_ext, cos α_ext) | arco que passa pelos dois pontos do horizonte no plano da fachada (ψ = ±90°) |
| β constante | vertical, azimute relativo ±β_ext | horizontal | reta radial pelo centro da carta |
| γ constante, à direita | contém o eixo y, inclinado γ_ext sobre a horizontal | m = (−sen γ_ext, 0, cos γ_ext) | arco que passa pelos pontos do horizonte na normal (ψ = 0°) e na direção oposta (ψ = 180°) |

As fórmulas do centro e do raio de cada arco estão na seção 3.3.

## 1.5 Unidades e formatos

- Ângulos em graus na interface e nos arquivos; radianos só dentro dos cálculos.
- Unidades SI na interface: °C, %, m/s, W/m² (irradiância), Wh/m² (irradiação horária), m, cm (raio da carta impressa).
- Português: vírgula decimal e ponto de milhar (1.234,5). Os arquivos exportados (CSV) usam ponto decimal e vírgula como separador, para abrir em qualquer programa; a escolha fica registrada no cabeçalho do arquivo.

## Referências

- Bittencourt, L. *Uso das cartas solares: diretrizes para arquitetos*. 4. ed. Maceió: EDUFAL, 2004.
- Frota, A. B.; Schiffer, S. R. *Manual de conforto térmico*. São Paulo: Studio Nobel.
- Lamberts, R. *Aula 5: Orientação e diagrama solar* (Desempenho térmico de edificações, LabEEE/UFSC), slides 26 a 37: https://labeee.ufsc.br/sites/default/files/disciplinas/Aula-Orientacao%20e%20Diagrama%20solar.pdf
- Inmetro. *Instrução Normativa Inmetro para a Classe de Eficiência Energética de Edificações Comerciais, de Serviços e Públicas (INI-C)*, 2020, itens 4.6 a 4.8: https://labeee.ufsc.br/sites/default/files/documents/INIC_Dez2020.pdf
- SOL-AR 6.2 (LabEEE/UFSC, 2009): formulário principal (`TFormSolar`) do executável `ProjSolar.exe`, imagens `IAlfaInterno`, `IAlfaExterno`, `IBetaInterno`, `IBetaExterno`, `IGamaInterno`, `IGamaExterno` e seletor `rgAngulos` ("Interna", "Externa").
