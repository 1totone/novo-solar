# 0034. Catálogo nacional: metadados, qualidade e link oficial; mapa do Natural Earth embutido (F4.1)

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 17 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)). Revê a decisão 0010 no ponto que ela deixou para o F4.1.

## Contexto

O ROADMAP pede, no F4.1, os arquivos TMYx e INMET com mapa e busca, o aviso de distância e de diferença de altitude até a estação, o relatório de qualidade de cada arquivo e os termos de redistribuição verificados. A instrução da sessão: confirmar por escrito os termos de cada fonte; sem permissão, metadados e link oficial; os EPW do INMET esperam a resposta do Prof. Lamberts; mapa sem servidor de terceiros, com base vetorial de domínio público embutida; relatório de qualidade por script.

A pesquisa dos termos (`docs/dados/termos-de-redistribuicao.md`) achou: TMYx do Climate.OneBuilding.org sem licença ("All Rights Reserved"), com base ISD que a NOAA diz não poder ser redistribuída fora dos EUA e com dados da ASHRAE embutidos; EPW do INMET (LabEEE) sem termos e marcados pelo próprio LabEEE como "not recommended"; BrazFuture em CC BY 4.0 (a versão a conferir); Natural Earth em domínio público. Os servidores do OneBuilding não têm CORS: o navegador não pode baixar o arquivo para dentro da aplicação.

## Decisão

1. **TMYx 2011-2025 das 579 estações do Brasil, sem redistribuir os arquivos.** O catálogo traz metadados (estação, UF, coordenadas, altitude e fuso do cabeçalho do EPW, período e anos de dados, fonte), os indicadores de qualidade calculados por nós e o link para o zip oficial. O usuário baixa e carrega no passo 1, como já fazia com as 15 cidades. Pedido de permissão e de CORS ao OneBuilding por e-mail (`docs/dados/rascunhos-de-email.md`); com permissão, os arquivos podem vir com a aplicação, numa revisão desta decisão.
2. **INMET fora** até a resposta do Prof. Lamberts (pendência da decisão 0010), também porque o LabEEE não os recomenda.
3. **Arquivos futuros:** as estações com BrazFuture ganham o link para o Zenodo (CC BY 4.0, não a cópia do OneBuilding, que acrescenta dados da ASHRAE) e a citação; embutir fica para depois de conferida a licença da versão (zenodo.org bloqueado na rede da sessão).
4. **Relatório de qualidade por script** (`scripts/catalogo/gerar_catalogo.py`, independente da aplicação), com os indicadores da spec 04, seção 4.3: valores ausentes, calmarias, resolução do vento, horas com índice de claridade acima de 0,8, fechamento GHI = DNI · cos z + DHI (percentil 95 do desvio nas horas de sol), somas anuais de radiação e temperaturas. Resultado por estação em `docs/validacao/casos/catalogo/qualidade-tmyx.csv`, resumo no relatório do F4.1, e na tela ao escolher a estação.
5. **UF pelas coordenadas** (o nome do arquivo erra a sigla em alguns casos), com o polígono mais próximo para as estações que o 1:50m deixa fora do litoral; quando o nome do arquivo diz outra UF, a tela avisa.
6. **Mapa:** Natural Earth 1:50m, v5.1.2 (domínio público), recortado às 27 UFs e projetado no build (equiretangular com o fator do paralelo de 15° S; cerca de 70 KB, 23 KB com gzip), sem biblioteca nova e sem servidor de mapas.
7. **Local da obra e avisos:** o usuário marca o local no mapa ou digita as coordenadas (e a altitude); a lista mostra as estações mais próximas com a distância e o desnível. Avisos propostos, sem fonte normativa: distância acima de 50 km, desnível acima de 200 m, menos de 10 anos de dados e arquivo só de reanálise. O local fica no link (`perto=lat,lon,alt`).
8. A estação escolhida entra no link como o arquivo (`local=estacao&est=<id>` e as coordenadas), para que a carta reabra sem carregar o catálogo; o catálogo é um bloco carregado só quando aberto.

## Alternativas consideradas

- **Embutir os TMYx agora:** a aplicação abriria qualquer estação sem download, mas sem permissão e contra o aviso da NOAA; fica para a revisão com a resposta do OneBuilding.
- **Ler o índice do OneBuilding no navegador:** sem CORS, não funciona; e dependeria do site no ar.
- **Malhas do IBGE:** oficiais e mais detalhadas, mas sem licença clara; o Natural Earth basta para um mapa de localização.
- **Biblioteca de mapas (Leaflet, d3-geo) e mapa de fundo de terceiros:** mais recursos, mas com servidor de terceiros, dependência nova e sem funcionar offline.
- **Avisos pela altitude com uma correção de temperatura:** a queda de temperatura com a altitude varia com o clima e a hora; só o aviso, sem correção.

## Consequências

- `scripts/catalogo/gerar_catalogo.py` (Python, rodado à mão a cada nova série de TMYx), `src/ui/data/catalogo/` (dados gerados), `src/ui/catalog/` (busca, mapa, local da obra e detalhes da estação), `docs/dados/` (termos e e-mails).
- A qualidade de cada arquivo fica visível antes do download, e a escolha da estação pela distância e pelo desnível, explícita.
- Os 50 km, 200 m e 10 anos são propostas para a revisão do Anthony.
