# 6. Vento: rosa dos ventos

**Status:** v1 (F2.5; decisões 0013 e 0016). Implementação: `src/core/wind/windRose.ts`; desenho em `src/ui/wind/`; validação em `docs/validacao/relatorios/F2.5-rosa-dos-ventos.md`. A correção da velocidade para a altura e a rugosidade do terreno fica para o F4.4.

## 6.1 Dados

- Campos do EPW: direção do vento (campo 21), de onde o vento sopra, em graus a partir do Norte no sentido horário (0° = N, 90° = L); velocidade (campo 22), em m/s, medida na estação (em geral a 10 m de altura, em aeroporto). Ausente: 999 nos dois campos.
- Horas com direção ou velocidade ausente ficam fora de todas as contas; a tela informa quantas são.
- Instante: o valor da hora h do arquivo vale para o instante h (spec 02, seção 2.2), em hora legal do fuso do arquivo.

## 6.2 Classificação de cada hora

- **Calmaria:** velocidade abaixo de 0,5 m/s, qualquer que seja a direção registrada (o EPW costuma gravar calmaria como direção 0° e velocidade 0).
- **Setores:** 8 ou 16. Com n setores de largura w = 360°/n, o setor k (k = 0 para o Norte, crescendo no sentido horário) é centrado em k · w e cobre [k · w − w/2, k · w + w/2). 360° conta como 0°. Uma direção exatamente na fronteira vai para o setor seguinte no sentido horário (ex.: 22,5° com 8 setores é NE).
- **Classes de velocidade:** [0,5; 2), [2; 4), [4; 6) e 6 m/s ou mais (decisão 0013).

## 6.3 Filtros

- **Estação**, pelos meses: dez a fev, mar a mai, jun a ago, set a nov (estações meteorológicas). Os nomes dependem do hemisfério do arquivo: com latitude negativa, verão, outono, inverno e primavera; com latitude positiva, inverno, primavera, verão e outono.
- **Período do dia**, pelas horas do arquivo: madrugada (1 a 6), manhã (7 a 12), tarde (13 a 18) e noite (19 a 24).
- Os filtros se combinam (ex.: tardes de verão).

## 6.4 Estatísticas

- **Frequência:** porcentagem das horas válidas do filtro em cada setor e classe; a calmaria é uma porcentagem à parte, e a soma de tudo é 100%.
- **Velocidade média por setor:** média das velocidades das horas sem calmaria daquele setor (m/s); setor sem horas fica sem valor.
- **Resolução da velocidade no arquivo:** o maior passo r entre 1; 0,5; 0,1 e 0,01 m/s do qual todas as velocidades são múltiplas. Com r de 0,5 m/s ou mais, as velocidades caem exatamente nas fronteiras das classes (0,5; 2; 4 e 6 m/s) e vão sempre para a classe de cima; a tela avisa que as classes ficam enviesadas (é o caso das TRY do SOL-AR 6.2, em m/s inteiros).

## 6.5 Desenho

- Rosa com o Norte para cima e o Leste à direita, como a carta: cada setor é uma cunha apontando para a direção de onde o vento vem, com as classes empilhadas do centro para fora; a calmaria fica num círculo no centro, com a porcentagem escrita.
- Modo "Velocidade": o comprimento da cunha é a velocidade média do setor (m/s).
- Tabela com os mesmos números (setor, classes, total e velocidade média), para leitura sem o desenho.
- Aviso fixo: o vento é o medido na estação, em geral em aeroporto e a 10 m de altura, e não representa o escoamento no terreno.

## 6.6 Verificação

Referência independente em Python puro (`docs/validacao/scripts/rosa_dos_ventos.py`), sobre os EPWs de Florianópolis, Porto Alegre e Belém: 8 e 16 setores, ano e 4 estações, dia todo e 4 períodos (150 rosas). Tolerância da spec: 0,1 ponto percentual nas frequências e 0,01 m/s nas velocidades médias.
