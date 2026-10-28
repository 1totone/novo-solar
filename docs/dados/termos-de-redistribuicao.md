# Termos de redistribuição dos arquivos climáticos e da base do mapa (F4.1, F4.2)

- Pesquisa: 26/10/2026 (acessos entre 11h36 e 12h36 UTC e, para o catálogo, às 15h40 UTC).
- Decisão: 0034 (proposta).
- **Não é parecer jurídico.** A regra do projeto: sem permissão escrita e clara, não redistribuir; o catálogo traz metadados e o link oficial.

**Como ler as citações.** [original]: texto lido na própria fonte (página ou arquivo baixado na sessão). [buscador]: trecho devolvido pela ferramenta de busca, porque a página não abriu (o site do LabEEE devolveu HTTP 500 em todas as páginas; zenodo.org e www.ncei.noaa.gov estão bloqueados pela rede do ambiente da sessão). Os trechos [buscador] precisam ser conferidos na página antes de uma decisão final.

## Resumo

| Fonte | Redistribuir com a aplicação? | O que o catálogo faz agora |
|---|---|---|
| Climate.OneBuilding.org, TMYx | **Indeterminado; tratar como não.** Sem licença publicada; rodapé "All Rights Reserved"; zip sem licença. Base ISD fora dos EUA com aviso da NOAA de não redistribuição; condições de projeto da ASHRAE embutidas. | Metadados (estação, coordenadas, altitude, fuso, período, anos, fonte), indicadores de qualidade calculados por nós e o link para o arquivo oficial. Pedido de permissão por e-mail (rascunho em `rascunhos-de-email.md`). |
| NOAA NCEI ISD (base dos TMYx) | **Não**, para estações fora dos EUA. | Nada a fazer; citado no aviso de origem. |
| ERA5, Copernicus (radiação dos TMYx) | **Sim**, CC BY 4.0 desde 02/07/2025, com atribuição [buscador]. | Atribuição no aviso de origem dos TMYx. |
| INMET (dados brutos) | **Indeterminado**: públicos e gratuitos, sem licença expressa [buscador]. | Não usados diretamente. |
| LabEEE, INMET 2016 e 2018 (EPW de Roriz) | **Indeterminado**: nenhum termo encontrado. O próprio LabEEE os marca como "not recommended" e recomenda o OneBuilding [buscador]. | Fora do catálogo até a resposta do Prof. Lamberts (pendência já registrada). |
| BrazFuture (LabEEE e INPE, Zenodo) | **Sim, condicionado**: CC BY 4.0 na v1.0 [buscador]; a v1.1.1 (citada pelo OneBuilding) a conferir; usar a cópia do Zenodo, não a do OneBuilding (que acrescenta dados da ASHRAE). | Link e citação na comparação de climas (F4.2); embutir depois de conferida a licença da versão. |
| INPE, plataforma PROJETA (modelo Eta) | **Indeterminado; na prática, não**: não há EPW; o site do CPTEC declara CC BY-ND 3.0 e pede autorização expressa para reprodução [buscador]. | Fora. |
| Natural Earth (base do mapa) | **Sim**: domínio público, sem exigência de crédito [original]. | Contornos das UFs a 1:50m, embutidos (cerca de 60 KB), sem servidor de mapas. |
| IBGE, malhas territoriais | **Indeterminado**: sem licença explícita localizada; termos de outras bases cartográficas do IBGE são restritivos [buscador]. | Não usado. |

## 1. Climate.OneBuilding.org (TMYx)

- Página inicial [original]: "TMYx dataset are created by the authors of this website." Citação pedida: "Lawrie, Linda K, Drury B Crawley. 2026. Development of Global Typical Meteorological Years (TMYx). https://climate.onebuilding.org". Isenção: "Climate.OneBuilding.Org, OneBuilding.Org and the authors accept no liability for the content, quality or completeness of any data posted on this site [...]". Rodapé em todas as páginas: "Copyright © 2014-2026 Climate.OneBuilding. All Rights Reserved."
- Não há página de licença nem de termos (`/license.html` e `/terms.html` devolvem 404); a página de perguntas frequentes é um modelo vazio.
- Fontes [original]: "TMYx is our traditional data built from ISD (NOAA NCEI Integrated Surface database) data sources and gridded solar radiation data from ERA5 reanalysis dataset." e "The ERA5 data, courtesy of Oikolab [...]".
- Dentro do zip [original]: `.clm`, `.ddy`, `.epw`, `.pvsyst`, `.rain`, `.stat`, `.wea`, sem licença nem leia-me. O EPW traz `COMMENTS 1,"NCEI ISD/ERA5 - #years=[15] Period of Record=2011-2025; ..."`, `COMMENTS 2,"Downloaded from Climate.Onebuilding.org [...]"` e a linha `DESIGN CONDITIONS` da ASHRAE (Handbook 2025).
- NOAA, readme do ISD [original]: "IMPORTANT NOTE: The non-U.S. data in ISD are subject to WMO Resolution 40 restrictions, and cannot be redistributed to other users or customers."
- ASHRAE: dados climáticos de projeto licenciados; "provided for personal, noncommercial use without written permission of ASHRAE" [buscador].
- **Conclusão:** indeterminado, tratar como não. O catálogo usa metadados e link (regra do projeto). Contato: Dru Crawley e Linda Lawrie (endereços na página de contato do site).
- **Sem CORS** nos zips e nas planilhas [original]: o navegador do usuário não pode baixar o arquivo do OneBuilding para dentro da aplicação; o usuário baixa e carrega. O e-mail pede também o CORS.

## 2. INMET e os EPW do LabEEE

- INMET [buscador]: "Os dados coletados pelo Inmet são públicos e podem ser acessados gratuitamente [...]" e "o uso e aplicação desses dados é de responsabilidade do usuário". Nenhuma licença expressa nas páginas do BDMEP e dos dados históricos.
- LabEEE [buscador; site com erro 500 durante a pesquisa]: o OneBuilding aparece como fonte "recommended!"; "INMET 2016 (not recommended)", "INMET 2018 (not recommended)". Nenhum termo de uso.
- Roriz (2012), `sobre_epw.pdf` [original]: 411 estações do INMET, 2000 a 2010, "baixa representatividade estatística". Sem termos.
- Qualidade: relatório do LabEEE de 2025 citado por terceiros aponta radiação direta normal muito subestimada nos arquivos INMET (São Paulo: 528 kWh/m² por ano, contra cerca de 1600 nos TMYx) [buscador, fonte secundária]. Para uma ferramenta de sombreamento, isso pesa.
- **Conclusão:** indeterminado. Os EPW do INMET ficam fora do catálogo até a resposta do Prof. Lamberts e da decisão de oferecê-los (o próprio LabEEE não os recomenda).

## 3. Arquivos futuros

- **BrazFuture** (Bracht, Olinger, Krelling, Gonçalves, Melo e Lamberts; LabEEE e INPE), Zenodo: 10.5281/zenodo.10015137 (v1.0, CC BY 4.0 [buscador]) e 10.5281/zenodo.13744587 (v1.1.1, licença a conferir). 28 locais (26 capitais e Brasília; São Paulo com dois aeroportos), RCP2.6 e RCP8.5, 3 modelos globais × 2 regionais, períodos 2010s, 2050s e 2090s (1008 arquivos no índice do OneBuilding [original]). Método: https://doi.org/10.1016/j.jobe.2024.109248. Ressalva dos autores: os TMY não representam extremos [buscador].
- **INPE, PROJETA:** projeções do modelo Eta em CSV e NetCDF, sem EPW; termos do CPTEC restritivos (SemDerivações) [buscador].
- **Conclusão:** BrazFuture pode ser embutido com atribuição depois de conferida a licença da versão no Zenodo (bloqueado nesta sessão); até lá, link e citação. PROJETA fora.

## 4. Base do mapa

- Natural Earth, termos [original]: "All versions of Natural Earth raster + vector map data found on this website are in the public domain. [...] No permission is needed to use Natural Earth. Crediting the authors is unnecessary."
- Usado: `ne_50m_admin_1_states_provinces.geojson` da tag v5.1.2 do repositório `nvkelso/natural-earth-vector` no GitHub (SHA-256 conferido pelo script), recortado às 27 UFs e projetado no build (`scripts/catalogo/gerar_catalogo.py`). Crédito dado mesmo assim, na legenda do mapa.
- Cuidado medido: 24 das 579 estações TMYx caem fora de qualquer UF no 1:50m (litoral e ilhas generalizados); o script usa o polígono mais próximo e marca esses casos.

## 5. Pendências

1. Enviar os e-mails de `rascunhos-de-email.md` (OneBuilding em inglês; Prof. Lamberts) e registrar as respostas numa revisão da decisão 0034.
2. Conferir na fonte os trechos [buscador] quando os sites abrirem: LabEEE, INMET, ECMWF, Zenodo (licença da v1.1.1 do BrazFuture), CPTEC e ASHRAE.
3. Liberar `zenodo.org` e `www.ncei.noaa.gov` na rede do ambiente das sessões, se o Anthony quiser que a próxima sessão confira a licença e baixe o BrazFuture.
