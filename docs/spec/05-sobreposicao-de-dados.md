# 5. Sobreposição de dados climáticos na carta

**Status:** v0 (definida no F2.1, decisão 0013); implementação e testes no F2.4.

## 5.1 Célula

Para uma grandeza do EPW, um semestre, um período (quinzena) e uma hora do arquivo, a célula é a região da carta ocupada pelo sol em todos os dias do período e em todos os instantes do intervalo que o valor representa:

- radiação (GHI, DNI, DHI): intervalo de h − 1 a h, em hora legal (energia integrada na hora; spec 02, seção 2.2);
- temperatura de bulbo seco e umidade relativa: intervalo de h − 0,5 a h + 0,5 (valor no instante h).

Limites da célula: a trajetória do primeiro dia do período e a do último dia, entre os instantes inicial e final do intervalo; e as curvas dos instantes inicial e final do intervalo (hora legal constante, com o fuso do EPW) ao longo dos dias do período. Só a parte acima do horizonte geométrico é desenhada.

## 5.2 Semestres e períodos

- Semestres: 22/12 a 21/06 e 22/06 a 21/12, delimitados pelos solstícios, para que cada posição do sol apareça uma vez por semestre.
- Períodos (10 por semestre): 22/12 a 15/01, 16 a 31/01, 01 a 15/02, 16 a 28/02, 01 a 15/03, 16 a 31/03, 01 a 15/04, 16 a 30/04, 01 a 15/05, 16/05 a 21/06; segundo semestre: 22/06 a 15/07, 16 a 31/07, 01 a 15/08, 16 a 31/08, 01 a 15/09, 16 a 30/09, 01 a 15/10, 16 a 31/10, 01 a 15/11, 16/11 a 21/12.
- Variação da declinação por período (SPA, 2026): de 2,1° a 6,3°. O EPW usa as datas do próprio arquivo; os dias do período são mapeados no ano de referência.
- Dias de 29/02, se existirem, entram no período 16 a 28/02 (que passa a ir até 29/02).

## 5.3 Valor e cor

- Valor padrão: média dos valores das horas do arquivo que caem na célula (uma hora por dia do período). Horas com valor ausente não entram; a célula sem nenhum valor fica sem cor e com hachura.
- Alternativa ("Mais opções"): frequência das horas da célula com valor acima de um limiar escolhido.
- Faixas de TBS padrão (as do 6.2): até 10, 10 a 14, 14 a 20, 20 a 25 e acima de 25 °C. "Faixas pelo arquivo": limites nos percentis 20, 40, 60 e 80 da grandeza nas horas com sol acima do horizonte, com aviso de que são relativas ao arquivo e não comparáveis entre cidades.

## 5.4 Verificação (F2.4)

- Toda hora do EPW com sol acima do horizonte no meio do seu intervalo cai em exatamente uma célula do seu semestre.
- A posição do sol de cada hora (radiação: h − 0,5; temperatura: h) está dentro da célula, em Florianópolis (UTC−3) e em Manaus (UTC−4); um deslocamento de 1 h no fuso tira as posições das células (teste negativo).
