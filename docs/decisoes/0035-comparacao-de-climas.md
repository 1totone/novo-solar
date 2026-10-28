# 0035. Comparação de climas: diferença B − A na mesma carta, com o tempo da radiação de cada arquivo (F4.2)

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 18 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)). O item 20 da issue (tempo da radiação dos arquivos, aviso sem correção) também está aceito; observação sobre o EnergyPlus abaixo.

## Contexto

O ROADMAP pede, no F4.2, o TRY histórico, o arquivo recente e os arquivos futuros (LabEEE/INPE) na mesma carta. A comparação lado a lado (passo 5) já mostra duas cartas, mas não a diferença; e duas cartas coloridas com as mesmas faixas escondem diferenças menores que uma faixa.

O que há de cada fonte: as TRY do SOL-AR 6.2 vêm com a aplicação (decisão 0017); os TMYx 2011-2025 e os BrazFuture (LabEEE e INPE) o usuário baixa e carrega (decisão 0034). Os INMET ficam de fora até a resposta do LabEEE.

Ao calibrar as faixas com os arquivos reais, três fatos pesaram (relatório do F4.2):

- **A radiação dos arquivos não está no mesmo tempo.** TRY de Florianópolis: −1 min em relação ao sol; TMYx: +31 min; BrazFuture (cópias do OneBuilding): de −25 a −46 min nas rodadas com o modelo regional REMO e +106 a +116 min nas com o RegCM. Numa diferença, isso põe a radiação de manhã negativa e a da tarde positiva (ou o contrário) sem nenhuma mudança do clima: na diferença da global TMYx menos TRY de Florianópolis, −79 Wh/m² na hora 8 do arquivo e +65 na hora 14, na média das quinzenas.
- **A separação entre direta e difusa muda com a fonte:** a DNI do TMYx é, na mediana das células, 92 a 136 Wh/m² maior que a das TRY (radiação estimada por modelo), e a do BrazFuture de Florianópolis (MPI-ESM com REMO, 2050), 194 Wh/m² menor que a do TMYx.
- **Cada célula tem cerca de 15 horas de cada arquivo**, e cada arquivo é um ano típico com meses de anos diferentes: a diferença de uma célula isolada tem ruído da ordem de 1 °C.

## Decisão

1. **Botão "Diferença B − A na mesma carta"** na comparação (aba da carta), no link como `dif=1`. A carta de B passa a mostrar, em cada célula, a média das horas de B menos a de A, na mesma quinzena e hora do arquivo (spec 05, seção 5.5). A carta, a máscara, o transferidor e as curvas são os de B.
2. **Só no mesmo local** (até 0,1° de latitude e de longitude e o mesmo fuso), com dados nos dois lados e uma variável escolhida no passo 4; fora disso, A e B ficam lado a lado e a tela diz o motivo.
3. **Sempre a diferença das médias**, mesmo com o modo de frequência no passo 4. Faixas fixas e simétricas em torno de zero, propostas sem fonte: temperatura ±0,5 e ±2 °C; umidade ±3 e ±10%; global e direta ±25 e ±100 Wh/m²; difusa ±15 e ±50 Wh/m². Cores: a escala divergente da temperatura, já conferida para daltonismo (decisão 0030).
4. **Transparência:** a origem de A e de B acima da carta; uma nota com o que a diferença mistura (mudança do clima e diferenças entre os arquivos) e o ruído de uma célula; a média, o mínimo e o máximo das células desenhadas; na célula sob o cursor, B − A e as duas médias; a tabela das células; o CSV com as colunas `media_a`, `media_b` e `diferenca_b_menos_a`; e a impressão com as duas origens.
5. **Tempo da radiação calculado na aplicação** para qualquer arquivo (spec 04, seção 4.3: centróide diário da global contra a passagem meridiana do SPA, nos 30 dias mais claros), conferido contra o script do catálogo (pvlib) e contra o F2.7. Na diferença da radiação, a tela diz a diferença de tempo entre os arquivos e o sentido do efeito, a partir de 15 min (o limite do F4.1). O passo 1 passa a avisar o tempo da radiação de qualquer arquivo carregado fora do catálogo, como já fazia para os TMYx.
6. **Nada é corrigido:** a aplicação usa cada arquivo como está, como nas decisões 0017 e 0034.
7. **Recomendação na ajuda:** para isolar a mudança projetada, comparar arquivos do mesmo conjunto e do mesmo modelo (por exemplo, BrazFuture 2010 e 2050 da mesma rodada, que têm o mesmo tempo da radiação).

## Efeito do tempo da radiação nas simulações do EnergyPlus (pré-revisão de 27/10/2026)

A pré-revisão aceita o aviso sem correção (item 20 da issue #65) e acrescenta que o deslocamento não é só um problema desta aplicação. O EnergyPlus lê a radiação do EPW pela mesma convenção (valor integrado na hora que termina no registro) e a combina com a posição do sol que ele calcula para essa hora. Se o atraso de cerca de 30 min dos TMYx 2011-2025 se confirmar, a radiação do registro h, que pela convenção cobre a hora [h − 1, h] (centro em h − 0,5), cobre na prática cerca de [h − 0,5, h + 0,5] (centro em h), e o EnergyPlus continua a combiná-la com o sol de [h − 1, h], meia hora antes. Uma simulação no EnergyPlus com esses arquivos herda o erro.

O efeito pesa mais nas fachadas leste e oeste, em que a radiação direta incidente depende da hora do dia e não se compensa entre manhã e tarde. Pelo raciocínio geométrico, sem quantificação neste projeto: de manhã, a direta medida mais tarde (maior) cai num sol mais baixo e mais de frente para a fachada leste, que tende a receber radiação a mais; à tarde, a direta medida mais tarde (menor) cai num sol mais alto e menos de frente para a fachada oeste, que tende a receber a menos. Numa fachada voltada para o meio-dia solar, os dois erros tendem a se compensar no dia. Perto do nascer e do pôr do sol, parte da radiação cai em horas em que o sol calculado ainda está, ou já não está, acima do horizonte.

Por isso vale enviar o e-mail ao Climate.OneBuilding.org (`docs/dados/rascunhos-de-email.md`), que já leva o achado. Medir o efeito numa simulação do EnergyPlus (por exemplo, a radiação incidente anual numa fachada leste e numa oeste com o arquivo original e com a radiação deslocada em 30 min) fica como ideia, sem mudar esta decisão.

## Alternativas consideradas

- **Diferença entre locais diferentes:** misturaria o clima com a posição das células na carta; recusada.
- **Diferença relativa (%) na radiação:** sem sentido perto do nascer e do pôr do sol, quando a média de A tende a zero.
- **Faixas da diferença pelo próprio arquivo (percentis simétricos):** mudariam de um estudo para outro e não se comparam; ficam fixas, e os valores exatos estão na célula, na tabela e no CSV.
- **Teste de significância por célula:** os anos típicos não são amostras aleatórias (os meses são escolhidos pelo método de Finkelstein-Schafer), então o teste não se aplica bem; no lugar, a nota sobre o ruído e o resumo das células.
- **Corrigir o tempo da radiação antes da diferença:** mudaria os arquivos e depende de saber a causa de cada deslocamento; fica como ideia (`docs/ideias.md`), com decisão de física do Anthony.
- **Mostrar o tempo absoluto de cada arquivo na diferença:** carrega o viés das nuvens dos dias claros (até cerca de 10 min, relatório do F4.1, seção 4.1); a diferença entre dois arquivos do mesmo lugar o cancela em boa parte, e é ela que explica o padrão da carta.

## Consequências

- `src/core/overlay/difference.ts` e `src/core/epw/radiationTiming.ts` (núcleo), com os testes de referência `tests/referencia/diferencaClimas.test.ts` e `tests/referencia/tempoRadiacao.test.ts`; a interface em `App.tsx`, `ChartView.tsx`, `SitePanel.tsx` e nas legendas e tabelas das células.
- O usuário vê, na mesma carta, quanto o clima de B difere do de A em cada quinzena e hora, e quando a diferença da radiação vem do tempo dos arquivos.
- Os achados sobre o tempo da radiação do BrazFuture entram no rascunho do e-mail ao Prof. Lamberts; as faixas e o limite de 15 min ficam para a revisão do Anthony.
