# 8. Classificação das horas

**Status:** proposta (núcleo de cálculo do F3.4), 25/10/2026; padrão trocado para o limiar de 20 °C em 26/10/2026 (decisão 0024, aceita por delegação na pré-revisão do Claude de 27/10/2026; validação por colegas pendente). Escrita antes do portão 2, numa branch separada, sem interface. As escolhas que dependem do Anthony estão na seção 8.8 e nas decisões 0020 e 0024, cada uma com a recomendação adotada no código enquanto isso.

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
| **Faixa adaptativa da ASHRAE 55** (padrão) | T_conf − Δ − ΔT | T_conf + Δ − ΔT | T_conf = 0,31 · t_pma + 17,8 °C; Δ = 3,5 °C (80% de aceitabilidade, padrão) ou 2,5 °C (90%); só com 10 °C ≤ t_pma ≤ 33,5 °C; acréscimo por ganhos ΔT digitado, padrão 0 |
| **Limiares fixos** | T_fria | T_quente | digitados, T_fria ≤ T_quente; qualquer um pode ficar em branco (sem horas frias ou sem horas quentes) |
| **Temperatura de equilíbrio** | T_eq | T_eq | digitada |

**Faixa adaptativa.** Equação e limites da ANSI/ASHRAE 55-2023 (edição vigente em outubro de 2026, pelo catálogo da ASHRAE; os adendos encontrados, *a* em revisão pública e *b*, tratam dos questionários de pesquisa do apêndice L, não do modelo adaptativo). O texto da norma não foi consultado diretamente na sessão (é vendido pela ASHRAE); a equação, os limites e a faixa de α foram conferidos na documentação e no código do pythermalcomfort 4.6.2, que cita a norma, e devem ser conferidos pelo Anthony no texto da norma. Fora da faixa de aplicação (t_pma abaixo de 10 °C ou acima de 33,5 °C), a hora fica **sem classe**: a norma não define a faixa ali, e estender a reta seria inventar um critério. O acréscimo do limite superior por velocidade do ar elevada (de 1,2 a 2,2 °C, com velocidade do ar interno de 0,6 a 1,2 m/s) não se aplica: a velocidade do ar interno não é conhecida. Os limites não são arredondados.

**Acréscimo por ganhos (ΔT).** A faixa vale para a temperatura operativa interna. Com ΔT, a operativa interna é estimada como T_h + ΔT e comparada com a faixa; para o ar externo, os limites descem ΔT. A t_pma continua calculada com o ar externo, como manda o modelo. ΔT representa os ganhos internos e solares sobre o coeficiente de perdas do ambiente (Q / UA); depende do edifício e é digitado, com padrão 0 (o ar externo). Ordem de grandeza com fonte: em casas ocupadas e ventiladas naturalmente, Papst de Abreu (2004) mediu a temperatura interna horária de 0 a 2,7 °C acima da média móvel da temperatura externa das horas anteriores em Florianópolis e de 0,2 a 4,0 °C em Curitiba (regressões sem radiação das Tabelas 8 e 22, para médias externas de 15 °C a 28 °C); é a diferença para uma média de horas anteriores, não para a temperatura da própria hora. O relatório do F3.4 (seção 4) mede o efeito de ΔT = 2 °C e 4 °C nas classes.

**Limiares fixos.** Sem valor padrão: os limiares dependem do uso e do critério de quem projeta. Na interface, o método padrão é a faixa adaptativa. Critério com fonte que a interface oferece como sugestão: **sombrear acima de 20 °C** (T_fria = T_quente = 20 °C), de Lamberts, Dutra e Pereira (2014): "esta estratégia deve ser utilizada sempre que a temperatura do ar for superior a 20 °C, mesmo quando a carta bioclimática indicar conforto térmico" (p. 91, seção 3.5.7), critério do Analysis-BIO para um ambiente sem carga térmica interna; com carga interna, o limite fica abaixo de 20 °C, sem valor numérico (Tabela 4-4, p. 135). É um limite de conforto das pessoas à sombra, da carta bioclimática, e não um balanço do edifício. Aqui ele é aplicado com a temperatura da hora (seção 8.2) e o empate neutro (seção 8.5).

**Temperatura de equilíbrio.** É a temperatura externa abaixo da qual o ambiente precisa de calor e acima da qual os ganhos passam a ser excesso: com a temperatura interna desejada T_int, os ganhos internos e solares médios Q e o coeficiente global de perdas da envoltória e da ventilação UA, T_eq = T_int − Q / UA (conceito da temperatura de equilíbrio dos métodos de graus-dia; ASHRAE Handbook, Fundamentals). Depende do edifício e não há um valor por tipologia com fonte verificável que caiba aqui: o campo é digitado e não tem valor padrão. Uma tabela por tipologia só entra com fonte citável (decisão 0020). A busca de 25/10/2026 não achou essa fonte: as bases de graus-dia e graus-hora publicadas são convenções climáticas (18,3 °C e 10 °C da ASHRAE; 14 a 18 °C e 24 a 32 °C nas tabelas de Goulart, Lamberts e Firmino, 1998, por cidade), de aquecimento ou da temperatura interna (26 °C e 18 °C da operativa), e a própria ASHRAE observa que o valor de 18,3 °C "em geral não é respeitado" porque a temperatura de equilíbrio varia muito de um edifício para outro (citada por Freire, 2001). O ASHRAE Handbook e o CIBSE TM41 não foram lidos no texto completo (domínios bloqueados na sessão).

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
5. A parte de cada classe nas **horas com sol na janela**, contada e ponderada pela radiação direta incidente sem proteção, e não sobre as 8760 horas: as noites não pesam no sombreamento (revisão da decisão 0020).
6. Com a faixa adaptativa, o acréscimo por ganhos (ΔT) e a lembrança de que, com ΔT = 0, a classe é a do ar externo.

## 8.7 Implementação e validação

`src/core/comfort/classification.ts`: médias diárias, média predominante, temperatura da hora, limites e classes.

| Grandeza | Referência independente | Tolerância |
|---|---|---|
| Médias diárias, t_pma (exponencial e aritmética), T_h | numpy, em `docs/validacao/scripts/classificacao_horas.py`, nos 6 EPWs de teste | 10⁻⁹ °C |
| t_pma | `running_mean_outdoor_temperature` do pythermalcomfort 4.6.2, com os mesmos dias, do mais recente ao mais antigo (a função arredonda para 0,1 °C) | 0,05 °C |
| T_conf, L, U e faixa de aplicação | `adaptive_ashrae` do pythermalcomfort 4.6.2 (sem arredondamento, com verificação dos limites de entrada; o limite da temperatura operativa, de 10 °C a 40 °C, não entra porque a referência usa uma operativa fictícia de 25 °C só para obter os limites) | 10⁻⁹ °C; mesma aplicabilidade em todos os dias |
| Classes de todas as horas | classificação da referência com os limites do pythermalcomfort, em 4 configurações (adaptativa 80% com a média da hora; adaptativa 90%, aritmética de 7 dias, com o fim da hora; limiares fixos; temperatura de equilíbrio) | iguais em todas as horas; horas a menos de 10⁻⁹ °C de um limite seriam listadas à parte (nenhuma encontrada) |

## 8.8 Escolhas propostas (decisões 0020 e 0024)

1. **Temperatura da hora:** média de T(h − 1) e T(h), com a do fim da hora como opção.
2. **Limiar de 20 °C como método padrão** (decisão 0024, aceita por delegação na pré-revisão do Claude de 27/10/2026, no lugar do item 2 da decisão 0020): T_fria = T_quente = 20 °C, empate neutro, com a fonte na tela (Lamberts, Dutra e Pereira, 2014). A **faixa adaptativa** continua como alternativa, com 80% de aceitabilidade por padrão; fora de 10 °C ≤ t_pma ≤ 33,5 °C, horas sem classe.
3. **Média predominante exponencial**, α = 0,8, 30 dias, normalizada; aritmética de 7 a 30 dias como opção; ano cíclico; média diária com pelo menos 18 horas.
4. **Temperatura de equilíbrio sem valor padrão**; nenhuma tabela por tipologia sem fonte citável. Os limiares fixos têm o padrão de 20 °C do item 2.
5. **Empates** com os limites são neutros.
6. **NBR 15575** não é usada para classificar a temperatura externa.
7. **Acréscimo por ganhos ΔT** na faixa adaptativa, digitado, padrão 0 (acrescentado na revisão de 25/10/2026).
8. **Percentuais das classes sobre as horas com sol na janela**, contados e ponderados pela radiação.
9. **Limiar de 20 °C** (Lamberts, Dutra e Pereira, 2014): o padrão (item 2); com carga térmica interna, o livro manda usar um limite menor, sem número, e o usuário digita o seu.

## 8.9 Interface (F3.4)

O passo 7, "Efeito no ano" (decisão 0023, proposta), recolhido depois do passo 6, classifica as horas do arquivo aberto no passo 1 (arquivo carregado ou dados históricos da cidade); sem dados horários, ele pede os dados. A seção "Horas quentes e frias" tem:

- **Método**, em botões de opção: faixa adaptativa da ASHRAE 55 (seção 8.4, com a aceitabilidade de 80% ou 90% e o acréscimo por ganhos ΔT, com a ordem de grandeza de Papst de Abreu, 2004, na tela); limiares de temperatura (padrão, com 20 °C nos dois campos e a fonte, Lamberts, Dutra e Pereira, 2014; fria abaixo de, quente acima de; depois de editar, um pode ficar em branco), com o botão "Voltar a 20 °C"; e temperatura de equilíbrio, sem valor padrão. Em "Mais opções": a forma da média predominante (exponencial com α de 0,6 a 0,9, ou aritmética), os dias (7 a 30) e a temperatura da hora (média do início e do fim, padrão, ou o fim da hora). Campos fora da faixa ficam marcados e a classificação espera. ΔT é aceito de −10 a 10 °C.
- **Hipóteses** sempre visíveis, montadas a partir das escolhas (seção 8.6): a classe vem só do ar externo; o método e os valores (na faixa adaptativa, a equação, a aceitabilidade, a média predominante e o aviso de que a faixa é da operativa interna e tende a subestimar as horas quentes; o ΔT ou a falta dele); as horas sem classe; a temperatura da hora; e a base das partes de cada classe.
- **Partes de cada classe nas horas com sol na janela** da fachada do passo 2, sem a proteção (exposição da hora maior que 0; seção 7.6), contadas e ponderadas pela radiação direta incidente sem proteção, E₀ = DNI · C (seção 9.1): duas barras de 100% (radiação e horas) com o percentual escrito sob cada parte e uma tabela com as horas, os kWh/m² e os percentuais de cada classe (frias, neutras, quentes e sem classe). Linhas com sol na janela e sem DNI contam nas horas e ficam fora da radiação, com aviso. Sem janela no passo 6, usa-se uma janela de 1 × 1 m sem peças (a exposição e a incidência sem proteção não dependem da janela).
- **Estado no link:** `cm` (método: em branco, o padrão de 20 °C; `a` faixa adaptativa; `l` limiares digitados; `e` equilíbrio), `ca` (`90`), `cr` (`m`, aritmética), `cal` (α), `cn` (dias), `cg` (ΔT), `tf` e `tq` (limiares), `te` (equilíbrio) e `ct` (`f`, fim da hora), com o texto digitado. Editar um limiar a partir do padrão grava `cm=l` e os dois limiares, para que um campo apagado depois signifique "sem limite". Até a decisão 0024, sem `cm` valia a faixa adaptativa: um link sem `cm` e com uma chave só dela (`ca`, `cr`, `cal`, `cn` ou `cg`) continua abrindo a faixa. O passo abre sozinho quando o link traz uma dessas chaves.
- **Cálculo:** a classificação (8760 horas) roda na linha principal; a fração ensolarada do ano vem do mesmo worker do mapa mês × hora (seção 7.13), com o local do arquivo.

Conferência de ponta a ponta (`e2e/classificacao.spec.ts`), com EPWs sintéticos: com 22 °C constantes, t_pma = 22 °C e a faixa de 80% vai de 21,12 a 28,12 °C (todas as horas neutras); com ΔT = 8 °C, os limites descem para 13,12 e 20,12 °C (todas quentes); sem nada no link, o método é o limiar de 20 °C, com a fonte; com 15 °C de manhã e 25 °C à tarde e o limiar de 20 °C, a hora das 12 às 13 h vale 20 °C pela média da hora (empate, neutra) e 25 °C pelo fim da hora (quente); as cores lidas no meio de cada parte da barra correspondem às partes da tabela; a temperatura de equilíbrio só classifica com o valor digitado; teclado e axe sem violações. A função que conta as classes nas horas com sol na janela tem casos à mão em `src/core/shading/indicators.test.ts`.

## Referências

- ANSI/ASHRAE. *Standard 55-2023: Thermal Environmental Conditions for Human Occupancy*. Atlanta: ASHRAE, 2023 (modelo adaptativo; texto não consultado diretamente, ver seção 8.4).
- de Dear, R.; Brager, G. S. Thermal comfort in naturally ventilated buildings: revisions to ASHRAE Standard 55. *Energy and Buildings*, 34(6), 549-561, 2002.
- Tartarini, F.; Schiavon, S. pythermalcomfort: a Python package for thermal comfort research. *SoftwareX*, 12, 100578, 2020 (versão 4.6.2, usada só na referência de teste).
- ASHRAE. *ASHRAE Handbook: Fundamentals*, capítulo de métodos de estimativa de energia (temperatura de equilíbrio e graus-dia).
- U.S. DOE. *EnergyPlus Engineering Reference* e *Auxiliary Programs* (formato EPW; interpolação dos dados climáticos entre as horas).
- Lamberts, R.; Dutra, L.; Pereira, F. O. R. *Eficiência energética na arquitetura*. 3. ed. Rio de Janeiro: Eletrobras/Procel, 2014 (p. 91, seção 3.5.7, zona de sombreamento; p. 135, Tabela 4-4). Disponível em https://labeee.ufsc.br/sites/default/files/apostilas/eficiencia_energetica_na_arquitetura.pdf.
- Papst de Abreu, A. L. *Método estimativo da temperatura interna de edificações residenciais em uso*. Tese (Doutorado em Engenharia Civil), PPGEC/UFSC, Florianópolis, 2004 (Tabelas 8 e 22).
- Goulart, S.; Lamberts, R.; Firmino, S. *Dados climáticos para projeto e avaliação energética de edificações para 14 cidades brasileiras*. Florianópolis: PROCEL/NPC-UFSC, 1998.
- Freire, I. F. *Medição e verificação em eficiência energética: metodologia para determinação do baseline*. Dissertação (Mestrado), PPGEC/UFSC, 2001 (seção 2.5, temperatura do ponto de balanço).
