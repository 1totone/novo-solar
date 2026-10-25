# 8. Classificação das horas

**Status:** proposta (núcleo de cálculo do F3.4), 25/10/2026. Escrita antes do portão 2, numa branch separada, sem interface. As escolhas que dependem do Anthony estão na seção 8.8 e na decisão 0020 (proposta), cada uma com a recomendação adotada no código enquanto isso.

Cada hora do arquivo climático recebe uma classe: **quente** (a sombra é desejada), **fria** (o sol é desejado), **neutra** ou **sem classe**. A classificação é a entrada dos indicadores do F3.5 (radiação direta bloqueada nas horas quentes e admitida nas horas frias).

## 8.1 Hipótese central e seus limites

A classificação usa só a **temperatura do ar externo** (bulbo seco do arquivo). É um indicador aproximado da necessidade de sombra, e a interface deve dizer isso junto de qualquer resultado:

- A necessidade real de sombra depende dos ganhos internos, da envoltória, da massa térmica, da ventilação, da ocupação e do próprio sol que entra pela janela. Uma hora com o ar externo ameno pode ser quente dentro de um ambiente com ganhos altos; a classificação pela carga horária do ambiente fica para o F5.5 (EnergyPlus).
- Umidade, vento e radiação não entram na classe.
- A **faixa adaptativa da ASHRAE 55** (seção 8.4) foi estabelecida para a **temperatura operativa interna** de ambientes **naturalmente condicionados e controlados pelos ocupantes**: sem resfriamento nem aquecimento mecânico em operação, ocupantes com atividade de 1,0 a 1,5 met e livres para ajustar a roupa entre 0,5 e 1,0 clo, e temperatura média predominante externa entre 10 °C e 33,5 °C. Aqui ela é comparada com a temperatura do **ar externo**, o que supõe a temperatura operativa interna igual à do ar externo. Num ambiente ventilado naturalmente, durante o dia, a operativa interna costuma ficar acima da externa por causa dos ganhos solares e internos; por isso a classificação tende a **subestimar as horas quentes** (uma hora neutra pelo ar externo pode já ser quente dentro). É um uso aproximado da faixa, não a aplicação do método da norma.
- Os intervalos de temperatura operativa interna da **NBR 15575** servem para avaliar o desempenho térmico de habitações por simulação; não são limites para o ar externo e **não são usados** aqui.

## 8.2 Temperatura que representa a hora

A linha da hora h do arquivo descreve o intervalo (h − 1, h] (seção 2.2). A temperatura do arquivo é o valor no instante h, enquanto a radiação direta e a fração ensolarada (seção 7.6) se referem ao intervalo inteiro, com as amostras do sol simétricas em torno de h − 0,5. A classe da hora usa a temperatura

  T_h = (T(h − 1) + T(h)) / 2

que é, ao mesmo tempo, o valor em h − 0,5 e a média no intervalo da interpolação linear entre os dois valores do arquivo (a interpolação que o EnergyPlus aplica aos dados climáticos entre as horas do arquivo). A alternativa, a temperatura do fim da hora, T_h = T(h), fica como opção: ela atrasa a temperatura em meia hora em relação ao sol do intervalo, superestimando-a de manhã, quando a temperatura sobe, e subestimando-a no fim da tarde. O relatório do F3.4 mede quantas horas mudam de classe entre as duas escolhas.

- **Primeira linha do arquivo:** T(h − 1) é a última linha do arquivo (ano típico tratado como cíclico, como na seção 8.3).
- **Valor ausente** (código 99,9 °C, seção 4.1) em T(h − 1) ou T(h): a hora fica sem classe.

## 8.3 Temperatura média predominante externa

A faixa adaptativa depende da temperatura média predominante externa, t_pma, uma por dia, calculada do próprio arquivo:

- **Média diária:** média das 24 temperaturas das linhas do dia (horas 1 a 24, valores nos instantes de 01:00 a 24:00). Exige pelo menos 18 valores presentes; com menos, o dia fica sem média.
- **Média predominante do dia d:** média dos dias anteriores (d − 1, d − 2, ..., d − n), sem o próprio dia, de uma de duas formas, ambas dentro das que a ASHRAE 55 admite (de 7 a 30 dias anteriores):
  - **exponencial (padrão):** t_pma(d) = Σ αⁱ⁻¹ · t_e(d − i) / Σ αⁱ⁻¹, i de 1 a n, com α = 0,8 e n = 30. É a média móvel exponencial da norma, (1 − α) · [t_e(d − 1) + α · t_e(d − 2) + α² · t_e(d − 3) + ...], truncada em 30 dias e normalizada pela soma dos pesos (com α = 0,8, os dias além do 30º pesam 0,1%). A norma recomenda α entre 0,6 (resposta rápida, climas com grande variação de um dia para outro) e 0,9 (resposta lenta, como nos trópicos úmidos); α é editável de 0,6 a 0,9, e n de 7 a 30;
  - **aritmética:** média simples dos n dias anteriores, n de 7 a 30.
- **Dias sem média** (seção anterior) saem da soma, com os pesos renormalizados; se nenhum dos n dias tiver média, t_pma do dia fica indefinida.
- **Início do ano:** os dias anteriores a 1º de janeiro são os últimos dias do arquivo. O arquivo típico (TMY, TRY) é uma sequência de meses de anos diferentes, e o ano é tratado como cíclico; para um arquivo de um ano real, é uma aproximação nas primeiras semanas.
- Arquivos com 29 de fevereiro têm 366 dias; a sequência de dias segue o arquivo.

## 8.4 Métodos

Cada método dá, para cada hora, um limite inferior L e um superior U (L ≤ U).

| Método | L | U | Valores |
|---|---|---|---|
| **Faixa adaptativa da ASHRAE 55** (padrão) | T_conf − Δ | T_conf + Δ | T_conf = 0,31 · t_pma + 17,8 °C; Δ = 3,5 °C (80% de aceitabilidade, padrão) ou 2,5 °C (90%); só com 10 °C ≤ t_pma ≤ 33,5 °C |
| **Limiares fixos** | T_fria | T_quente | digitados, T_fria ≤ T_quente; qualquer um pode ficar em branco (sem horas frias ou sem horas quentes) |
| **Temperatura de equilíbrio** | T_eq | T_eq | digitada |

**Faixa adaptativa.** Equação e limites da ANSI/ASHRAE 55-2023 (edição vigente em outubro de 2026, pelo catálogo da ASHRAE; os adendos encontrados, *a* em revisão pública e *b*, tratam dos questionários de pesquisa do apêndice L, não do modelo adaptativo). O texto da norma não foi consultado diretamente na sessão (é vendido pela ASHRAE); a equação, os limites e a faixa de α foram conferidos na documentação e no código do pythermalcomfort 4.6.2, que cita a norma, e devem ser conferidos pelo Anthony no texto da norma. Fora da faixa de aplicação (t_pma abaixo de 10 °C ou acima de 33,5 °C), a hora fica **sem classe**: a norma não define a faixa ali, e estender a reta seria inventar um critério. O acréscimo do limite superior por velocidade do ar elevada (de 1,2 a 2,2 °C, com velocidade do ar interno de 0,6 a 1,2 m/s) não se aplica: a velocidade do ar interno não é conhecida. Os limites não são arredondados.

**Limiares fixos.** Sem valor padrão: os limiares dependem do uso e do critério de quem projeta. Na interface, o método padrão é a faixa adaptativa.

**Temperatura de equilíbrio.** É a temperatura externa abaixo da qual o ambiente precisa de calor e acima da qual os ganhos passam a ser excesso: com a temperatura interna desejada T_int, os ganhos internos e solares médios Q e o coeficiente global de perdas da envoltória e da ventilação UA, T_eq = T_int − Q / UA (conceito da temperatura de equilíbrio dos métodos de graus-dia; ASHRAE Handbook, Fundamentals). Depende do edifício e não há um valor por tipologia com fonte verificável que caiba aqui: o campo é digitado e não tem valor padrão. Uma tabela por tipologia só entra com fonte citável (decisão 0020).

## 8.5 Classe de cada hora

Com a temperatura T_h da seção 8.2 e os limites da hora:

| Condição | Classe |
|---|---|
| T_h > U | quente |
| T_h < L | fria |
| L ≤ T_h ≤ U | neutra |
| T_h ausente, ou limites indefinidos (t_pma fora da faixa ou indefinida) | sem classe |

Os limites são inclusivos para a classe neutra, como a aceitabilidade da ASHRAE 55. A temperatura do arquivo tem resolução de 0,1 °C (e T_h, de 0,05 °C), então empates com limiares digitados acontecem; pela regra, empate é neutro. Com a temperatura de equilíbrio, L = U e só o empate exato é neutro.

## 8.6 Saídas e hipóteses mostradas

Para cada linha do arquivo: a classe, T_h, L e U; para cada dia, t_pma (faixa adaptativa); a contagem de horas por classe. As horas são as do arquivo (8760, ou 8784 com 29 de fevereiro); o cruzamento com a fração ensolarada do ano de referência fica no F3.5.

Hipóteses que a interface deve mostrar junto da classificação (F3.4, *pronto quando*):

1. A classe vem só da temperatura do ar externo, um indicador aproximado da necessidade de sombra (seção 8.1).
2. Método e valores: limiares, ou T_eq, ou faixa adaptativa com a aceitabilidade, a forma da média predominante, α e n.
3. Na faixa adaptativa: a faixa vale para a temperatura operativa interna de ambientes naturalmente condicionados e é usada aqui com a temperatura externa; tende a subestimar as horas quentes. Número de horas sem classe por t_pma fora de 10 °C a 33,5 °C.
4. Temperatura da hora: média do início e do fim da hora (ou a do fim, se escolhida).

## 8.7 Implementação e validação

`src/core/comfort/classification.ts`: médias diárias, média predominante, temperatura da hora, limites e classes.

| Grandeza | Referência independente | Tolerância |
|---|---|---|
| Médias diárias, t_pma (exponencial e aritmética), T_h | numpy, em `docs/validacao/scripts/classificacao_horas.py`, nos 6 EPWs de teste | 10⁻⁹ °C |
| t_pma | `running_mean_outdoor_temperature` do pythermalcomfort 4.6.2, com os mesmos dias, do mais recente ao mais antigo (a função arredonda para 0,1 °C) | 0,05 °C |
| T_conf, L, U e faixa de aplicação | `adaptive_ashrae` do pythermalcomfort 4.6.2 (sem arredondamento, com verificação dos limites de entrada; o limite da temperatura operativa, de 10 °C a 40 °C, não entra porque a referência usa uma operativa fictícia de 25 °C só para obter os limites) | 10⁻⁹ °C; mesma aplicabilidade em todos os dias |
| Classes de todas as horas | classificação da referência com os limites do pythermalcomfort, em 4 configurações (adaptativa 80% com a média da hora; adaptativa 90%, aritmética de 7 dias, com o fim da hora; limiares fixos; temperatura de equilíbrio) | iguais em todas as horas; horas a menos de 10⁻⁹ °C de um limite seriam listadas à parte (nenhuma encontrada) |

## 8.8 Escolhas propostas (decisão 0020)

1. **Temperatura da hora:** média de T(h − 1) e T(h), com a do fim da hora como opção.
2. **Faixa adaptativa como método padrão**, com 80% de aceitabilidade; fora de 10 °C ≤ t_pma ≤ 33,5 °C, horas sem classe.
3. **Média predominante exponencial**, α = 0,8, 30 dias, normalizada; aritmética de 7 a 30 dias como opção; ano cíclico; média diária com pelo menos 18 horas.
4. **Limiares fixos e temperatura de equilíbrio sem valor padrão**; nenhuma tabela por tipologia sem fonte citável.
5. **Empates** com os limites são neutros.
6. **NBR 15575** não é usada para classificar a temperatura externa.

## Referências

- ANSI/ASHRAE. *Standard 55-2023: Thermal Environmental Conditions for Human Occupancy*. Atlanta: ASHRAE, 2023 (modelo adaptativo; texto não consultado diretamente, ver seção 8.4).
- de Dear, R.; Brager, G. S. Thermal comfort in naturally ventilated buildings: revisions to ASHRAE Standard 55. *Energy and Buildings*, 34(6), 549-561, 2002.
- Tartarini, F.; Schiavon, S. pythermalcomfort: a Python package for thermal comfort research. *SoftwareX*, 12, 100578, 2020 (versão 4.6.2, usada só na referência de teste).
- ASHRAE. *ASHRAE Handbook: Fundamentals*, capítulo de métodos de estimativa de energia (temperatura de equilíbrio e graus-dia).
- U.S. DOE. *EnergyPlus Engineering Reference* e *Auxiliary Programs* (formato EPW; interpolação dos dados climáticos entre as horas).
