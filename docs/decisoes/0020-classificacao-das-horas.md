# 0020. Classificação das horas pela temperatura externa (F3.4)

- Data: 2026-10-25
- Status: proposta (núcleo do F3.4 adiantado antes do portão 2, na branch da Fase 3; a confirmar com o Anthony na integração da Fase 3)

## Contexto

O F3.4 classifica as horas do arquivo climático em quentes (sombra desejada), frias (sol desejado) e neutras, para os indicadores do F3.5. O ROADMAP pede limiares editáveis, a faixa adaptativa da ASHRAE 55 como referência, a temperatura de equilíbrio por tipologia e o aviso de que a temperatura externa é um indicador aproximado. O Anthony pediu ainda: conferir a edição vigente da ASHRAE 55; calcular a temperatura média predominante do próprio EPW e conferi-la contra uma implementação aberta só nos scripts de validação; só usar temperatura de equilíbrio por tipologia com fonte citável; deixar explícito que a faixa adaptativa vale para a temperatura operativa interna; não usar a NBR 15575 para a temperatura externa; e decidir qual temperatura representa o intervalo (h − 1, h] da fração ensolarada. Modelo e algoritmos na spec 08.

## Decisão (proposta)

1. **Temperatura da hora:** T_h = (T(h − 1) + T(h)) / 2, o valor em h − 0,5 e a média da interpolação linear no intervalo, coerente com a radiação e com as amostras do sol simétricas em torno de h − 0,5 (spec 07, seção 7.6). A temperatura do fim da hora fica como opção. Nos 6 EPWs de teste, de 151 a 612 horas por ano (1,7% a 7%) mudam de classe entre as duas; com a média, as horas quentes diminuem de 0% (Concepción) a 8,5% (Belém), porque a média de dois valores consecutivos atenua o pico da tarde; as horas frias mudam nos dois sentidos (de −16% em Manaus, 108 contra 129, a +0,6% em Florianópolis).
2. **Faixa adaptativa da ASHRAE 55-2023 como método padrão:** T_conf = 0,31 · t_pma + 17,8 °C, ±3,5 °C (80%, padrão) ou ±2,5 °C (90%), comparada com T_h. Fora de 10 °C ≤ t_pma ≤ 33,5 °C, a hora fica sem classe (Concepción: 50 dias por ano; Porto Alegre, com α = 0,6 e 7 dias: 2 dias). Sem o acréscimo por velocidade do ar.
3. **Média predominante** do próprio EPW: média diária das 24 linhas (pelo menos 18 presentes); média exponencial normalizada dos 30 dias anteriores, α = 0,8, editável de 0,6 a 0,9 e de 7 a 30 dias; aritmética de 7 a 30 dias como opção; ano cíclico.
4. **Limiares fixos e temperatura de equilíbrio** digitados, **sem valor padrão**. Nenhuma tabela de temperatura de equilíbrio por tipologia: não há fonte citável verificada; a spec dá a definição (T_eq = T_int − Q / UA) para quem quiser calcular a sua.
5. **Empate** com um limite é neutro (limites inclusivos, como a aceitabilidade da ASHRAE 55).
6. **NBR 15575** não é usada para classificar a temperatura externa.
7. A interface mostra as hipóteses da spec 08, seção 8.6, junto de qualquer resultado.

## Alternativas consideradas

- Temperatura do fim da hora como padrão: é o valor do arquivo sem conta, mas atrasa meia hora em relação à radiação do intervalo.
- Classificar cada amostra de 10 min com a temperatura interpolada: mais fiel quando a temperatura cruza um limite dentro da hora, mas a classe deixa de ser da hora e o ganho é pequeno diante da aproximação da própria hipótese.
- Estender a reta da faixa adaptativa fora de 10 °C a 33,5 °C ou fixar a faixa nos extremos: a norma não define a faixa ali.
- α = 0,9, que a norma sugere para climas com pouca variação de um dia para outro (trópicos úmidos): α = 0,8 fica no meio da faixa recomendada e é o valor da EN 16798-1; a escolha é editável. Em Florianópolis e Porto Alegre, trocar α = 0,8 e 30 dias por α = 0,6 e 7 dias muda as horas quentes em 3,5% e 2,5%; α = 0,9 não foi testado.
- Valores de temperatura de equilíbrio por tipologia de memória ou de fontes não conferidas: violariam o princípio "correto e verificável".

## Consequências

- Nova spec 08 (proposta) e núcleo em `src/core/comfort/classification.ts`, conferidos contra numpy e o pythermalcomfort 4.6.2 nos 6 EPWs de teste (relatório `docs/validacao/relatorios/F3.4-classificacao.md`).
- A equação e os limites da ASHRAE 55 foram conferidos na documentação e no código do pythermalcomfort, não no texto da norma: o Anthony confere no texto.
- Uma tabela de temperatura de equilíbrio por tipologia pode entrar depois, com fonte, sem mudar o núcleo (é um valor de T_eq).
- O F3.5 usa as classes; a interface e as hipóteses na tela ficam para depois do portão 2.

## Revisão crítica (25/10/2026)

O Anthony pediu, com olhar crítico, para medir o viés da faixa adaptativa sobre o ar externo, que ignora os ganhos internos e solares, e para procurar fonte citável de temperatura de equilíbrio por tipologia.

**Temperatura de equilíbrio por tipologia: sem fonte.** A busca (ASHRAE Handbook Fundamentals, graus-dia, CIBSE TM41, Olgyay, trabalhos do LabEEE) não achou fonte que dê valor por tipologia para resfriamento ou sombreamento aplicável ao Brasil; o item 4 fica como está (campo digitado, sem padrão). O que mais se aproxima, lido no texto completo: o critério de sombreamento de 20 °C de Lamberts, Dutra e Pereira (2014, p. 91 e Tabela 4-4 da p. 135), para ambiente sem carga térmica interna, com o limite "abaixo de 20 °C" quando há carga interna, sem número; e a diferença entre a temperatura interna e a média móvel da externa medida em casas ocupadas e ventiladas naturalmente (Papst de Abreu, 2004): de 0 a 2,7 °C em Florianópolis e de 0,2 a 4,0 °C em Curitiba. Nenhum dos dois é temperatura de equilíbrio por tipologia (spec 08, seção 8.4).

**Viés medido** (relatório do F3.4, seção 4; teste `tests/referencia/classificacaoVies.test.ts`). Percentuais das horas com sol na janela e, entre parênteses, da radiação direta incidente sem proteção:

| Cidade, fachada | Padrão | ΔT = 2 °C | ΔT = 4 °C | Limiar de 20 °C |
|---|---|---|---|---|
| Florianópolis, Norte: quentes / frias | 6% (6%) / 37% (32%) | 18% (18%) / 20% (19%) | 34% (38%) / 8% (8%) | 67% (68%) / 31% (30%) |
| Florianópolis, Leste | 2% (1%) / 46% (41%) | 9% (8%) / 24% (20%) | 21% (24%) / 11% (9%) | 61% (67%) / 35% (31%) |
| Brasília, Norte | 14% (12%) / 29% (23%) | 31% (31%) / 17% (13%) | 50% (53%) / 10% (6%) | 77% (80%) / 22% (18%) |
| Brasília, Leste | 2% (0%) / 51% (52%) | 9% (4%) / 26% (27%) | 21% (16%) / 13% (12%) | 63% (63%) / 32% (35%) |
| Porto Alegre, Norte | 12% (12%) / 42% (44%) | 23% (22%) / 29% (32%) | 35% (35%) / 19% (22%) | 59% (55%) / 40% (44%) |
| Porto Alegre, Oeste | 22% (34%) / 22% (13%) | 37% (51%) / 13% (8%) | 54% (68%) / 8% (5%) | 77% (86%) / 22% (13%) |

O viés existe e é grande: com o padrão, as horas de sol frias das fachadas Leste chegam à metade (o ar da manhã fica abaixo do limite inferior da faixa), e a radiação em horas quentes fica entre 0% e 21% nas fachadas Norte, Leste e Sul das três cidades. Um acréscimo de 2 °C, perto da mediana medida em casas ocupadas, dobra ou triplica a parte quente. Os dois indicadores do F3.5 mudam menos que as classes (são razões dentro de cada classe), o que esconde o viés se a tela mostrar só os percentuais.

**Consequências da revisão:**

- O núcleo ganha o **acréscimo por ganhos ΔT** na faixa adaptativa (padrão 0; spec 08, seção 8.4), para estimar a operativa interna como T_h + ΔT.
- A interface mostra as classes **só nas horas com sol na janela**, contadas e ponderadas pela radiação, e a radiação de cada classe em kWh/m² junto dos dois indicadores.
- O critério de 20 °C de Lamberts, Dutra e Pereira (2014) entra como sugestão com fonte no método de limiares.
- A troca do padrão para o limiar de 20 °C fica proposta na **decisão 0024**, para o Anthony decidir; até lá o padrão continua a faixa adaptativa, com o aviso de viés na tela.

