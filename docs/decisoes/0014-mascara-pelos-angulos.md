# 0014. Máscara pelos ângulos: sombra total e parcial, índices 2 e γ das aletas

- Data: 2026-10-24
- Status: aceita

## Contexto

No SOL-AR 6.2 a máscara era pintada à mão sobre as curvas do transferidor. O F2.3 calcula a máscara a partir de α, β e γ. Faltavam três definições: o significado dos índices 2, como representar a sombra parcial (o 6.2 tinha as cores total e parcial, mas sem critério) e se um campo de γ serve para os limites laterais do brise e para o topo das aletas. O Anthony decidiu os três pontos em 24/10/2026; a geometria dos pontos de referência foi derivada no F2.3 e verificada por traçado de raios.

## Decisão

- **Índice 2 = brise afastado da parede**, como no tutorial do SOL-AR da UFU (Bortoli e Saramago, p. 11: "Pode-se também inserir o Ângulo Alfa 2, para o caso de brises afastados da parede"; p. 15: brise afastado 28 cm, α1 = 55° e α2 = 20°, com redução da zona de eficiência total porque a fresta deixa passar sol). A sombra fica entre a curva da aresta externa (1) e a da interna (2). Os índices ficam na ordem digitada; se o 2 der ângulo externo menor que o 1, não há sombra total.
- **Dois conjuntos:** os campos atuais são a "Sombra total (100%)"; em "Mais opções", um conjunto opcional "Sombra parcial (50%)", com os mesmos campos (índice 2 inclusive), todos medidos do centro da janela. A região parcial é a região desse conjunto menos a total.
- **Pontos de referência da sombra total:** α1 da base, α2 da verga, γ do canto inferior do mesmo lado, β1 da aresta oposta, β2 da aresta do mesmo lado, γ das aletas do canto superior oposto (spec 01, seção 1.6). α2 e β2 vêm de pontos diferentes dos de α1 e β1; medir da base ou da aresta oposta superestima a proteção.
- **γ:** os campos γ direita e esquerda limitam o brise horizontal. O topo das aletas é outro campo, "γ das aletas", em "Mais opções": as duas são arestas paralelas à normal (mesma família de curvas), mas no brise a sombra fica entre os limites laterais e na aleta fica abaixo do topo.
- **γ2 é desenhado, mas não muda a máscara:** as duas pontas da aresta lateral de um brise retangular dão o mesmo γ. O γ das aletas tem um campo só pelo mesmo motivo.
- **Conjunto de peças:** a região é a união das regiões de cada peça. É exata com uma peça só, com aletas dos dois lados e na grelha (peças encostadas, junto à parede, sem γ); com brise e aletas de pontas livres, é uma parte da sombra total real, e a ajuda diz isso.
- **Desenho à mão mantido como opção:** polígonos de vértices clicados na carta, total ou parcial, guardados no link e somados à máscara calculada.
- **Referência independente:** traçado de raios com janela e placas reais, para a sombra total e para o critério do centro. **Caso da literatura:** o exemplo do tutorial da UFU em Brasília, com verificação qualitativa até chegarem as figuras com dimensões.

## Alternativas consideradas

- Índice 2 como segunda proteção independente (um segundo brise): não é o uso do tutorial nem do 6.2.
- Sombra parcial por uma fração fixa calculada da geometria: exige as dimensões da janela e das peças, que a entrada por ângulos não tem; fica para a máscara pela geometria (Fase 3).
- Um campo de γ só para o brise e as aletas: a sombra fica de lados opostos da curva nos dois casos, então o mesmo número não descreve as duas peças.
- Ordenar os índices como o 6.2: perde a informação de qual aresta é a externa e esconde entradas inconsistentes.

## Consequências

- A spec 01 ganha a seção 1.6 (máscara pelos ângulos) e a condição do topo das aletas sai de "a verificar".
- O transferidor deixa de ordenar os índices; a regressão contra o 6.2 compara o conjunto de curvas.
- A máscara total de brise com aletas soltas é conservadora; o valor exato vem da máscara pela geometria (F3.1 a F3.3).
- A confirmação quantitativa do caso do tutorial depende das figuras das p. 13 a 15 (pendência do Anthony).
