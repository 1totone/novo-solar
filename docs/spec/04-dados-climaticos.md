# 4. Dados climáticos

**Status:** v1 (F2.7). Leitor de EPW (F1.1), CSV do SOL-AR 6.2 e catálogo de cidades (F2.7). O relatório de qualidade completo fica para o F4.1.

## 4.1 EPW

Formato do EnergyPlus (*Auxiliary Programs*, "Weather Converter Program"): 8 linhas de cabeçalho e, num ano típico, 8760 linhas horárias, separadas por vírgula.

**Cabeçalho, linha `LOCATION`:** `LOCATION, cidade, estado, país, fonte, WMO, latitude, longitude, fuso, elevação`

| Campo | Unidade e sinal | Uso |
|---|---|---|
| latitude | graus, positiva ao Norte | posição solar |
| longitude | graus, positiva a Leste (oeste é negativo) | posição solar |
| fuso | horas em relação ao UTC, −12 a +14 | conversão de tempo (seção 2.1) |
| elevação | m | paralaxe no SPA; aviso de diferença de altitude (F4.1) |

As outras linhas do cabeçalho (`DESIGN CONDITIONS`, `TYPICAL/EXTREME PERIODS`, `GROUND TEMPERATURES`, `HOLIDAYS/DAYLIGHT SAVINGS`, `COMMENTS 1`, `COMMENTS 2`, `DATA PERIODS`) são lidas apenas para informação: comentários e período de dados aparecem na tela de origem do arquivo.

**Campos horários usados** (posição a partir de 1):

| Nº | Campo | Unidade | Código de ausente |
|---|---|---|---|
| 1 a 5 | ano, mês, dia, hora (1 a 24), minuto | | |
| 7 | temperatura de bulbo seco (TBS) | °C | 99,9 |
| 8 | temperatura de ponto de orvalho | °C | 99,9 |
| 9 | umidade relativa | % | 999 |
| 10 | pressão atmosférica | Pa | 999999 |
| 11 | radiação extraterrestre horizontal | Wh/m² | 9999 |
| 14 | radiação global horizontal (GHI) | Wh/m² | 9999 |
| 15 | radiação direta normal (DNI) | Wh/m² | 9999 |
| 16 | radiação difusa horizontal (DHI) | Wh/m² | 9999 |
| 21 | direção do vento (de onde sopra; 0° = N, 90° = L) | graus | 999 |
| 22 | velocidade do vento | m/s | 999 |
| 23 | cobertura total do céu | décimos | 99 |

O ano do arquivo é ignorado para a posição solar (ano de referência, seção 2.3); mês, dia e hora definem o instante.

**Leitor (F1.1, `src/core/epw/parseEpw.ts`):**

- Primeira linha `LOCATION` com 10 campos; latitude em [−90, 90], longitude em [−180, 180], fuso em [−12, 14], elevação numérica em [−1000, 9000] m.
- Os dados começam depois da linha `DATA PERIODS` (ou na linha 9, se ela faltar). Linhas em branco são ignoradas; BOM e CRLF são aceitos.
- Cada linha horária precisa de pelo menos 23 campos (até a cobertura do céu).
- Sequência obrigatória de 1/1 hora 1 até 31/12 hora 24, sem falta, repetição ou inversão; 29/02 é aceito quando aparece logo depois de 28/02 hora 24, e o arquivo fica marcado com 8784 horas. Qualquer outro total é rejeitado.
- Valor maior ou igual ao código de ausente do campo vira NaN e é contado; valor vazio ou não numérico é erro; radiação negativa é erro.
- O ano do arquivo é lido mas ignorado.
- Cada erro tem um código estável, a linha e, quando cabe, o campo; a interface traduz o código (`src/ui/epwErrorMessage.ts`).
- O período de registro, quando o arquivo informa nos comentários (TMYx: `Period of Record=2011-2025`), aparece como "Período" no passo 1; sem essa informação, "não informado no arquivo".
- A montagem da série horária (sequência, 29/02, ausentes, radiação negativa) é comum ao EPW e ao CSV do 6.2 (`src/core/epw/hourly.ts`).

**Validação:** os 6 EPWs de teste lidos pelo leitor e pelo `pvlib.iotools.read_epw` (referência independente) coincidem em cabeçalho, número de horas, primeira e última hora e, para cada campo, contagem de ausentes, soma (tolerância relativa de 10⁻⁶), mínimo e máximo (`tests/referencia/epw.test.ts`). Arquivos corrompidos são cobertos por testes sintéticos (`src/core/epw/parseEpw.test.ts`).

## 4.2 CSV do SOL-AR 6.2 (F2.7)

**Formatos** (`src/core/epw/parseSolar62.ts`), com o mesmo corpo de 19 colunas por hora: mês, dia, hora (1 a 24), TBS, TBU, TPO (°C), pressão (kPa), umidade absoluta (kg/kg), UR (%), densidade, entalpia (kJ/kg, embora o documento de formato diga BTU/lb), velocidade do vento (m/s), direção (graus), nebulosidade (décimos), radiação extraterrestre horizontal, global horizontal, direta horizontal, direta normal e difusa horizontal (Wh/m²).

- Arquivos embarcados no 6.2 (`cidades/*.csv`): sem cabeçalho, 8760 linhas. O local vem de fora (catálogo ou formulário).
- Formato "Incluir Nova Cidade" (`SolAr_inclusao_nova_cidade.pdf`): linha de rótulos; linha com nome, latitude, longitude (**leste positiva**), fuso e elevação; rótulos das colunas; dados.
- `Latitudes.csv` (nome, latitude, arquivo horário, arquivo de ventos, longitude oeste positiva) não é usado: as longitudes misturam graus e minutos com graus decimais (seção 4.4).

**Leitor:**

- O arquivo tem cabeçalho quando a primeira linha não vazia não começa com número. A linha do local precisa de 5 campos, com os limites do EPW (latitude, longitude, fuso, elevação); senão, erro com a linha.
- Sem cabeçalho, o local é obrigatório: o fuso **nunca é presumido** (o 6.2 fixava 45° O). Na interface, um formulário pede latitude, longitude, fuso e elevação; o botão "Usar o local de <cidade>" preenche com a cidade escolhida, só se o usuário pedir.
- Campos usados e conversões: pressão × 1000 (kPa → Pa); os demais na unidade do EPW. Campo vazio é ausente (NaN) e contado; valor não numérico é erro; radiação negativa é erro; cada linha precisa de 19 campos.
- Linhas sem nenhum valor (só vírgulas, como a última de `fortaleza.csv`) e linhas em branco são ignoradas.
- Sequência e total de horas como no EPW (seção 4.1).
- Codificação: UTF-8 quando válido; senão, Windows-1252 (os arquivos originais do LabEEE são Latin-1).
- O resultado tem o mesmo modelo do EPW: sobreposição, rosa dos ventos e exportações funcionam igual.

**Tempo.** Cada linha descreve a hora que termina em h, na hora legal do fuso do arquivo, como no EPW (seção 2.2). Verificação (relatório do F2.7): a coluna de radiação extraterrestre coincide com I0·cos z integrada em [h − 1, h], com erro quadrático médio de 2 a 5 Wh/m² depois de descontado o deslocamento da longitude descrito abaixo.

**Radiação das TRY.** Os registros de origem não têm radiação (Goulart, Lamberts e Firmino, 1998); as colunas foram geradas por modelo, com o sol na longitude de 48,34° O (o valor de Florianópolis no `Latitudes.csv`, lido como graus decimais) para todas as 14 cidades brasileiras. Na cidade de longitude λ (graus, leste positiva), a radiação vem 4·(λ + 48,34) minutos depois do sol real: 54 min em Recife, 52 em Natal, 50 em Maceió, 40 em Salvador, 39 em Fortaleza, 32 em Vitória, 20 no Rio, 16 em São Luís, 7 em São Paulo, 11 min antes em Porto Alegre e menos de 5 min nas demais. Em Belém, o modelo usou a latitude com o sinal trocado (1,38° N). Os dados são mostrados como estão, com avisos (seção 4.4).

**Validação:** os 15 arquivos embarcados e o exemplo do formato de inclusão, lidos pelo leitor e pelo módulo `csv` do Python (`docs/validacao/scripts/gerar_referencia_csv62.py`), coincidem em número de horas, primeira e última hora e, por campo, ausentes, soma, mínimo e máximo; o exemplo de inclusão tem exatamente os dados de `concepcion.csv` (`tests/referencia/csvSolar62.test.ts`).

## 4.3 Qualidade dos dados (relatório visível ao usuário)

Indicadores calculados para todo arquivo carregado e mostrados junto da origem e do período:

- valores ausentes por campo;
- percentual de calmarias (velocidade igual a 0) e resolução da velocidade (inteira ou decimal) e da direção (passo em graus);
- índice de claridade horário k_t = GHI / radiação extraterrestre horizontal; horas com k_t > 0,8 e radiação extraterrestre acima de 200 Wh/m² são marcadas como implausíveis ou estimadas por modelo (no 6.2: até 9,8% das horas em São Paulo, diagnóstico 2.5);
- fechamento GHI ≈ DNI · cos z + DHI, com o sol no meio do intervalo; desvio tolerado a definir com os dados reais no F1.1;
- origem da separação direta/difusa, quando o cabeçalho informa.

## 4.4 Cidades e fontes de dados (F2.7)

Catálogo (`src/ui/cities.ts`, decisão 0017): as 15 cidades do SOL-AR 6.2 e Manaus.

- **Local:** coordenadas, fuso e elevação do cabeçalho do EPW TMYx 2011 a 2025 da estação do aeroporto (`docs/validacao/casos/epw/catalogo-cidades.json`). As estações das TRY, pelas coordenadas do livro de 1998, são os mesmos aeroportos (diferença máxima de 0,025°, no Rio de Janeiro).
- **Dados recentes:** link para o arquivo TMYx no Climate.OneBuilding.org; o usuário baixa e carrega (decisões 0010 e 0013). Origem e período aparecem a partir do arquivo (seção 4.1).
- **Dados históricos:** os 15 CSV do 6.2, publicados com a aplicação e abertos no passo 1 ("Abrir dados históricos", `hist=1` no link), com o local do catálogo e o fuso −3 (−4 em Concepción, do cabeçalho do formato de inclusão). Origem: TRY de aeroporto (Goulart, Lamberts e Firmino, 1998), ano de referência escolhido entre 1961 e 1970 (1951 e 1970 em Natal, Porto Alegre, Recife e São Paulo; o livro não diz qual ano); Concepción: IWEC (ASHRAE), período não informado. Selo "dados históricos".
- **Avisos** sob a origem: radiação estimada por modelo (TRY); atraso ou adiantamento da radiação em relação ao sol real, quando de 5 min ou mais (seção 4.2); horas em que a radiação global contradiz a extraterrestre do próprio arquivo (Concepción: 259 horas com global sem sol e 461 com global acima da extraterrestre); valores ausentes por campo, para qualquer arquivo.

## Referências

- U.S. DOE. *EnergyPlus Auxiliary Programs*, "Weather Converter Program" (formato EPW e códigos de ausente).
- Goulart, S.; Lamberts, R.; Firmino, S. *Dados climáticos para projeto e avaliação energética de edificações para 14 cidades brasileiras*. Florianópolis: PROCEL/NPC-UFSC, 1998.
- LabEEE. *SolAr_inclusao_nova_cidade.pdf* (pacote `entradaDadoSolar.zip`, site do LabEEE).
- Goulart, Lamberts e Firmino (1998), PDF do site do LabEEE (`dados_climaticos_para_projetos_e_avaliacao_energetica_de_edificacoes_para_14_cidades_brasileiras.pdf`, SHA-256 `eef602b178ce963c2d7ebff45fc48290bb71414cc7a4ce780fba51c25423bcbd`): estações (latitude, longitude, altitude) e períodos dos registros de cada cidade; formato do TRY e ausência de radiação nos registros (cap. 1 e 2).
