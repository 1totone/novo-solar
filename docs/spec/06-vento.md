# 6. Vento: rosa dos ventos

**Status:** v2. Rosa dos ventos do F2.5 (decisões 0013 e 0016); filtro pela condição térmica e correção da velocidade para a altura e o terreno do F4.4 (seções 6.3, 6.7 e 6.8; decisão 0027, proposta). Implementação: `src/core/wind/windRose.ts` e `src/core/wind/windProfile.ts`; desenho em `src/ui/wind/`; validação em `docs/validacao/relatorios/F2.5-rosa-dos-ventos.md` e `docs/validacao/relatorios/F4.4-vento.md`.

## 6.1 Dados

- Campos do EPW: direção do vento (campo 21), de onde o vento sopra, em graus a partir do Norte no sentido horário (0° = N, 90° = L); velocidade (campo 22), em m/s, medida na estação (em geral a 10 m de altura, em aeroporto). Ausente: 999 nos dois campos.
- Horas com direção ou velocidade ausente ficam fora de todas as contas; a tela informa quantas são.
- Instante: o valor da hora h do arquivo vale para o instante h (spec 02, seção 2.2), em hora legal do fuso do arquivo.

## 6.2 Classificação de cada hora

- **Calmaria:** velocidade abaixo de 0,5 m/s, qualquer que seja a direção registrada (o EPW costuma gravar calmaria como direção 0° e velocidade 0).
- **Setores:** 8 ou 16. Com n setores de largura w = 360°/n, o setor k (k = 0 para o Norte, crescendo no sentido horário) é centrado em k · w e cobre [k · w − w/2, k · w + w/2). 360° conta como 0°. Uma direção exatamente na fronteira vai para o setor seguinte no sentido horário (ex.: 22,5° com 8 setores é NE).
- **Classes de velocidade:** [0,5; 2), [2; 4), [4; 6) e 6 m/s ou mais (decisão 0013).
- Com a correção da seção 6.7, a calmaria e as classes usam a velocidade corrigida.

## 6.3 Filtros

- **Estação**, pelos meses: dez a fev, mar a mai, jun a ago, set a nov (estações meteorológicas). Os nomes dependem do hemisfério do arquivo: com latitude negativa, verão, outono, inverno e primavera; com latitude positiva, inverno, primavera, verão e outono.
- **Período do dia**, pelas horas do arquivo: madrugada (1 a 6), manhã (7 a 12), tarde (13 a 18) e noite (19 a 24).
- **Condição térmica** (F4.4): só as linhas do arquivo de uma classe, quente, fria ou neutra, da classificação das horas do passo 7 (spec 08), com o mesmo método, os mesmos valores e a mesma temperatura da hora. A classe é a da própria linha: o vento do instante h fica com a classe da hora (h − 1, h]. Com a temperatura da hora padrão (média do início e do fim, seção 8.2), a temperatura representa o instante h − 0,5, meia hora antes do vento; com "fim da hora", os dois são do instante h. A escolha do passo 7 vale aqui para que as horas de cada classe sejam as mesmas nas duas telas. Linhas sem classe (temperatura ausente; faixa adaptativa com t_pma fora de 10 °C a 33,5 °C) ficam fora dos três filtros, e a tela diz quantas são. Sem um método completo no passo 7 (temperatura de equilíbrio sem valor, campo inválido), o filtro fica indisponível, com o motivo na tela. A classe vem só da temperatura do ar externo (seção 8.1): "horas quentes" são as de ar externo quente pelo critério escolhido, não as de desconforto dentro do edifício.
- Os filtros se combinam (ex.: tardes de verão; horas quentes do verão).

## 6.4 Estatísticas

- **Frequência:** porcentagem das horas válidas do filtro em cada setor e classe; a calmaria é uma porcentagem à parte, e a soma de tudo é 100%.
- **Velocidade média por setor:** média das velocidades das horas sem calmaria daquele setor (m/s); setor sem horas fica sem valor.
- **Resolução da velocidade no arquivo:** o maior passo r entre 1; 0,5; 0,1 e 0,01 m/s do qual todas as velocidades são múltiplas. Com r de 0,5 m/s ou mais, as velocidades caem exatamente nas fronteiras das classes (0,5; 2; 4 e 6 m/s) e vão sempre para a classe de cima; a tela avisa que as classes ficam enviesadas (é o caso das TRY do SOL-AR 6.2, em m/s inteiros). Com a correção da seção 6.7 (k ≠ 1), as velocidades ficam em passos de k · r, que em geral não caem nas fronteiras: o aviso só aparece sem correção.

## 6.4.1 Diferenças em relação ao SOL-AR 6.2 (F2.8)

As rosas que acompanham o 6.2 (`.ventos.csv`) são reproduzidas a 0,5 ponto percentual com setores de 45° centrados no Norte, calmaria com velocidade 0 e estações astronômicas começando à 0 h de 23/09, 22/12, 21/03 e 22/06. Com as estações pelos meses (seção 6.3), a nova versão difere delas em até 13,6 pontos percentuais por setor (Natal). O cálculo do 6.2 para cidades incluídas tem setor Norte de 35° e Nordeste de 55°. Detalhes: `docs/validacao/relatorios/F2.8-regressao.md`.

## 6.5 Desenho

- Rosa com o Norte para cima e o Leste à direita, como a carta: cada setor é uma cunha apontando para a direção de onde o vento vem, com as classes empilhadas do centro para fora; a calmaria fica num círculo no centro, com a porcentagem escrita.
- Modo "Velocidade": o comprimento da cunha é a velocidade média do setor (m/s).
- Tabela com os mesmos números (setor, classes, total e velocidade média), para leitura sem o desenho.
- Aviso fixo: o vento é o medido na estação, em geral em aeroporto e a 10 m de altura, e não representa o escoamento no terreno. Com a correção da seção 6.7, o aviso diz que a velocidade foi levada à altura e ao terreno pelo perfil médio, que a direção continua a da estação e que o efeito dos edifícios e da vegetação vizinhos (proteção, canalização, esteira) não entra.

## 6.6 Verificação

Referência independente em Python puro (`docs/validacao/scripts/rosa_dos_ventos.py`), sobre os EPWs de Florianópolis, Porto Alegre e Belém: 8 e 16 setores, ano e 4 estações, dia todo e 4 períodos (150 rosas). Tolerância da spec: 0,1 ponto percentual nas frequências e 0,01 m/s nas velocidades médias.

Vento avançado (F4.4), `tests/referencia/ventoAvancado.test.ts`:

| Grandeza | Referência independente | Tolerância |
|---|---|---|
| Fator k da altura e do terreno (seção 6.7) | EnergyPlus 26.2.0: razão entre *Surface Outside Face Outdoor Air Wind Speed* de faixas de parede com centroides de 1,5 a 40 m e *Site Wind Speed*, nos 5 terrenos do objeto Building (`docs/validacao/scripts/energyplus_vento.py`) | 10⁻⁹ (relativa) |
| Velocidade corrigida, hora a hora | as mesmas saídas, 48 horas por faixa e terreno | 10⁻⁹ m/s |
| Rosas com o filtro térmico e a correção | Python com numpy (`docs/validacao/scripts/rosa_vento_avancado.py`), com a classificação de `classificacao_horas.py` (F3.4): 3 EPWs, limiar de 20 °C e faixa adaptativa de 80%, quentes, frias e neutras, 4 correções e nenhuma, 8 e 16 setores, ano e dez a fev (420 rosas) | a mesma das rosas do F2.5 |

Na referência das rosas, a menor distância entre uma velocidade corrigida e uma fronteira de classe é de 0,0016 m/s: nenhuma hora fica na fronteira por arredondamento.

## 6.7 Altura e rugosidade do terreno (F4.4)

O vento do arquivo é o da estação: em geral a 10 m de altura, em campo aberto (aeroporto). A velocidade a uma altura z sobre um terreno de outra rugosidade é estimada pelo perfil de lei de potência da ASHRAE (*Handbook of Fundamentals* 2005, capítulo 16), o mesmo do EnergyPlus (*Engineering Reference*, seção 3.5.4.2, equação 3.84):

  V_z = V_met · (δ_met / z_met)^α_met · (z / δ)^α = k · V_met

- **Estação:** z_met = 10 m, α_met = 0,14 e δ_met = 270 m, os padrões do objeto Site:WeatherStation do EnergyPlus ("a maioria das estações meteorológicas fica em campo aberto"). Fixos nesta versão.
- **Terreno do lugar** (tabela 3.4 da *Engineering Reference*, que mapeia o campo Terrain do objeto Building):

| Terreno na tela | Terrain (EnergyPlus) | Descrição na tabela 3.4 | α | δ (m) |
|---|---|---|---|---|
| Campo aberto (padrão) | Country | Flat, open country | 0,14 | 270 |
| Subúrbio ou rugoso | Suburbs (e Urban, com os mesmos valores) | Rough, wooded country (Urban, industrial, forest) | 0,22 | 370 |
| Cidade | City | Towns and cities | 0,33 | 460 |
| Água | Ocean | Ocean | 0,10 | 210 |

- **Altura z:** a altura de interesse acima do solo (o centro da janela, a abertura de ventilação), digitada, de 1 a 200 m; em branco, 10 m. No EnergyPlus, z é a altura do centroide de cada superfície. O limite de cima fica abaixo da menor espessura da camada limite da tabela (210 m, água): acima de δ, o perfil não vale. O de baixo evita alturas sem uso para janelas e aberturas.
- **Um fator k para todas as horas:** a velocidade de cada hora é multiplicada por k antes da calmaria e das classes (seção 6.2); a direção não muda. A velocidade média de um setor é a média das velocidades corrigidas das horas que continuam fora da calmaria depois da correção (não é k vezes a média da estação, porque o conjunto de horas muda). Com k < 1, horas saem das classes e entram na calmaria; com k > 1, horas de calmaria na estação (abaixo de 0,5 m/s e acima de 0) podem passar a contar no setor da direção registrada, como no EnergyPlus. Campo aberto a 10 m dá k = 1 (a própria estação).

Valores de k:

| z (m) | Campo aberto | Subúrbio | Cidade | Água |
|---|---|---|---|---|
| 1,5 | 0,767 | 0,472 | 0,240 | 0,968 |
| 3 | 0,845 | 0,550 | 0,301 | 1,037 |
| 6 | 0,931 | 0,641 | 0,379 | 1,112 |
| 10 | 1,000 | 0,717 | 0,448 | 1,170 |
| 20 | 1,102 | 0,835 | 0,564 | 1,254 |
| 40 | 1,214 | 0,972 | 0,709 | 1,344 |

**Hipóteses** (as do EnergyPlus; a tela mostra as principais):

1. A velocidade no topo da camada limite (o vento gradiente, em δ) é a mesma sobre a estação e sobre o lugar.
2. O perfil é o médio sobre um terreno homogêneo em volta do lugar, o mesmo em todas as direções: o fator é igual para todos os setores. Uma cidade à beira-mar, por exemplo, tem a rugosidade da água de um lado e a da cidade do outro.
3. Não entram rajadas nem o efeito dos edifícios e da vegetação vizinhos (proteção, canalização, esteira). Em terreno de subúrbio ou de cidade, abaixo da altura dos obstáculos em volta, a velocidade real depende deles, e o perfil dá só uma ordem de grandeza. É a mesma simplificação do EnergyPlus, que aplica a equação a qualquer altura acima do solo.
4. A estação está a 10 m, em campo aberto. Se o anemômetro estiver em outra altura ou terreno, o fator muda; nesta versão, os dados da estação não são editáveis.

## 6.8 Interface do vento avançado (F4.4)

Na aba "Rosa dos ventos", um grupo recolhido "Mais opções", depois dos quatro grupos de botões, com:

- **Condição térmica:** todas as horas (padrão), quentes, frias ou neutras. Abaixo, o método do passo 7 numa frase (ex.: "limiar de 20 °C, de Lamberts, Dutra e Pereira, 2014"; "faixa adaptativa da ASHRAE 55, 80%"), a temperatura da hora e a contagem das horas de cada classe no arquivo; o método se muda no passo 7, na aba "Carta solar". Sem método completo, os botões ficam desativados, com o motivo.
- **Altura e terreno:** a altura (m) e o terreno, em botões de opção, com a descrição do terreno (e o nome dele no EnergyPlus, com α e δ) e o fator k na tela. Altura fora da faixa fica marcada, e a rosa mostra o vento da estação, sem correção, com o aviso.
- O título da rosa, a legenda da tabela e o texto alternativo dizem a condição térmica e a correção quando ativas (ex.: "horas quentes; a 3 m, cidade").
- Filtro sem horas (ex.: horas frias em Belém pelo limiar de 20 °C): a rosa fica vazia, com o aviso "nenhuma hora nesta condição".
- O CSV do passo 5 é a mesma rosa, com a condição térmica (e o método) e a correção (k) no cabeçalho.
- **Estado no link:** `vh` (condição térmica: `q` quentes, `f` frias, `n` neutras; em branco, todas), `va` (altura, com o texto digitado) e `vt` (terreno: `s` subúrbio, `c` cidade, `a` água; em branco, campo aberto). O grupo abre sozinho quando o link traz uma dessas chaves.

Conferência de ponta a ponta (`e2e/vento.spec.ts`), com um EPW sintético em que o vento vem do Norte a 3 m/s quando o ar está a 25 °C e do Sul a 1,2 m/s quando está a 15 °C: pelo limiar de 20 °C, as horas quentes têm só vento Norte e as frias, só Sul (pixels da rosa e tabela); com cidade a 3 m (k = 0,301), o vento Sul vira calmaria e o Norte passa à classe de 0,5 a 2 m/s; link, teclado, axe e celular.
