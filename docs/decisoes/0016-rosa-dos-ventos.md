# 0016. Rosa dos ventos: estações, períodos do dia e setores

- Data: 2026-10-24
- Status: aceita (a conferir no portão 2)

## Contexto

O F2.1 aprovou a rosa dos ventos numa aba própria, com 8 ou 16 setores, frequência e velocidade, calmaria abaixo de 0,5 m/s, classes [0,5; 2), [2; 4), [4; 6) e ≥ 6 m/s e filtros por estação e período do dia (decisão 0013). Faltava fixar como se definem as estações e os períodos, o número de setores padrão e o que mostrar no modo de velocidade.

## Decisão

- **Estações pelos meses** (meteorológicas): dez a fev, mar a mai, jun a ago, set a nov. Os nomes seguem o hemisfério do arquivo (latitude negativa: dez a fev é verão).
- **Períodos do dia pelas horas do arquivo:** madrugada 1 a 6, manhã 7 a 12, tarde 13 a 18, noite 19 a 24 (hora legal do fuso do arquivo; o valor da hora h vale para o instante h).
- **Setores centrados nos pontos cardeais**, 8 por padrão, como no SOL-AR 6.2; 16 a um clique. Direção na fronteira vai para o setor seguinte no sentido horário.
- **Modo velocidade:** velocidade média das horas sem calmaria de cada setor.
- **Frequência sobre as horas válidas** do filtro, com a calmaria à parte (soma 100%); horas sem direção ou velocidade ficam fora e são contadas na tela.
- **Aviso de viés** quando a velocidade vem em passos de 0,5 m/s ou mais (as TRY do 6.2 vêm em m/s inteiros).

## Alternativas consideradas

- Estações astronômicas (pelos solstícios e equinócios, como os semestres da carta): menos usuais em climatologia e com fronteiras no meio dos meses, o que complica comparar com normais climatológicas.
- 16 setores por padrão: mais detalhe, mas foge do 6.2 e dilui as frequências por setor; fica a um clique.
- Velocidade predominante (moda) no modo de velocidade, como o rótulo do 6.2 sugere: com velocidades em décimos de m/s a moda é instável; a média é reprodutível.

## Consequências

- A spec 06 registra essas definições; a regressão contra as rosas pré-calculadas do 6.2 (F2.8) vai mostrar se o 6.2 usava as mesmas estações e períodos.
- A correção da velocidade para a altura e a rugosidade do terreno fica para o F4.4.
