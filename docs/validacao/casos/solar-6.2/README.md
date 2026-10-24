# Dados do SOL-AR 6.2

Arquivos climáticos embarcados no Analysis SOL-AR 6.2 (LabEEE/UFSC, 2009), usados na regressão (F2.8), na importação do formato legado (F2.7) e como "dados históricos" na comparação de climas (F4.2).

- Origem: `Analysis_SolAr_6_2.zip` (SHA-256 `2043db384271cb7cd15fc66e578519d3ef486bb121eabf3350482f32d0a35532`), baixado de https://labeee.ufsc.br/sites/default/files/softwares/Analysis_SolAr_6_2.zip em 23/10/2026.
- Extração: `python3 docs/validacao/scripts/extrair_solar62.py Analysis_SolAr_6_2.zip`. Conversão de Latin-1 para UTF-8 e de CRLF para LF; nenhum valor alterado. O SHA-256 de cada arquivo **original** está em `SHA256SUMS-original.txt`.
- Conteúdo: 15 arquivos horários (`<cidade>.csv`, 8760 linhas, 19 colunas, sem cabeçalho), 15 rosas de vento pré-calculadas (`<cidade>.ventos.csv`) e `Latitudes.csv` (nome, latitude, arquivo horário, arquivo de ventos, longitude oeste positiva). `Latitudes.csv` lista Goiânia, mas o instalador não traz `goiania.csv`.
- Formato das colunas e verificações já feitas: `docs/referencias/diagnostico-solar-6.2.md`, seções 2.4 e 2.5, e `docs/spec/04-dados-climaticos.md`, seção 4.2.

`formato-inclusao/CHL_Concepcion_NormaIWEC_SOlAr.csv`: exemplo do formato "Incluir Nova Cidade", do pacote `entradaDadoSolar.zip` do site do LabEEE (SHA-256 do zip `a67df98fe85cf37930e12852ccbdceeb3dc4387129a02d50f2d1dba93a62475e`; do CSV original `e25aedee02ad23904fd5b1cc0f705958e93f93bcb18205a11ef85789a5eff22c`). Traz cabeçalho com local, latitude, longitude (leste positiva), fuso (−4) e elevação. As 8760 linhas de dados são idênticas às de `concepcion.csv`.

Uso na aplicação (F2.7, decisão 0017): os 15 arquivos horários são publicados junto com o build e abertos como "dados históricos" no passo 1, com o local do catálogo de cidades.

Referências geradas a partir destes arquivos:

- `referencia-csv.json`: por arquivo, horas, primeira e última hora e, por campo, ausentes, soma, mínimo e máximo, lidos com o módulo `csv` do Python (`docs/validacao/scripts/gerar_referencia_csv62.py`); usado em `tests/referencia/csvSolar62.test.ts`.
- `regressao.json`: regressão contra o 6.2 (carta, hora dos dados na sobreposição e rosa dos ventos), por `docs/validacao/scripts/regressao_solar62.py` com o modelo reconstruído `modelo_solar62.py`; relatório `docs/validacao/relatorios/F2.8-regressao.md`, teste `tests/referencia/regressao62.test.ts`.
- `teste-hora.csv`: arquivo no formato de inclusão (Florianópolis, temperatura igual ao número da hora, Latin-1 e CRLF como o original) para conferir na tela do 6.2 a hora em que os dados são desenhados (relatório do F2.8, seção 6).
- `radiacao-csv.json`: convenção de tempo e coerência da radiação (deslocamento do sol do modelo, longitude equivalente, horas de global incoerente), por `docs/validacao/scripts/analisar_radiacao_csv62.py`; resultados no relatório `docs/validacao/relatorios/F2.7-dados.md`.

Créditos: dados TRY de Goulart, Lamberts e Firmino (1998); programa de Roberto Lamberts, Alexandra Albuquerque Maciel e Edson T. Ono.
