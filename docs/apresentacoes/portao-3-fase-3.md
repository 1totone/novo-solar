# SOL-AR, nova versão (v0.8): material do portão 3 (máscara calculada e quantificação)

- Preparado em 26/10/2026, para o portão 3 do roteiro (`docs/ROADMAP.md`): "máscaras validadas; indicadores revisados".
- Prévia da Fase 3 (branch de integração `claude/fase-3-autonomous-work-xwt1mh`, PR #35, em rascunho): https://1totone.github.io/novo-solar/pr/35/
- Situação: a Fase 3 está inteira na branch de integração e só entra na `main` depois dos portões 2 e 3. Nada da Fase 3 está marcado como feito no ROADMAP. As decisões 0018 a 0024 estão aceitas por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Este documento as leva ao portão (seção 6), que pode reabrir qualquer uma.
- Quem confere: o Anthony (física, normas e didática). O retorno do Prof. Lamberts e do LabEEE fica para o portão 4, mas a seção 9 sugere o que mostrar a eles, se houver ocasião.

## 1. Em poucas palavras

A v0.8 acrescenta, sem mudar os passos 1 a 5 da v0.5, a proteção descrita pelas dimensões e o efeito dela no ano:

- **Passo 6, "Proteção pelas dimensões"** (recolhido, "avançado"): janela, recuo do vidro e peças (brise, aletas, lâminas horizontais e verticais) em metros; corte e vista em escala; curvas de 0, 25, 50, 75 e 100% da janela à sombra e máscara de um ponto na carta, pela geometria exata; mapa mês × hora da sombra; dimensionamento pelo período a sombrear.
- **Passo 7, "Efeito no ano"** (recolhido): horas quentes e frias pela temperatura externa, com as hipóteses na tela; radiação direta bloqueada nas horas quentes e admitida nas horas frias; comparação de alternativas sem índice único.
- **Aba "Vista 3D"**: sol, janela, peças e a sombra do cálculo no vidro, por data e hora.

Tudo o que é físico foi conferido contra referências independentes (shapely, traçado de raios, pvlib, pythermalcomfort e EnergyPlus 26.2), com tolerâncias na spec (seções 7 a 10).

## 2. Como usar os links

Os links abrem a prévia já no caso, sem carregar arquivo. Valem enquanto o PR #35 estiver aberto; depois da integração, os mesmos endereços com `https://1totone.github.io/novo-solar/` no lugar de `.../pr/35/` abrem o mesmo estado na versão publicada. Os passos 6 e 7 abrem sozinhos quando o link traz uma janela ou uma escolha da classificação. Os cálculos do ano rodam num *web worker*: no primeiro acesso a um local, contam alguns segundos (aviso "Calculando…").

## 3. Roteiro de conferência, em ordem de prioridade

Cada item diz o que olhar, o valor esperado e como conferir sem a ferramenta, quando dá.

### 3.1 Padrão da classificação das horas (decisão 0024) e indicadores (F3.4 e F3.5)

Florianópolis, dados históricos do 6.2, fachada Norte, janela de 1,50 × 1,20 m, brise de 0,80 m na verga, sem prolongamentos; alternativa "Brise curto" de 0,40 m guardada.

| Classificação | Link | Horas quentes / frias, entre as 3704 horas com sol na janela | Radiação direta sem proteção nas horas quentes / frias (kWh/m² de janela no ano) | Bloqueada nas quentes / admitida nas frias, brise de 0,80 m | Idem, brise curto de 0,40 m |
|---|---|---|---|---|---|
| Limiar de 20 °C (padrão atual, decisão 0024) | [abrir](https://1totone.github.io/novo-solar/pr/35/#alter1=Brise+curto%7C1%2C5%7C1%2C2%7C%7Cb_0%2C4&hist=1&ja=1%2C2&jl=1%2C5&local=florianopolis&o=0&pc1=b_0%2C8) | 66% / 33% (68% / 31% da radiação) | 190,6 / 85,2 | 60,3% / 59,7% | 41,9% / 76,3% |
| Faixa adaptativa da ASHRAE 55, ΔT = 0 (padrão da decisão 0020) | [abrir](https://1totone.github.io/novo-solar/pr/35/#alter1=Brise+curto%7C1%2C5%7C1%2C2%7C%7Cb_0%2C4&cm=a&hist=1&ja=1%2C2&jl=1%2C5&local=florianopolis&o=0&pc1=b_0%2C8) | 7% / 36% (8% / 31%) | 22,2 / 87,8 | 70,7% / 59,2% | 58,4% / 75,7% |
| Faixa adaptativa, ΔT = 2 °C | [abrir](https://1totone.github.io/novo-solar/pr/35/#alter1=Brise+curto%7C1%2C5%7C1%2C2%7C%7Cb_0%2C4&cg=2&cm=a&hist=1&ja=1%2C2&jl=1%2C5&local=florianopolis&o=0&pc1=b_0%2C8) | 17% / 21% (22% / 19%) | 60,0 / 52,1 | 66,7% / 63,6% | 52,3% / 78,3% |

O que conferir:

1. **A base de cada percentual.** Com a faixa adaptativa, "70,7% bloqueada nas horas quentes" se refere a 22,2 kWh/m², 8% da radiação direta que chega à janela; com o limiar de 20 °C, "60,3%" se refere a 190,6 kWh/m², 68% dela. O percentual quase não mostra a troca da base; por isso a tela põe os kWh/m² ao lado (revisão crítica da decisão 0020).
2. **O texto das hipóteses** do passo 7 (spec 08, seção 8.6, e spec 09): classe só pelo ar externo; o limiar de 20 °C com a fonte e "não se adapta ao clima do lugar"; a faixa adaptativa com o aviso de que vale para a operativa interna e tende a subestimar as horas quentes; temperatura da hora como média do início e do fim; partes das classes sobre as horas com sol na janela, não sobre as 8760.
3. **Conta à mão:** a tabela "Radiação direta na janela no ano, por classe de hora" do passo 7 fecha por linha (sem proteção = admitida + bloqueada; ex.: quentes, 190,6 = 75,6 + 115,0) e as partes das classes somam 100%.
4. **Alternativas:** o brise curto não é superado pelo de 0,80 m nem o supera (bloqueia menos nas quentes, admite mais nas frias); "Sem proteção" fica sempre na tabela como referência, e nenhuma linha é marcada como superada.

### 3.2 Fluxo e posição dos passos (decisão 0023)

[Tutorial do SOL-AR da UFU no passo 6](https://1totone.github.io/novo-solar/pr/35/#ja=1&jl=2&jr=0%2C15&local=brasilia&o=30&pc1=b_1%2C28___1%2C7_1%2C2): Brasília, fachada a 30°, janela de 2,00 × 1,00 m com o vidro 15 cm atrás da face da parede, brise de 1,28 m com prolongamentos de 1,70 m à esquerda e 1,20 m à direita (Figura 22 do tutorial).

- Passos 1 a 5 iguais aos da `main` (o teste de ponta a ponta confere que nada mudou neles e que o link básico não ganha chaves novas).
- Passos 6 e 7 recolhidos abaixo do 5, sob "Avançado"; aba "Vista 3D" entre "Carta solar" e "Rosa dos ventos".
- Conferir se a separação "geometria e local" (passo 6) e "clima" (passo 7) faz sentido para o ensino, e se o mapa mês × hora e o dimensionamento ficam bem no passo 6.

### 3.3 Curvas de percentual e máscara de um ponto (F3.2)

[Caso analítico: brise infinito](https://1totone.github.io/novo-solar/pr/35/#a1=33%2C69&ja=1%2C2&jl=1%2C5&local=florianopolis&o=0&pa1=53%2C13&pc1=b_0%2C8___i_i): janela de 1,50 × 1,20 m, brise de 0,80 m na verga com prolongamentos infinitos, e, no passo 3, α = 33,69° (sombra total) e α = 53,13° (sombra parcial), referência interna.

- **Conta à mão:** com brise infinito na verga, a fração sombreada é f = D · tan α_p / H, com α_p o ângulo de perfil externo. A janela fica toda à sombra para tan α_p ≥ H / D = 1,5, ou α_p ≥ 56,31° (α interno de 33,69°), e meio sombreada para tan α_p = 0,75, ou α_p = 36,87° (α interno de 53,13°). A curva de 100% tem de coincidir com a borda da sombra total do passo 3, e a de 50%, com a borda da parcial (o critério do centro é exato para brise infinito sem fresta). A curva de 0% é a linha da fachada.
- No link do item 3.2 (vidro recuado), a curva de 0% se reduz a um ponto (a normal no horizonte): com recuo, as ombreiras e a verga sombreiam alguma parte da janela em toda direção, exceto essa. O texto do passo explica (spec 07, seção 7.12).
- Cores provisórias (azul-petróleo nas curvas, violeta na máscara de um ponto) até a paleta da Fase 4.

### 3.4 Janela, peças, corte e vista (F3.1)

No link do item 3.2: campos em metros, cada um dizendo de onde é medido; corte pelo meio da janela e vista de fora com α, γ e cotas; exportação em SVG e impressão no passo 5 na escala escolhida (1:10 a 1:100). Conferir com régua uma impressão em 1:20 (a medida automática foi feita em PDF).

### 3.5 Mapa mês × hora (F3.3)

No link do item 3.1, seção "Sombra ao longo do ano" do passo 6: percentual da janela à sombra pela proteção, por mês e hora legal, só nas horas com sol na janela; as outras, hachuradas. Conferir que o mapa elimina a ambiguidade dos dois semestres da carta (cada mês na sua linha) e que a tabela e o CSV trazem os mesmos números.

### 3.6 Dimensionar pelo período (F3.6)

[Tutorial da UFU, ano todo, das 9 h às 15 h solares](https://1totone.github.io/novo-solar/pr/35/#dhf=15&dhi=9&dpf=31%2F12&dpi=1%2F1&ja=1&jl=2&jr=0%2C15&local=brasilia&o=30):

| Ângulo (referência interna) | Tutorial (leitura gráfica) | Calculado | Sol que o determina |
|---|---|---|---|
| α | 55° | 57,5° | 21/06, 9 h solar |
| γ direita | 50° | 42,2° | 21/12, 9 h solar |
| γ esquerda | 60° | 58,5° | 21/06, 15 h solar |

- Com α = 55°, as manhãs de 21/05 a 21/07 escapam da sombra (perfil de 32,5° no solstício, contra 35° do α externo do tutorial); a diferença de 2,5° vem do sol das 9 h perto de 21/06, que a leitura gráfica não pega. A tela mostra o ponto da carta que determina cada ângulo.
- Dimensões com o vidro recuado 15 cm: profundidade de 1,42 m (fórmula da spec 10, D = (H + e) · tan α − d), prolongamentos de 1,63 m à esquerda e 0,91 m à direita. As cotas das Figuras 22 a 25 do tutorial saem das fórmulas com os ângulos lidos e d = 0,15 m (relatório do F3.6).
- **Ponto para decidir:** nas Figuras 23 a 25, as lâminas descontam a parede da corda (p · tan α − d) e deixam o sol passar pela fresta junto ao vidro: 94,6% e 90,6% das amostras do período com sombra total nas Figuras 23 e 24, contra 99,2% do brise da Figura 22. A aplicação usa a corda que fecha a fresta, p · tan α (decisão 0022, item 7), e volta aos 99,2%.
- As aletas não servem para esse período (o sol passa pela normal): β exigido de 90° interno (0° externo), e a tela diz "não serve para este período".

### 3.7 Vista 3D (F3.7)

[Brasília, 21 de junho, 15 h](https://1totone.github.io/novo-solar/pr/35/#aba=3d&ja=1&jl=2&local=brasilia&o=30&pc1=b_0%2C6__0_0%2C3_0%2C3&pc2=ad_0%2C4&v3h=15&v3m=6): fachada a 30°, janela de 2,00 × 1,00 m, brise de 0,60 m com prolongamentos de 0,30 m e aleta direita de 0,40 m. A tela dá 76,6% da janela à sombra.

- **Conta à mão:** o sol vem da esquerda (ψ = −76,9°), a aleta da direita não sombreia, e a parte ensolarada é o triângulo sob a sombra da borda lateral do brise, de 0,797 × 1,177 m, ou 23,4% da janela.
- A sombra desenhada é a do cálculo, não a da placa de vídeo; nos testes, os pixels do vidro na vista de frente batem com a fração calculada com diferença de até 0,008.

### 3.8 Capturas

Computador e celular de cada passo em `docs/ux/capturas/F3.1-*.png` a `F3.7-*.png` (na branch de integração).

## 4. O que foi validado e contra quê

Relatórios em `docs/validacao/relatorios/` (na branch de integração). Os testes de referência rodam no CI a cada mudança.

| O quê | Referência independente | Casos | Resultado | Tolerância (spec) |
|---|---|---|---|---|
| Percentual sombreado da janela (F3.2) | shapely (área da união das sombras) | 15 cenas, 3810 direções do sol | 5 × 10⁻¹³ | 10⁻⁹ |
| | traçado de raios, sem projeção (400 × 400 pontos) | 300 direções | 0,0004 | 0,002 |
| Casos analíticos (brise e aletas infinitos, rentes e afastados) | fórmulas fechadas | 2000 direções cada | < 10⁻¹² | 10⁻⁹ |
| Sombra total pela geometria × pelos ângulos (F2.3) | traçado de raios do F2.3 | 9 casos, 13 500 direções | nenhuma direção diferente onde a união pelos ângulos é exata | |
| Curvas de 0 a 100% | curva α do brise infinito | 1677 vértices | 2,3 × 10⁻⁹ grau nos vértices; 0,0018° no meio dos segmentos | 0,1° |
| Fração ensolarada hora a hora (F3.3) | pvlib + shapely, ano inteiro | 3 locais × 3 cenas e 2 variantes | 5 × 10⁻¹¹; somas anuais a 5 × 10⁻⁹ h | 10⁻⁶ |
| Coerência mapa × máscara (pronto do F3.3) | máscara de um ponto no centro | todas as amostras do ano, 3 cenas | nenhuma hora a 100% com o centro ao sol nem a 0% com o centro à sombra | nenhuma exceção |
| Classificação das horas (F3.4) | numpy e pythermalcomfort 4.6.2 | 6 EPWs, 21 configurações, 183 960 horas | médias a 10⁻⁹ °C; t_pma a 0,05 °C (arredondamento da referência); todas as classes iguais | 10⁻⁹ °C; iguais |
| Indicadores (F3.5) | memória de cálculo à mão | 6 horas, 2 alternativas | 10⁻⁹ | 10⁻⁹ |
| | pvlib + shapely + DNI do EPW, ano inteiro | 11 combinações | 10⁻⁶ relativo | 10⁻⁶ |
| | EnergyPlus 26.2.0 (8 modelos do F3.8, com e sem as placas) | ano inteiro | até 0,83% em E₀, 1,66% em E e 0,64 ponto percentual nos percentuais, explicados por interpolação da DNI, instante das amostras e modelo do sol | conferência, sem critério de aceitação (decisão 0021); trava de regressão de 1%, 2% e 1 ponto |
| Dimensionamento inverso (F3.6) | pvlib | 5 casos, amostras de 5 min | 0,0018° | 0,01° |
| | ida e volta com a máscara do F3.2 | 6 proteções | 100% de sombra em todas as amostras; reduzir qualquer dimensão em 0,1% deixa sol entrar | |
| | Figuras 22 a 25 do tutorial da UFU | 4 desenhos | cotas a até 3,2 cm (arredondamento do tutorial) | |
| Vista 3D (F3.7) | fração calculada | 3 momentos, computador e celular | diferença de 0,0003 a 0,008 nos pixels do vidro | 0,02 |
| Fração ensolarada contra o EnergyPlus (F3.8): geometria com o mesmo sol | *Surface Outside Face Sunlit Fraction*, sol do EnergyPlus reproduzido | 8 cenas, 5 locais, passos de 10 min no ano | máx. 6,5 × 10⁻⁵ e p99 2,9 × 10⁻⁵ por passo; 3 × 10⁻⁵ hora a hora | 5 × 10⁻⁴ e 5 × 10⁻⁵; 10⁻⁴ (decisão 0019) |
| F3.8, ponta a ponta, cada programa com o seu sol | idem | 8 cenas | RMSE de 0,006 a 0,026; viés ≤ 3 × 10⁻⁴; explicado pelo sol (0,32° de diferença média entre o SUN3 do EnergyPlus e o SPA) | RMSE ≤ 0,03, viés ≤ 0,002 (decisão 0019) |
| Interface (fases 2 e 3) | testes de ponta a ponta em computador e celular | 133 testes, com leitura de pixels nas camadas da Fase 3 (curvas, mapa, barras, gráfico das alternativas, vista 3D), axe e teclado | todos passando | |

Os testes discriminam: mutações plantadas no núcleo (14 no F3.2 e no F3.3, 5 no F3.8) fazem pelo menos um teste falhar.

**Achados sobre o EnergyPlus**, úteis para quem compara resultados (relatório do F3.8, seção 4): a geometria em inteiros de 0,01 mm apaga frestas de sombra de menos de 0,06 mm, e, com o sol a menos de 0,005° do plano da fachada, a fração ensolarada sai errada nos dois sentidos (13 passos no ano, somadas as 8 cenas), provavelmente por estouro de inteiros de 64 bits no recorte. Efeito desprezível em energia.

## 5. Critérios de pronto da Fase 3

| Passo | Pronto quando (ROADMAP) | Situação |
|---|---|---|
| F3.1 Janela e dispositivos | geometria editável e desenhada corretamente | feito na integração; conferir o item 3.4 |
| F3.2 Máscara exata e percentual | casos analíticos reproduzidos (brise infinito gera exatamente a curva α) | feito; item 3.3 e seção 4 |
| F3.3 Fração ensolarada e mapa | consistente com a máscara em todas as horas do ano | feito; seção 4 |
| F3.4 Classificação das horas | hipóteses visíveis na tela | feito; item 3.1 e decisões 0020 e 0024 |
| F3.5 Indicadores | conferido à mão em casos simples, com a memória de cálculo; revisão do Anthony no portão 3 | memória de cálculo em `docs/validacao/relatorios/F3.5-memoria-de-calculo.md`; **falta a revisão** |
| F3.6 Dimensionamento inverso | reproduz o exemplo de Brasília do tutorial | feito, com as diferenças do item 3.6 explicadas |
| F3.7 Vista 3D | a sombra em 3D bate com a fração calculada | feito; item 3.7 |
| F3.8 Verificação contra o EnergyPlus | erro dentro da tolerância da spec (proposta: RMSE ≤ 0,02) | critérios trocados pela decisão 0019 (dois critérios, todos atendidos); **o "pronto quando" muda na integração** |

## 6. Decisões a aprovar

Todas estão aceitas por delegação (pré-revisão do Claude, 27/10/2026), com validação por colegas pendente, e aplicadas na integração. Para cada uma: o que diz, a recomendação e o que muda se o Anthony discordar.

| Decisão | O que diz | Recomendação | Se discordar |
|---|---|---|---|
| [0018](../decisoes/0018-mascara-pela-geometria.md) Máscara pela geometria | placas finas; percentual exato pela área da união das sombras; fração ensolarada por área, como a do EnergyPlus; 6 amostras por hora no meio de intervalos de 10 min; mapa em hora legal; curvas por quadrados marchantes refinados; recuo da janela; 29/02 com o dia 28 | aprovar | amostragem diferente (ex.: instantes do EnergyPlus) é uma opção já pronta no núcleo; espessura das peças exigiria mais placas |
| [0019](../decisoes/0019-verificacao-energyplus.md) Critérios do F3.8 | dois critérios: geometria com o mesmo sol (5 × 10⁻⁴ por passo, 10⁻⁴ por hora) e ponta a ponta com o sol de cada programa (RMSE ≤ 0,03, viés ≤ 0,002) | aprovar | com RMSE ≤ 0,02 ponta a ponta, 3 das 8 cenas reprovam só pela aproximação do sol do EnergyPlus (SUN3), não pela sombra |
| [0020](../decisoes/0020-classificacao-das-horas.md) Classificação das horas | temperatura da hora pela média de T(h − 1) e T(h); faixa adaptativa da ASHRAE 55-2023 com t_pma do próprio EPW e acréscimo por ganhos ΔT; temperatura de equilíbrio sem padrão; empates neutros; NBR 15575 fora | aprovar, com o item 2 substituído pela 0024 | trocar a temperatura da hora pela do fim muda de 1,7% a 7% das horas de classe; os limites da norma precisam da sua conferência no texto (pendência abaixo) |
| [0021](../decisoes/0021-indicadores-de-sombreamento.md) Indicadores | DNI constante na hora; dois percentuais (bloqueada nas quentes, admitida nas frias) com os kWh/m²; sem índice único; EnergyPlus como conferência | aprovar | "DNI enquanto há sol" já é opção do núcleo (muda até 2,4% na radiação de uma fachada Sudeste em Porto Alegre); um índice único exigiria pesar calor evitado contra perdido, o que depende do edifício |
| [0022](../decisoes/0022-dimensionamento-inverso.md) Dimensionamento inverso | sombra de 100% no período; hora solar por padrão; ângulos pelos extremos das amostras; dimensões pelas fórmulas; tutorial com o ano todo; janela recuada: brise e aletas descontam o recuo, lâminas não | aprovar | dimensionar para sombra parcial (50% ou percentual da radiação) é trabalho novo; aceitar a corda das lâminas do tutorial reabre a fresta junto ao vidro |
| [0023](../decisoes/0023-interface-da-fase-3.md) Interface da Fase 3 | passos 1 a 5 inalterados; passos 6 e 7 recolhidos; aba Vista 3D; curvas como camada da carta; estado no link; cálculos no worker | aprovar | mover o mapa ou o dimensionamento para o passo 7, ou trocar por um modo "avançado" de tela inteira, muda só a interface (núcleo e link não dependem da posição) |
| [0024](../decisoes/0024-padrao-da-classificacao-das-horas.md) Padrão: limiar de 20 °C | sombra acima de 20 °C (Lamberts, Dutra e Pereira, 2014), com a fonte; faixa adaptativa como alternativa | aprovar: é a única fonte brasileira citável para sombreamento pelo ar externo, e a faixa adaptativa sobre o ar externo subestima as horas quentes em todas as combinações medidas | volta a faixa adaptativa como padrão (uma constante e o `cm` em branco); a tela continua mostrando o viés e os kWh/m² |

## 7. Limitações da v0.8

- Os indicadores usam só a radiação direta; difusa e refletida ficam para o F5.1.
- A classificação das horas usa só a temperatura do ar externo: é um indicador aproximado da necessidade de sombra (ganhos internos, envoltória, massa térmica e ventilação não entram). As cargas horárias de um modelo do EnergyPlus ficam para o F5.5.
- Peças são placas finas (sem espessura) diante do vidro; entorno e obstruções ficam para o F5.4.
- O dimensionamento é para 100% de sombra no período; prolongamentos mínimos com a janela recuada estão em `docs/ideias.md`.
- O sol do ano (52 560 posições) leva de 0,8 a 1,0 s por local no contêiner de testes (Node 22), uma vez por local, no worker; num celular, mais. A aceleração está em `docs/ideias.md`.
- Cores das camadas da Fase 3 provisórias até a paleta segura para daltonismo da Fase 4.

## 8. Pendências do Anthony ligadas a este portão

1. Conferir no texto da ANSI/ASHRAE 55-2023 a equação e os limites do modelo adaptativo e a faixa de α da média predominante (conferidos só no pythermalcomfort; spec 08).
2. Revisar a memória de cálculo dos indicadores (`docs/validacao/relatorios/F3.5-memoria-de-calculo.md`), requisito do F3.5.
3. Medir com régua uma impressão do corte e da vista em escala (item 3.4) e, se ainda não fez, a da carta do passo 5 (portão 2).
4. Aprovar ou ajustar as decisões da seção 6.

## 9. Se houver ocasião de mostrar ao Prof. Lamberts

Roteiro de 10 min: (1) link do item 3.6, o tutorial da UFU dimensionado pelo período, com o sol que determina cada ângulo; (2) item 3.7, a vista 3D com a sombra; (3) item 3.1, o mesmo brise com o limiar de 20 °C do livro dele e com a faixa adaptativa, para mostrar por que a escolha da classificação pesa mais que o percentual.

## 10. Retorno a registrar no portão

- Aprovação ou ajuste de cada decisão da seção 6 (0018 a 0024).
- Revisão dos indicadores (F3.5) e do texto das hipóteses.
- Organização dos passos 6 e 7 e da aba Vista 3D.
- Medidas com régua (item 3.4).
- Integração: depois dos portões 2 e 3 aprovados, a Fase 3 entra na `main` num PR que marca F3.1 a F3.8 no ROADMAP, move "Não lançado" para a versão 0.8.0 no CHANGELOG e atualiza o "pronto quando" do F3.8.
