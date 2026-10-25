# 0024. Padrão da classificação das horas para o sombreamento: limiar de 20 °C

- Data: 2026-10-25
- Status: proposta (não aplicada: até o Anthony decidir, o padrão continua a faixa adaptativa da decisão 0020, com o aviso de viés na tela)

## Contexto

A decisão 0020 adotou como padrão a faixa adaptativa da ASHRAE 55 comparada com a temperatura do ar externo. A revisão crítica de 25/10/2026 (decisão 0020, seção final; relatório do F3.4, seção 4) mediu o viés: a faixa foi feita para a temperatura operativa interna, ignora os ganhos internos e solares e chama de frias muitas horas de sol em que um ambiente com ganhos não estaria frio. Nas fachadas Norte, Leste e Sul de Florianópolis, Brasília e Porto Alegre, a radiação direta em horas quentes fica entre 0% e 21% com o padrão; com um acréscimo de 2 °C (ordem de grandeza medida em casas ocupadas; Papst de Abreu, 2004), dobra ou triplica.

Há uma fonte brasileira citável, do próprio LabEEE, para a necessidade de sombra pela temperatura externa: Lamberts, Dutra e Pereira (2014), "Eficiência energética na arquitetura": "esta estratégia [o sombreamento] deve ser utilizada sempre que a temperatura do ar for superior a 20 °C, mesmo quando a carta bioclimática indicar conforto térmico" (p. 91); na p. 135, o critério é o do Analysis-BIO para um ambiente sem carga térmica interna, com o limite abaixo de 20 °C quando há carga interna (Tabela 4-4), e o livro manda levar essas horas para a carta do Analysis SOL-AR e bloquear com α, β e γ a área correspondente.

## Decisão (proposta)

1. **Método padrão:** limiar único de **20 °C** sobre a temperatura da hora (T_fria = T_quente = 20 °C): acima, a sombra é desejada; abaixo, o sol é desejado; empate neutro. Na tela, com a fonte: "critério de sombreamento de Lamberts, Dutra e Pereira (2014) para ambiente sem carga térmica interna; com carga interna, use um limite menor".
2. **Faixa adaptativa da ASHRAE 55** continua como alternativa, com o acréscimo por ganhos ΔT (padrão 0) e o aviso de que, com ΔT = 0, compara a faixa interna com o ar externo.
3. **Temperatura de equilíbrio** continua digitada, sem padrão (nenhuma fonte por tipologia).
4. Sempre: percentuais das classes nas horas com sol na janela e radiação de cada classe junto dos dois indicadores.

## Alternativas consideradas

- **Manter a faixa adaptativa como padrão (decisão 0020):** é a norma de conforto adaptativo e responde ao clima do lugar, mas, sobre o ar externo, subestima as horas quentes em todas as combinações medidas; o aviso na tela reduz o problema, não o resolve.
- **Faixa adaptativa com ΔT padrão de 2 °C:** fisicamente a mais coerente (compara a faixa com uma estimativa da operativa interna), mas o valor de 2 °C sai de regressões de casas de Florianópolis e Curitiba contra uma média móvel da temperatura externa, não de uma fonte que o recomende como padrão; depende do edifício como a temperatura de equilíbrio.
- **Temperatura de equilíbrio por tipologia:** sem fonte (decisão 0020, revisão crítica).

## Consequências

- Se aceita: muda `DEFAULT_METHOD` em `src/core/comfort/classification.ts` e a opção marcada na interface do passo 7; os números de exemplo do relatório do F3.5 passam a usar o limiar de 20 °C. Os testes de referência dos indicadores fixam a configuração com que as referências foram geradas (faixa adaptativa) e não mudam.
- O limiar de 20 °C não se adapta ao clima: em Belém e Manaus quase toda hora de sol fica quente (o que é coerente com a necessidade de sombra o ano todo), e em climas frios o limite pode ser baixo demais para o inverno; quem precisar escolhe a faixa adaptativa ou digita outro limite.
- Sem faixa neutra (só os empates em 20,0 °C ficam neutros, de 1% a 4% das horas com sol), quase toda a radiação entra num dos dois indicadores, e as alternativas ficam comparadas sobre o mesmo total.
- Se recusada: fica a decisão 0020, com o acréscimo por ganhos, o aviso de viés e a sugestão de 20 °C na tela.
