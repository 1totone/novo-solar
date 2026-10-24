# 0017. Cidades, dados recentes e dados históricos do SOL-AR 6.2

- Data: 2026-10-24
- Status: aceita (o tratamento da radiação histórica fica para confirmar no portão 2)

## Contexto

O F2.7 pede as 15 cidades do programa antigo com dados recentes e as TRY antigas marcadas como históricas, com origem e período visíveis. Três fatos novos:

- O Climate.OneBuilding.org não envia CORS nem publica termos de redistribuição: os TMYx não podem ser baixados pela aplicação nem embutidos (decisões 0010 e 0013).
- As longitudes do `Latitudes.csv` do 6.2 misturam graus e minutos com graus decimais e têm erros (Maceió: 35,12 contra 35°47' O da estação). O livro de origem das TRY (Goulart, Lamberts e Firmino, 1998) dá as coordenadas das estações: são os mesmos aeroportos dos TMYx atuais, com diferença máxima de 0,025° (Rio de Janeiro).
- A radiação das TRY foi gerada por modelo (os registros de origem não têm radiação), com o sol na longitude de 48,34° O para todas as cidades brasileiras; em Recife, a radiação vem 54 min depois do sol real. A global de Concepción (IWEC) contradiz a extraterrestre do próprio arquivo em 720 horas (relatório `docs/validacao/relatorios/F2.7-dados.md`).

## Decisão

- **Catálogo de 16 cidades:** as 15 do 6.2 e Manaus (caso de UTC−4). Local de cada cidade: coordenadas, fuso e elevação do cabeçalho do EPW TMYx 2011 a 2025 da estação do aeroporto. O mesmo local vale para os dados recentes e os históricos.
- **Dados recentes:** link para o TMYx de cada cidade; o usuário baixa e carrega o arquivo (o leitor mostra origem e período do próprio arquivo).
- **Dados históricos:** os 15 CSV do 6.2 publicados junto com a aplicação (arquivos do LabEEE, decisão 0010), abertos por um botão no passo 1 e reabertos pelo link (`hist=1`). Fuso −3 nas cidades brasileiras, como no 6.2, e −4 em Concepción (cabeçalho do formato de inclusão). Origem e período: TRY de aeroporto, ano de referência escolhido entre 1961 e 1970 (1951 e 1970 em Natal, Porto Alegre, Recife e São Paulo); Concepción, IWEC sem período informado. Selo "dados históricos".
- **Radiação histórica mostrada como está, com avisos:** "estimada por modelo"; atraso ou adiantamento em relação ao sol real quando de 5 min ou mais; horas de radiação global incoerente (Concepción). Nenhum valor é alterado.
- **Importação do CSV do 6.2:** formato de inclusão (local do cabeçalho) e arquivo embarcado (formulário de local, sem fuso presumido; "Usar o local da cidade" só a pedido). UTF-8 ou Windows-1252.

## Alternativas consideradas

- **Coordenadas do `Latitudes.csv`:** reproduziriam o 6.2, mas com longitudes erradas (até 0,67° em Maceió). A regressão do F2.8 compara com o 6.2 sabendo dessa diferença.
- **Corrigir a radiação histórica** (deslocar cada cidade pelo atraso do modelo): o deslocamento não é múltiplo de uma hora, então exigiria interpolar ou refazer o modelo, e os dados deixariam de ser os do 6.2. Fica como proposta para o Anthony, se ele preferir.
- **Não oferecer a radiação histórica:** evita a leitura errada, mas impede a comparação com o 6.2 e com os dados recentes, que é o motivo de manter os dados históricos.

## Consequências

- O build ganha 10,3 MB de CSV (3,2 MB comprimidos), baixados só quando o usuário abre os dados históricos de uma cidade.
- A regressão contra o 6.2 (F2.8) usa os mesmos arquivos e explica as diferenças de longitude e de radiação.
- Pendência do Anthony: confirmar o tratamento da radiação histórica (avisos sem correção) no portão 2.
