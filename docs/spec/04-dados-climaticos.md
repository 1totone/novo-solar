# 4. Dados climáticos

**Status:** v0 (F0.4). O leitor de EPW é implementado no F1.1; o CSV legado do SOL-AR, no F2.7; o relatório de qualidade completo, no F4.1.

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

**Checagens do leitor (F1.1):** linha `LOCATION` presente e com números válidos; latitude em [−90, 90], longitude em [−180, 180], fuso em [−12, 14]; 8760 linhas (ou 8784 com 29/02, que é aceito e sinalizado); sequência de mês, dia e hora contínua; valores ausentes contados por campo; radiação negativa rejeitada. Cada erro diz a linha e o campo.

## 4.2 CSV legado do SOL-AR 6.2 (F2.7)

- Arquivos embarcados (`cidades/*.csv`): 8760 linhas, sem cabeçalho, 19 colunas: mês, dia, hora, TBS, TBU, TPO, pressão (kPa), umidade absoluta (kg/kg), UR, densidade, entalpia (kJ/kg, embora o documento de formato diga BTU/lb), velocidade do vento (m/s), direção (graus), nebulosidade (décimos), radiação extraterrestre, global horizontal, direta horizontal, direta normal e difusa horizontal (Wh/m²). Campos podem vir vazios (ex.: Concepción sem DNI).
- `Latitudes.csv`: nome, latitude, arquivo horário, arquivo de ventos, longitude **oeste positiva**.
- Formato de inclusão de cidade (documento `SolAr_inclusao_nova_cidade.pdf`): mesmo corpo, com cabeçalho de local, latitude, longitude, fuso e elevação.
- Na importação, a longitude é convertida para leste positiva e, se não houver fuso, ele é pedido ao usuário (nunca presumido como −3).

## 4.3 Qualidade dos dados (relatório visível ao usuário)

Indicadores calculados para todo arquivo carregado e mostrados junto da origem e do período:

- valores ausentes por campo;
- percentual de calmarias (velocidade igual a 0) e resolução da velocidade (inteira ou decimal) e da direção (passo em graus);
- índice de claridade horário k_t = GHI / radiação extraterrestre horizontal; horas com k_t > 0,8 e radiação extraterrestre acima de 200 Wh/m² são marcadas como implausíveis ou estimadas por modelo (no 6.2: até 9,8% das horas em São Paulo, diagnóstico 2.5);
- fechamento GHI ≈ DNI · cos z + DHI, com o sol no meio do intervalo; desvio tolerado a definir com os dados reais no F1.1;
- origem da separação direta/difusa, quando o cabeçalho informa.

## Referências

- U.S. DOE. *EnergyPlus Auxiliary Programs*, "Weather Converter Program" (formato EPW e códigos de ausente).
- Goulart, S.; Lamberts, R.; Firmino, S. *Dados climáticos para projeto e avaliação energética de edificações para 14 cidades brasileiras*. Florianópolis: PROCEL/NPC-UFSC, 1998.
- LabEEE. *SolAr_inclusao_nova_cidade.pdf* (pacote `entradaDadoSolar.zip`, site do LabEEE).
