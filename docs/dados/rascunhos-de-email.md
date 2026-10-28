# Rascunhos de e-mail: termos de redistribuição dos arquivos climáticos

Para o Anthony enviar (F4.1, decisão 0034). Os endereços estão nas páginas de contato de cada fonte. Registrar as respostas numa revisão da decisão 0034 e em `termos-de-redistribuicao.md`.

## 1. Para Dru Crawley e Linda Lawrie (Climate.OneBuilding.org), em inglês

Assunto: Permission request: Brazilian TMYx files in the new SOL-AR (LabEEE/UFSC)

> Dear Dru Crawley and Linda Lawrie,
>
> I am Anthony Aliardi, a civil engineer leading the new version of SOL-AR, the sun-path and shading design tool of LabEEE (Federal University of Santa Catarina, Brazil), requested by Prof. Roberto Lamberts and to be maintained by the lab. It is free, open source (MIT license for the code) and runs entirely in the browser, with no server and no data collection.
>
> We would like to offer a catalogue of the TMYx 2011-2025 files of the 579 Brazilian stations, with a map and search. Since the site does not state redistribution terms, the catalogue currently shows only metadata (station, ID, coordinates, elevation, time zone, period of record), quality indicators we compute ourselves, and a link to the download on Climate.OneBuilding.org.
>
> We kindly ask for written permission to:
> 1. distribute with the application the TMYx 2011-2025 EPW files of the Brazilian stations, unmodified or reduced to the columns the tool uses, with the citation and terms you indicate (the data files would not fall under the MIT license of the code);
> 2. keep using the metadata of your Region 3 spreadsheet and KML in the catalogue, linking to each file.
>
> Two questions: how do you handle NOAA's note that non-U.S. ISD data are subject to WMO Resolution 40 and cannot be redistributed; and whether the ASHRAE design conditions included in the files carry any condition (if so, we would distribute the EPW without the DESIGN CONDITIONS line).
>
> If redistribution is not possible, could you enable CORS (Access-Control-Allow-Origin) on the .zip files, so that the user's browser can download them directly from your site?
>
> Also, in the Region 3 spreadsheet and KML, the Paraíba URLs use the folder "PB_Paraíba" (with an accent), which returns 404; the folder on the server is "PB_Paraiba".
>
> While computing quality indicators for the catalogue, we found that the timing of the solar radiation in most Brazilian TMYx 2011-2025 files does not follow the EPW convention (value of hour h integrated over the hour ending at h). Comparing the daily centroid of the global horizontal radiation with that of the extraterrestrial radiation integrated over the same hours (pvlib SPA, header coordinates and time zone), on the 30 clearest days of each file, the radiation is centred about 30 min later than the convention (median +30.5 min over the 579 files; e.g. Florianópolis +32, São Paulo-Guarulhos +31, Belém +25 min), about 30 min earlier in most of Rio Grande do Sul and western Paraná (Alegrete −30 min), and about 90 min later in some stations, among them six in Minas Gerais whose header gives time zone −4 instead of −3 (Formiga, Ibirité, Manhuaçu, Ouro Branco, Passos, Viçosa). The extraterrestrial radiation field of the files is centred 30 min earlier than the convention in all of them. The method recovers known shifts of 0, 30 and 60 min on synthetic clear-sky data. Its uncertainty comes from the diurnal cycle of clouds, which shifts the centroid even on clear days; on the Brazilian TRY files, whose timing is known exactly, it ranges from −8 to +10 min (cloudier mornings on the north-eastern coast, cloudier afternoons in Belém). After removing it in the 14 cities where we can, the shift is between +26 and +34 min in 12 of them (mean +30 min), with Recife (+89 min) and Porto Alegre (+14 min) as exceptions. A 30-min shift is what one would get if the value of hour h were the instantaneous value at h instead of the integral over the hour ending at h; we have not checked the processing. The per-station values are in our repository (docs/validacao/casos/catalogo/qualidade-tmyx.csv, report docs/validacao/relatorios/F4.1-catalogo.md, https://github.com/1totone/novo-solar), in case they help.
>
> Thank you for the TMYx work, which LabEEE recommends.
>
> Best regards,
> Anthony Aliardi

## 2. Para o Prof. Roberto Lamberts (LabEEE)

Assunto: Novo SOL-AR: termos dos arquivos climáticos do LabEEE (INMET e BrazFuture)

> Prof. Roberto,
>
> Para o catálogo nacional de arquivos climáticos do novo SOL-AR (mapa e busca) e a comparação de climas, preciso confirmar por escrito os termos de redistribuição dos arquivos do LabEEE. A aplicação é estática, gratuita e de código aberto (MIT para o código); os arquivos de dados manteriam licença própria, com a citação que o LabEEE indicar.
>
> 1. INMET 2016 e INMET 2018 (EPW de Roriz, com as correções do LabEEE): o LabEEE autoriza publicá-los com a aplicação? Sob qual licença (por exemplo, CC BY 4.0) e com qual citação? A página do LabEEE os marca como "not recommended": o senhor prefere que o catálogo os ofereça como históricos, com aviso, ou que não os ofereça?
> 2. BrazFuture (Zenodo, CC BY 4.0): confirma que podemos embutir os EPW, com a citação de Bracht et al.? Qual versão usar?
> 3. TMYx do Climate.OneBuilding.org: o site não publica termos e diz "All Rights Reserved". O LabEEE tem algum acordo com Dru Crawley e Linda Lawrie que cubra a redistribuição? Vou escrever a eles; o apoio do senhor ao pedido ajudaria.
> 4. Hospedagem: o LabEEE poderia manter cópias dos arquivos no próprio servidor, com CORS habilitado? Isso permitiria abrir os arquivos direto na aplicação.
>
> Enquanto não houver resposta, o catálogo tem só metadados, indicadores de qualidade calculados por nós e o link para o download oficial.
>
> Um achado que interessa ao LabEEE, que recomenda os TMYx: na maior parte dos arquivos TMYx 2011-2025 do Brasil, a radiação vem cerca de 30 min depois da convenção do EPW (hora que termina; descontado o efeito das nuvens, que as TRY permitem medir, entre 26 e 34 min em 12 das 14 cidades); no RS e no oeste do PR, cerca de 30 min antes; e em algumas estações, cerca de 90 min depois, entre elas seis de Minas Gerais com fuso −4 no cabeçalho. Os números por estação estão no relatório do F4.1 do repositório. Vou avisar o Crawley e a Lawrie.
>
> Outro achado, sobre o BrazFuture (conferi 9 arquivos, cópias do OneBuilding, porque o Zenodo estava bloqueado na rede): o campo de extraterrestre segue a convenção do EPW, mas a radiação global vem cerca de 25 a 46 min antes do sol nas rodadas com o REMO e cerca de 110 min depois nas com o RegCM (relatório do F4.2, seção 4.2). Entre 2010 e 2050 da mesma rodada o tempo é o mesmo, e a comparação dentro da rodada não sofre; a comparação com o TMYx ou com a TRY, sim. A DNI anual do BrazFuture de Florianópolis (MPI-ESM com REMO) é cerca de metade da do TMYx, com a global parecida. Vale conferir o processamento antes de recomendar esses arquivos para estudos de sombreamento.
>
> Aviso também que as páginas do labeee.ufsc.br estavam devolvendo erro 500 em 26/10 (os PDFs abriam).
>
> Abraço,
> Anthony
