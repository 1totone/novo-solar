# 0010. EPWs de terceiros não são versionados até a confirmação dos termos

- Data: 2026-10-23
- Status: aceita (provisória; revisar no F4.1)

## Contexto

O F0.5 pede EPWs de teste guardados em `docs/validacao/`. Os arquivos TMYx do Climate.OneBuilding.org são gratuitos para baixar, mas o site não publica termos de redistribuição (o rodapé diz "All Rights Reserved") e o zip não traz licença. O repositório é público e sob licença MIT; versionar os arquivos seria redistribuí-los.

## Decisão

- Os EPWs de teste não entram no git. O repositório guarda `docs/validacao/casos/epw/manifesto.json` (URL, SHA-256 do zip e do EPW, cabeçalho) e o script `docs/validacao/scripts/baixar_epw.py`, que baixa e confere os arquivos em `.cache/epw/`.
- Testes que precisarem de EPW real (F1.1 em diante) baixam pelo script no CI, com cache; testes de unidade usam EPWs sintéticos pequenos, escritos para o projeto.
- Os dados do SOL-AR 6.2, do próprio LabEEE, são versionados: o projeto é a nova versão pedida pelo laboratório e o ROADMAP prevê distribuí-los como dados históricos (F2.7).

## Alternativas consideradas

- **Versionar os EPWs:** mais simples e independente do site, mas com risco de redistribuir sem permissão.
- **Arquivos INMET processados pelo LabEEE:** podem ter termos mais claros; ficam como alternativa a avaliar no F4.1.

## Consequências

- Verificação de 24/10/2026: o Climate.OneBuilding.org não envia cabeçalhos CORS (o navegador não pode baixar os arquivos pela aplicação) e não publica termos de redistribuição. Na v0.5, as cidades terão link para a fonte e o carregamento pelo usuário (decisão 0013). Pendência do Anthony: consultar o Prof. Lamberts sobre embutir os EPWs do LabEEE (INMET).

- Testes com EPW real dependem do Climate.OneBuilding.org estar no ar; o SHA-256 garante que o arquivo é o mesmo.
- O F2.7 ("as 15 cidades com dados recentes") e o F4.1 (catálogo) dependem de confirmar os termos com os mantenedores do Climate.OneBuilding.org (Lawrie e Crawley) ou de usar outra fonte.
