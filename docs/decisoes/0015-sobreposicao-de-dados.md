# 0015. Sobreposição de dados: bordas das células, faixas e leiaute do celular

- Data: 2026-10-24
- Status: aceita (faixas padrão de UR e DHI e cores: provisórias, a conferir no portão 2)

## Contexto

O F2.4 implementou a sobreposição aprovada no F2.1 (decisão 0013, spec 05). Na implementação surgiram pontos que a spec v0 não fixava ou fixava de um jeito que não funcionava bem: a borda entre quinzenas, as faixas padrão das variáveis que o 6.2 não tinha, as cores, a convivência com a máscara e o leiaute "carta no topo, passos numa folha" no celular.

## Decisão

- **Borda entre quinzenas:** a meio caminho entre o último dia de um período e o primeiro do seguinte (ponto médio, na esfera, das posições do sol nos dois dias na mesma hora legal), e não na trajetória do primeiro e do último dia. As células vizinhas se encostam e nenhuma hora do arquivo fica sobre a borda (spec 05, seção 5.1).
- **Faixas padrão:** TBS, GHI e DNI como no 6.2; propostas para UR (30, 50, 70, 90%) e DHI (100, 200, 300, 400 Wh/m²), que o 6.2 não tinha. Classe pelo limite superior incluído, como nas legendas do 6.2.
- **Frequência acima do limiar:** 5 classes de 20 pontos percentuais; limiares padrão TBS 26 °C (o exemplo aprovado no F2.1), UR 80%, GHI e DNI 500 Wh/m², DHI 200 Wh/m².
- **Cores provisórias até a Fase 4:** TBS divergente (azul, cinza no meio, vermelho), UR em azul, radiação em laranja, frequência em vermelho; rampas de um matiz em OKLCH, conferidas com um validador de paletas (luminosidade monótona, passos visíveis).
- **Máscara com dados na carta:** vira hachura (total a 45°, parcial a 135°) para não esconder as cores; sem dados, continua com o preenchimento vermelho e amarelo.
- **Celular e tablet em pé:** a carta fica fixa no topo e os passos rolam por baixo dela, num painel com aparência de folha; no tablet deitado e no computador, duas colunas.
- **Sem arquivo carregado** (cidades de teste, cujos EPWs não são embutidos, decisão 0010), o passo 4 pede o EPW e aponta o arquivo de origem no Climate.OneBuilding.org.

## Alternativas consideradas

- Bordas nas trajetórias do primeiro e do último dia (spec v0): fresta visível entre quinzenas e horas sobre a borda.
- "Meio dia antes" na mesma hora legal: não corresponde a um instante real (cai à noite); a primeira implementação errou nisso e o teste de referência detectou.
- Folha que se arrasta com o dedo, como nos aplicativos de mapa: mais código e menos previsível em navegadores de celular; a carta fixa no topo já mantém a carta visível enquanto se edita.
- Máscara por cima das células com o mesmo preenchimento translúcido: o vermelho da máscara se confunde com as células quentes.

## Consequências

- A spec 05 passa a v1, com a tolerância do teste (10⁻⁴ na carta de raio 1, usada só nos dias colados aos solstícios).
- As faixas de UR e DHI e as cores entram na lista do portão 2 para o Anthony conferir.
- A tabela de valores por célula (acessível sem o mouse) e a exportação dos dados mostrados ficam para o F2.6 (saídas).
