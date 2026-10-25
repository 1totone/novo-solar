# 0021. Indicadores de sombreamento (F3.5)

- Data: 2026-10-25
- Status: proposta (núcleo do F3.5 adiantado antes do portão 2, na branch da Fase 3; a confirmar com o Anthony na integração da Fase 3)

## Contexto

O F3.5 quantifica o efeito da proteção: percentual da radiação direta incidente na janela (DNI · cos θ, com cos θ ≥ 0) bloqueada nas horas quentes e admitida nas horas frias, e comparação entre alternativas. O Anthony pediu que a fração ensolarada fosse ponderada por cos θ nas amostras de dentro da hora, supondo a DNI constante na hora, com memória de cálculo à mão e, se viável, conferência contra o EnergyPlus explicando as diferenças de interpolação dos dados climáticos e de posição do sol. Modelo na spec 09.

## Decisão (proposta)

1. **DNI constante na hora**, como pedido: E₀ = DNI · média de cos θ e E = DNI · média de cos θ · f_e nas 6 amostras da hora (C e C_e da spec 07, seção 7.6). A alternativa, **DNI constante enquanto o sol está acima do horizonte** (que conserva a energia da hora no nascer e no pôr do sol), fica como opção do núcleo. Efeito medido: nenhum nos EPWs TMYx de Florianópolis e Manaus, que têm DNI zero em todas as horas com o sol acima do horizonte só em parte da hora; em Porto Alegre, +2,4% na radiação anual de uma fachada Sudeste e +1,2 ponto percentual no admitido nas horas frias.
2. **Dois percentuais**, bloqueado nas horas quentes e admitido nas horas frias, com as somas em kWh/m² por classe; indefinido (e não 0% ou 100%) quando a classe não recebe radiação direta. Horas neutras e sem classe só nas somas.
3. **Comparação sem índice único**: a tabela dos dois percentuais e das somas, e a lista das alternativas não dominadas. Um índice único exigiria pesar o calor evitado contra o perdido, o que depende do edifício.
4. **29 de fevereiro** com a fração ensolarada de 28 de fevereiro e a DNI e a classe do próprio dia.
5. **Só radiação direta**; difusa e refletida no F5.1.
6. **EnergyPlus como conferência, sem critério de aceitação:** a comparação com o EnergyPlus 26.2.0 (8 modelos do F3.8, com e sem as placas) confere a contabilidade (DNI interpolada e radiação incidente reproduzidas exatamente) e explica as diferenças, de até 0,83% na radiação anual sem proteção, 1,66% com proteção e 0,64 ponto percentual nos percentuais. Um limite de regressão (1%, 2% e 1 ponto) trava mudanças futuras no núcleo, escolhido depois de ver os resultados.

## Alternativas consideradas

- DNI constante enquanto há sol como padrão: mais fiel à energia da hora, mas não é o pedido e não muda nada nos arquivos que já zeram a DNI das horas parciais; fica como opção, e a escolha pode ser revista com mais arquivos (INMET, por exemplo).
- Interpolar a DNI como o EnergyPlus: a interpolação linear entre os meios das horas não conserva a energia de cada hora, e a diferença só se anula com o sol no fim dos passos; adotar as duas coisas reproduziria o EnergyPlus, mas com um sol avaliado 5 min fora do meio dos subintervalos e uma radiação que muda de hora.
- Índice único (ex.: média ponderada dos dois percentuais ou balanço em kWh): esconderia uma escolha que é do projetista.
- Descartar o 29 de fevereiro: perderia um dia de dados sem ganho de precisão.

## Consequências

- Nova spec 09 (proposta) e núcleo em `src/core/shading/indicators.ts`, conferidos à mão, contra pvlib e shapely no ano inteiro e contra o EnergyPlus (relatórios `F3.5-memoria-de-calculo.md` e `F3.5-indicadores.md`).
- A interface (tabela das alternativas, hipóteses na tela) fica para depois do portão 2.
- Os indicadores dependem da classificação do F3.4 (decisão 0020); se ela mudar, os percentuais mudam, mas o núcleo não.
