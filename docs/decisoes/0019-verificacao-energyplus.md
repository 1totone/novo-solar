# 0019. Critérios da verificação contra o EnergyPlus (F3.8)

- Data: 2026-10-24
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 2 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)).

## Contexto

O ROADMAP propõe, para o F3.8, comparar a fração ensolarada hora a hora com a *Surface Outside Face Sunlit Fraction* do EnergyPlus, com o ShadowCalculation atualizado a cada passo de tempo, e aceitar RMSE ≤ 0,02. O arranjo (spec 07, seção 7.10; relatório `docs/validacao/relatorios/F3.8-energyplus.md`) rodou o EnergyPlus 26.2.0 em 8 cenas e 5 locais, com 6 passos por hora no ano inteiro, e mostrou duas fontes de diferença:

1. **Posição do sol.** O EnergyPlus calcula o sol com o `SUN3` (declinação e equação do tempo do dia por séries de Fourier ajustadas, constantes ao longo do dia) e o `SUN4`. Contra o NREL SPA da aplicação, a direção do sol difere 0,32° a 0,34° em média e até 0,59°; a declinação, até 0,67°; a equação do tempo, até 0,87 min. Com o sol de cada programa, o RMSE horário ficou entre 0,006 e 0,026 (três cenas acima de 0,02), com viés de no máximo 3 × 10⁻⁴. A mesma geometria da aplicação com os dois sóis dá o mesmo RMSE (diferença de até 0,0011): a diferença vem dos passos de 10 min que mudam de lado no nascer, no pôr, na passagem do sol pelo plano da fachada e nas bordas de sombra.
2. **Geometria.** Com o sol do EnergyPlus reproduzido no teste (idêntico às saídas de cosseno de incidência), a fração ensolarada difere da do EnergyPlus em até 3 × 10⁻⁵ no percentil 99, por passo e por hora. As exceções são limitações do EnergyPlus: a geometria em inteiros de 0,01 mm, que apaga frestas de sombra de menos de 0,06 mm, e os passos com o sol rasante à fachada (cos θ < 10⁻⁴), em que a sombra tem quilômetros e o recorte estoura inteiros de 64 bits.

O limite de 0,02 com o sol de cada programa mede, portanto, a diferença entre os modelos de sol, e não o cálculo da sombra, que é o objeto do F3.8.

## Decisão

O F3.8 passa a ter dois critérios, um para cada fonte de diferença (tabela na spec 07, seção 7.10):

1. **Geometria, com o mesmo sol.** O sol do EnergyPlus (`SUN3` e `SUN4`, fim de cada passo) é reproduzido no teste e conferido contra os cossenos de saída (10⁻¹²). Por passo de tempo, com cos θ ≥ 10⁻³: diferença ≤ 5 × 10⁻⁴ e percentil 99 ≤ 5 × 10⁻⁵; com cos θ < 10⁻³: diferença × cos θ ≤ 5 × 10⁻⁴. Hora a hora no ano, fora das horas com passo rasante: ≤ 10⁻⁴. Nenhum passo com fração positiva no EnergyPlus e sol fora da janela no cálculo daqui.
2. **Ponta a ponta, cada programa com o seu sol.** Sobre as horas com sol na janela em pelo menos um dos dois cálculos: RMSE ≤ 0,03, viés ≤ 0,002 em módulo e RMSE explicado pela posição do sol (a mesma geometria com os dois sóis dá o mesmo RMSE, com diferença ≤ 0,002).

A aplicação continua com o SPA (spec 02), conferido contra o pvlib e contra as datas do U.S. Naval Observatory. O sol do EnergyPlus não é adotado.

## Conferência do sol do EnergyPlus na pré-revisão (27/10/2026)

Na pré-revisão, o sol do EnergyPlus foi reproduzido de novo, sem o script do F3.8, direto do código-fonte atual do repositório do NREL (`SUN3` e `SUN4`, `SolarShading.cc`; não necessariamente idêntico ao da versão 26.2.0 usada no F3.8), e comparado com o SPA do pvlib 0.16.1 no fim de cada passo de 10 min de 2026, em Florianópolis, Brasília, Porto Alegre e Manaus. Diferença na direção do sol: média de 0,32° a 0,33° e máxima de 0,56° a 0,58°, conforme o local. É a mesma ordem de grandeza do contexto acima (média de 0,32° a 0,34° e máxima de 0,59°, nos 5 locais do F3.8), o que sustenta a separação entre geometria, com o mesmo sol, e ponta a ponta, cada programa com o seu. Essa conferência está registrada só no comentário da pré-revisão; a evidência versionada continua sendo o teste do F3.8, que reproduz o sol do EnergyPlus e o confere contra os cossenos de saída (10⁻¹²).

## Alternativas consideradas

- **Manter RMSE ≤ 0,02 com o sol de cada programa:** três das oito cenas não passam, sem erro de geometria; o critério reprovaria a aplicação pela aproximação do sol do EnergyPlus.
- **Comparar só com o sol do EnergyPlus:** verifica a geometria, mas não mostra o efeito prático de usar o SPA, que é o que um usuário vê ao comparar os dois programas; o critério ponta a ponta fica, com o limite medido.
- **Adotar o sol do EnergyPlus na aplicação:** pioraria a carta e a sobreposição de dados (até 0,67° de erro na declinação) só para reproduzir uma aproximação.
- **RMSE ponderado pelo cos θ:** reduz o peso do sol rasante, mas não o do nascer numa fachada leste ou do pôr numa oeste, com cos θ perto de 1; separar geometria e sol é mais claro.

## Consequências

- Spec 07, seção 7.10: arranjo, sol do EnergyPlus, limitações encontradas e critérios. O "Pronto quando" do F3.8 no ROADMAP muda na integração da Fase 3.
- O EnergyPlus não roda no CI: `docs/validacao/scripts/energyplus_fracao_ensolarada.py` gera os modelos e a referência, que ficam versionados, e `tests/referencia/energyplus.test.ts` roda sempre. Para repetir as simulações, basta o pacote Linux do EnergyPlus 26.2.0 e os EPWs de teste (`baixar_epw.py`).
- Ficam documentadas duas limitações do EnergyPlus úteis para quem compara resultados: a sombra errada com o sol rasante e a geometria em inteiros de 0,01 mm.
- Na exportação para o EnergyPlus (F5.2), a mesma diferença de sol aparece em qualquer comparação hora a hora; o relatório do F3.8 dá a ordem de grandeza.
