# 5. Sobreposição de dados climáticos na carta

**Status:** v1, implementada no F2.4 (decisões 0013 e 0015). Implementação: `src/core/overlay/overlay.ts`; desenho em `src/ui/overlay/`; validação em `docs/validacao/relatorios/F2.4-sobreposicao.md`.

## 5.1 Célula

Para uma grandeza do EPW, um semestre, um período (quinzena) e uma hora do arquivo, a célula é a região da carta ocupada pelo sol em todos os dias do período e em todos os instantes do intervalo que o valor representa:

- radiação (GHI, DNI, DHI): intervalo de h − 1 a h, em hora legal (energia integrada na hora; spec 02, seção 2.2);
- temperatura de bulbo seco e umidade relativa: intervalo de h − 0,5 a h + 0,5 (valor no instante h).

Limites da célula:

- entre períodos vizinhos, a curva a meio caminho entre a trajetória do último dia de um período e a do primeiro dia do seguinte: para cada hora legal, o ponto médio, na esfera, das posições do sol nos dois dias. Assim as células de períodos vizinhos se encostam, sem fresta, e as horas do primeiro e do último dia ficam dentro da célula, não sobre a borda. (A primeira versão desta seção usava as trajetórias do primeiro e do último dia; isso deixava uma fresta de um dia entre períodos e punha metade das horas desses dias sobre a borda.) Nos solstícios, a borda externa do semestre é o ponto médio entre os dias 21 e 22;
- as curvas dos instantes inicial e final do intervalo (hora legal constante, com o fuso do EPW) ao longo dos dias do período, uma posição por dia.

As trajetórias de borda são amostradas de 5 em 5 minutos. Células inteiramente abaixo do horizonte geométrico não são desenhadas; nas outras, só a parte acima dele aparece (recorte no horizonte).

## 5.2 Semestres e períodos

- Semestres: 22/12 a 21/06 e 22/06 a 21/12, delimitados pelos solstícios, para que cada posição do sol apareça uma vez por semestre.
- Períodos (10 por semestre): 22/12 a 15/01, 16 a 31/01, 01 a 15/02, 16 a 28/02, 01 a 15/03, 16 a 31/03, 01 a 15/04, 16 a 30/04, 01 a 15/05, 16/05 a 21/06; segundo semestre: 22/06 a 15/07, 16 a 31/07, 01 a 15/08, 16 a 31/08, 01 a 15/09, 16 a 30/09, 01 a 15/10, 16 a 31/10, 01 a 15/11, 16/11 a 21/12.
- Variação da declinação por período (SPA, 2026): de 2,1° a 6,3°. O EPW usa as datas do próprio arquivo; os dias do período são mapeados no ano de referência.
- Dias de 29/02, se existirem, entram no período 16 a 28/02 (que passa a ir até 29/02).

## 5.3 Valor e cor

- Valor padrão: média dos valores das horas do arquivo que caem na célula (uma hora por dia do período). Horas com valor ausente não entram; a célula sem nenhum valor fica sem cor e com hachura.
- Alternativa ("Mais opções"): frequência das horas da célula com valor acima (estritamente) de um limiar escolhido, em 5 classes de 20 pontos percentuais. Limiar padrão: TBS 26 °C, UR 80%, GHI e DNI 500 Wh/m², DHI 200 Wh/m².
- Classes: um valor v cai na faixa i quando limite(i−1) < v ≤ limite(i), como nas legendas do 6.2 ("até 10", "10 a 14", ..., "acima de 25").
- Faixas padrão:

  | Grandeza | Limites | Origem |
  |---|---|---|
  | TBS (°C) | 10, 14, 20, 25 | SOL-AR 6.2 |
  | GHI e DNI (Wh/m²) | 250, 500, 850, 1000 | SOL-AR 6.2 (a última faixa do 6.2 ia até 1300 W/m²; aqui é "acima de 1000") |
  | UR (%) | 30, 50, 70, 90 | proposta do F2.4 (o 6.2 não tinha UR) |
  | DHI (Wh/m²) | 100, 200, 300, 400 | proposta do F2.4 (o 6.2 não tinha DHI) |

- "Faixas pelo arquivo": limites nos percentis 20, 40, 60 e 80 da grandeza nas horas com sol acima do horizonte no instante que o valor representa (radiação: h − 0,5; temperatura e umidade: h), por interpolação linear entre as posições vizinhas da lista ordenada (o padrão do numpy), com aviso de que são relativas ao arquivo e não comparáveis entre cidades. Os percentis podem empatar (ex.: DNI em clima nublado, com muitas horas em zero); a classe correspondente fica vazia.
- Cores (provisórias até a paleta acessível da Fase 4): TBS em escala divergente, azul para frio e vermelho para quente, com cinza na faixa do meio; UR em azul; radiação em laranja; frequência em vermelho. Rampas de um matiz só em OKLCH, luminosidade de 0,92 a 0,52 em passos de 0,10.
- Com dados sobre a carta, a máscara de sombra vira hachura (total a 45°, parcial a 135°), para não esconder as cores das células.

## 5.3.1 Diferenças em relação ao SOL-AR 6.2 (F2.8)

O 6.2 desenhava o valor da hora h em t = h − 1 de hora legal (1 h antes para temperatura e umidade, 30 min antes para radiação), com meridiano fixo de 45° O e equação do tempo constante (−2,9 min). Aqui, cada valor fica no seu intervalo (seção 5.1), no fuso do arquivo e com a equação do tempo do SPA. Em média, a mesma temperatura aparece cerca de 1 h mais tarde do que no 6.2 (de 46 a 79 min, conforme o dia; 2 h em Concepción). Detalhes: `docs/validacao/relatorios/F2.8-regressao.md`.

## 5.4 Verificação (F2.4)

- Toda hora do EPW com sol acima do horizonte (ângulo zenital menor que 89,5°) no instante que o valor representa cai em exatamente uma célula do seu semestre.
- A posição do sol de cada hora (radiação: h − 0,5; temperatura: h) está dentro da sua célula, em Florianópolis (UTC−3) e em Manaus (UTC−4); um deslocamento de 1 h no fuso tira todas as posições das suas células (teste negativo).
- Tolerância: 10⁻⁴ na carta de raio 1 (0,006 mm numa carta de 6 cm). Ela só é usada nos dias colados aos solstícios, em que as posições do sol de dias vizinhos quase coincidem e a célula do primeiro ou do último período do semestre tem milésimos de grau de largura na borda.
- Os instantes do teste são calculados direto da convenção do EPW (spec 02, seção 2.2), sem o código da aplicação; a posição do sol vem do SPA já conferido contra o pvlib.
