# Analysis SOL-AR: diagnóstico técnico e proposta de nova ferramenta

> Documento de referência da análise inicial (23/10/2026). O plano vigente está em [`../ROADMAP.md`](../ROADMAP.md).

Versão: 23/10/2026. Base: engenharia reversa do instalador "SolAr 6_2.exe" (LabEEE/UFSC), tutorial de Bortoli e Saramago (UFU), documento "SolAr_inclusao_nova_cidade" e pesquisa de ferramentas, normas e bases climáticas.

## 1. Resumo

- O SOL-AR 6.2 é um programa de 2009, Windows 32 bits. Seu valor está na simplicidade e no método didático (carta estereográfica + transferidor), não na precisão ou nos dados.
- Problemas concretos encontrados:
  1. Dados climáticos de 1951 a 1970 (TRY de aeroportos), sem radiação medida na origem e com vento de baixa qualidade.
  2. Máscara de sombra construída à mão pelo usuário (retas + preenchimento), sem cálculo a partir da geometria e sem percentual de sombreamento.
  3. Meridiano padrão fixo em 45°W na conversão hora legal para hora solar: erro de 1 h nas sobreposições para dados em hora local de cidades em UTC-4 e 2 h no Acre. Inclui a Concepción que vem no instalador: o arquivo (IWEC, idêntico ao CHL_Concepcion_NormaIWEC_SOlAr.csv usado na análise) declara fuso -4 no cabeçalho; ele também não tem radiação direta normal (coluna vazia).
  4. Faixas fixas de temperatura que saturam em climas quentes (85% das horas diurnas de Fortaleza numa única cor).
  5. Plataforma obsoleta, sem Mac, saída apenas em bitmap ou impressora, inclusão de cidades por CSV próprio com conversão manual.
- A geometria solar (Cooper + Spencer) tem erro de cerca de 1° (RMS 0,5°), aceitável na escala do desenho. Não é aí que está o problema.
- Nicho não atendido: ferramenta gratuita, em português, que preserve o método da carta + transferidor, calcule a máscara, use dados atuais e quantifique o efeito, com ponte para normas brasileiras (NBR 15220-3:2024, INI-C) e para o EnergyPlus.

## 2. Inventário do programa (engenharia reversa)

### 2.1 Pacote

- Instalador InstallShield (Setup Launcher Macrovision 2007, versão 6.02) contendo SOL-AR.msi.
- Executável ProjSolar.exe, versão 6.2.0.81, compilado em 02/03/2009 com Borland C++ Builder 5 (VCL50.BPL, CC3250MT.DLL, BORLNDMM.DLL) e componentes comerciais TMS AdvStringGrid e FnpNumericEdit.
- Arquivos: Latitudes.csv (nome, latitude, arquivo horário, arquivo de ventos, longitude oeste positiva) e pasta cidades/ com 15 pares de CSV (horário + .ventos).
- Créditos (tela Sobre): Pesquisa e Desenvolvimento: Roberto Lamberts e Alexandra Albuquerque Maciel. Programação: Edson T. Ono. UFSC/ECV/LabEEE.

### 2.2 Interface e funções (formulários extraídos do executável)

- Carta Solar: cidade (lista) ou latitude; orientação (só valores positivos, sentido horário); transferidor com ângulo de referência interno ou externo; trajetória solar; botões Novo, Atualizar Carta Solar e Pontos.
- Abas de ângulos: Alfa 1 e 2; Beta direita/esquerda 1 e 2; Gama direita/esquerda 1 e 2 (os "2" representam brises afastados da parede).
- Aba Máscara: "Desenhar reta" (clicar início e fim) e "Preencher" (clicar dentro da região), com cores Total (vermelho) e Parcial (amarelo), e botão Limpar. O programa traça as linhas de α, β e γ; a máscara é construída manualmente.
- Sobreposição de dados: Temperaturas, Radiação Global Horizontal ou Radiação Direta Normal; período "até 21 de junho" ou "após 21 de junho"; legenda fixa de TBS: até 10, 10 a 14, 14 a 20, 20 a 25 e acima de 25 °C.
- Rosa dos ventos: "Velocidades predominantes" ou "Frequência de ocorrência", 8 direções, 4 estações, e tabela de "ventos ausentes" (%) por período do dia (madrugada, manhã, tarde, noite) e estação.
- Menu Arquivo: Carta Solar, Rosa dos Ventos, Incluir Nova Cidade, Comparar (última carta e última rosa lado a lado), Imprimir (raio da carta em cm, padrão 6), Fechar. Editar: Copiar (bitmap). Ajuda: Sobre.
- Incluir Nova Cidade: CSV de 19 colunas (cabeçalho com local, latitude, longitude, fuso e elevação; depois 8760 linhas horárias) e campos de data/hora de início das estações (padrão 22/09 18h, 21/12 14h, 20/03 08h, 21/06 02h).

### 2.3 Rotina de cálculo solar (desmontada; função em 0x40A030 do ProjSolar.exe)

- Declinação de Cooper: δ = 23,45·sen(0,986·(284 + n)), em graus.
- Equação do tempo de Spencer (forma de Duffie e Beckman): E = 229,2·(0,000075 + 0,001868 cos B − 0,032077 sen B − 0,014615 cos 2B − 0,04089 sen 2B), em minutos. **Correção do F2.8:** o programa atribui B = 0 antes do cálculo (0x40a3bf), então E = −2,9 min constante em todos os dias.
- Hora solar = hora legal + [4·(45 − L) + E]/60, com L = longitude oeste positiva. O meridiano padrão está fixo em 45°W; o fuso do arquivo não é usado.
- Sobreposição (F2.8): para cada dia do semestre (1 a 171 ou 172 a 365) e cada t de 0 a 23 h de hora legal, em passos de 0,1 h, o ponto usa a linha 24·(n − 1) + floor(t) do CSV, interpolada até a seguinte: o valor da hora h aparece em t = h − 1 (1 h antes para temperatura, 30 min antes para radiação). Campo vazio vale 0.
- Carta (F2.8): trajetórias com 7 declinações fixas (±0,41, ±0,35, ±0,18 e 0 rad; até 1,7° de erro em abril e agosto) e linhas horárias solares de 6 a 18 h.
- Rosa para cidade incluída (F2.8): setor Norte de 337,5° a 12,5° e Nordeste de 12,5° a 67,5°; as rosas que acompanham o programa vêm de outro cálculo. Detalhes e regressão: `docs/validacao/relatorios/F2.8-regressao.md` e `docs/validacao/scripts/modelo_solar62.py`.
- Ângulo horário ω = 15·(hora solar − 12); altura solar por sen α = sen φ sen δ + cos φ cos δ cos ω.
- Projeção estereográfica: r = R·tan(z/2).

### 2.3.1 Transferidor (desmontado no F2.2)

- Seletor "Ângulo de Referência" (Interna/Externa): na interna, o programa converte α, β e γ para 90° − valor antes de desenhar; ou seja, desenha sempre com os ângulos externos (perfil, a partir da normal, a partir da horizontal).
- α: círculo de raio R/cos α_ext com centro a R·tan α_ext do centro da carta, do lado oposto à normal; β: retas no azimute orientação ± β_ext (direita no sentido horário); γ: círculos girados 90°.
- Índices 1 e 2: as duas curvas, ordenadas; sem o índice 2, a linha da fachada.
- Grade: curvas de α de 5° em 5° e diâmetros de 10° em 10°.
- Detalhes, endereços e regressão: `docs/validacao/relatorios/F2.2-transferidor.md`.

### 2.4 Dados embarcados

- 14 cidades TRY (Belém, Brasília, Curitiba, Florianópolis, Fortaleza, Maceió, Natal, Porto Alegre, Recife, Rio de Janeiro, Salvador, São Luís, São Paulo, Vitória) e Concepción (Chile). A lista interna inclui Goiânia, mas goiania.csv não acompanha o instalador.
- Origem TRY: Goulart, Lamberts e Firmino (1998). Registros horários de aeroportos (CTA/IAE, via ABRAVA/IBF), períodos 1951-1970 (Natal, Porto Alegre, Recife, São Paulo) e 1961-1970 (demais). Segundo os autores, os registros de origem não continham radiação solar.
- Colunas: mês, dia, hora, TBS, TBU, TPO, pressão (kPa), umidade absoluta, UR, densidade, entalpia, vento (m/s), direção, nebulosidade (décimos), radiação extraterrestre, global horizontal, direta horizontal, direta normal, difusa horizontal. O documento de formato rotula a entalpia como BTU/lb, mas os valores estão em kJ/kg (ex.: 19 °C e W = 0,01463 kg/kg resultam em 56,1).

### 2.5 Verificações feitas sobre os dados

- Vento: nas 14 cidades TRY a velocidade é sempre inteira (m/s) e a direção vem em múltiplos de 10°. Calmaria em 53,5% das horas (Belém), 52,9% (Brasília) e 51,1% (Maceió). A rosa é pré-calculada (.ventos.csv) e a velocidade média por direção e estação está arredondada ao inteiro.
- Radiação: o fechamento GHI = direta horizontal + difusa está consistente, mas o índice de claridade horário chega a 0,97 (Brasília), com kt > 0,80 em 8,5% (Brasília) e 9,8% (São Paulo) das horas com radiação extraterrestre acima de 200 Wh/m², enquanto Florianópolis tem teto de 0,77. Compatível com radiação estimada por modelo, com comportamento heterogêneo entre cidades.
- Faixas fixas de TBS saturam em climas quentes. Horas diurnas acima de 25 °C: Fortaleza 85,3%, São Luís 84,9%, Recife 81,4%, Natal 78,4%, Belém 75,1%.

### 2.6 Precisão da geometria solar (comparação com efemérides e NREL SPA, ano 2025)

- Declinação de Cooper (com 0,986): erro máximo 1,14°, RMS 0,52°.
- Equação do tempo de Spencer: erro máximo 1,06 min, RMS 0,44 min.
- Posição do sol em Florianópolis (altura > 5°, meridiano correto): erro angular máximo 1,13°, RMS 0,55°.
- Escala: numa carta estereográfica de raio 6 cm, 1° corresponde a 0,52 mm no zênite e 1,05 mm no horizonte.
- Meridiano fixo em 45°W para cidade em UTC-4: erro de 1 h; posição dos pontos no céu com erro angular máximo de cerca de 15,3° e RMS de 14,4° (testes para Manaus e Concepción). Acre (UTC-5): 2 h. Fernando de Noronha (UTC-2): 1 h no sentido oposto.

## 3. Evidências de uso e dores atuais

- Oliveira, Primos-Rotelli e Chaves (2025, Eduvale, Avaré/SP) usaram o SOL-AR para cartas e rosas; tiveram de converter unidades do INMET (mbar para kPa, kJ/m² para Wh/m²), deixar colunas em branco e montar uma planilha porque "ferramentas desse tipo não estão disponíveis na internet"; o modelo padrão trazia dados de Concepción.
- Fernandes (2023, PARC/UFPR) propõe uma planilha para cartas solares e brises, argumentando que as ferramentas gratuitas têm baixa resolução, uma só projeção, código fechado e problemas com atualizações do sistema operacional.
- O Projeteee (MMA + LabEEE, 2015; 413 cidades, dados INMET 2016) não é ferramenta de projeto de proteção solar; material de divulgação da plataforma (ArchDaily) cita o SOL-AR como a ferramenta para cartas solares e rosas dos ventos.
- Santos e Silva (UFPel, "Jogo-Solar") alertam que automatizar máscaras sem base conceitual dificulta a interpretação: argumento para um modo didático.

## 4. Ferramentas existentes

| Ferramenta | Pontos fortes | O que não cobre neste nicho |
|---|---|---|
| CBE Clima Tool (Berkeley; web; MIT) | ~30 mil EPW, carta solar colorida por variável, rosas com filtros, psicrométrica, conforto adaptativo, UTCI, exportação SVG/CSV | Projeto de proteção solar (máscara, transferidor, brise); contexto normativo brasileiro |
| Andrew Marsh (apps web) | Carta 3D, máscaras de obstrução em tempo real a partir de modelos 3D, exportação SVG | Dados climáticos sobrepostos; dimensionamento de brises por ângulos |
| Ladybug Tools (Grasshopper) | Carta solar, radiação, "shade benefit", integração com EnergyPlus | Exige Rhino/Grasshopper e domínio paramétrico; inviável para iniciantes |
| Projeteee (MMA/LabEEE) | 413 cidades, estratégias bioclimáticas | Projeto de proteção solar (máscara, brise) |
| Planilha de Fernandes (2023) | Acessível, várias projeções | Interatividade, dados horários, quantificação |

## 5. Proposta

### 5.1 Princípios

- Preservar o método da carta estereográfica + transferidor, compatível com o ensino, e um modo clássico tão simples quanto o atual.
- Transparência: toda saída informa origem e período dos dados e as hipóteses do cálculo.
- Cálculo verificável: núcleo aberto e testado contra referências.

### 5.2 Dados

- Leitura direta de EPW (e do CSV legado do SOL-AR, para compatibilidade).
- Catálogo nacional com busca por mapa (TMYx/INMET), indicando distância e diferença de altitude entre estação e local.
- Comparação de arquivos: TRY antigo, TMYx recente e arquivos futuros (LabEEE/INPE: 27 capitais, RCP2.6 e RCP8.5, 6 modelos regionais).
- Controle de qualidade exibido ao usuário: % de calmarias, resolução de direção, horas com kt implausível, lacunas, origem da separação direta/difusa.
- Zona bioclimática NBR 15220-3:2024 por município (lista do ABNT TR 15220-3-1).

### 5.3 Geometria e visualização

- NREL SPA; fuso a partir do cabeçalho do EPW; distinção explícita entre hora solar e hora legal (opção de linhas horárias em hora legal, que viram analemas).
- Projeções estereográfica (padrão), equidistante e cilíndrica, cada uma com o transferidor correspondente.
- Vista 3D (sol, janela, brise, sombra animada) sincronizada com a carta.

### 5.4 Máscara de sombra

- Modo clássico: α, β e γ digitados e traçados no transferidor.
- Modo calculado: janela (largura, altura) + dispositivos (brise horizontal finito com afastamento e prolongamentos laterais, brises verticais, grelha, lâminas múltiplas com inclinação) gerando a máscara exata. Como toda aresta reta vista de um ponto define um plano pelo observador, ela se projeta num arco de círculo máximo; na projeção estereográfica, a máscara de dispositivos retilíneos é composta de arcos de circunferência.
- Percentual de sombreamento: integrar sobre a área da janela (amostragem em grade) para obter curvas de 0, 25, 50, 75 e 100% em vez de "total/parcial".
- Dimensionamento inverso: do período a sombrear para α, β, γ e dimensões; subdivisão em lâminas mantendo os ângulos (procedimento do tutorial, automatizado).
- Obstruções do entorno (blocos ou OBJ) e AOV.

### 5.5 Sobreposição climática e quantificação

- Qualquer variável do EPW sobre a carta, com faixas editáveis e paletas acessíveis.
- Mapa mês × hora com a fração ensolarada da janela, eliminando a ambiguidade das duas metades do ano.
- Indicadores: fração da radiação direta incidente (DNI·cos θ) bloqueada nas horas de excesso de calor e fração admitida nas horas frias; versão com difusa via fator de visão do céu com a máscara (isotrópico ou Perez).
- Classificação das horas em níveis de rigor: (1) limiares editáveis; (2) faixa de conforto adaptativo (ASHRAE 55) como referência; (3) temperatura de equilíbrio por tipologia; (4) cargas horárias importadas de simulação EnergyPlus (lógica do método celular de Kaftan e Marsh, 2005, e do SHADERADE, Sargent, Niemasz e Reinhart, 2011). Deixar explícito que (1) a (3) usam a temperatura externa como proxy da necessidade de sombreamento.
- Cuidado: não usar os intervalos de temperatura operativa interna da NBR 15575 para classificar temperatura externa.

### 5.6 Vento

- Rosa calculada do EPW: 16 setores, faixas de velocidade, calmarias explícitas, filtros por mês, estação, hora e condição térmica.
- Correção de velocidade para altura e rugosidade do lote (perfil de potência, como no EnergyPlus/ASHRAE).
- Aviso de que os dados são de estação (geralmente aeroporto) e não representam o escoamento no lote urbano.

### 5.7 Normas e simulação

- AVS, AHS e AOV conforme as definições da INI-C (entradas do metamodelo do método simplificado).
- Exportação do dispositivo para EnergyPlus (Shading:Overhang:Projection, Shading:Fin:Projection ou Shading:Zone:Detailed para lâminas), referenciando o nome da janela.
- Exportação de corte e vista do brise (SVG/DXF).

### 5.8 Saídas, usabilidade e didática

- SVG/PDF vetorial com escala (raio em cm) para impressão em transparência; PNG; CSV de resultados; arquivo de projeto (JSON); link compartilhável com o estado.
- Português, espanhol e inglês.
- Modo exercício: o aluno constrói a máscara manualmente e a ferramenta compara com a calculada.

## 6. Arquitetura técnica

- Aplicação web estática (TypeScript; SVG/D3 para 2D; Three.js para 3D; Web Workers para cálculos), instalável e offline (PWA), sem backend. Os arquivos do usuário permanecem no navegador.
- Catálogo: arquivos pré-processados e compactados hospedados estaticamente, com atribuição; verificar os termos de redistribuição de cada fonte.
- Núcleo de cálculo como biblioteca separada com testes automatizados; possível espelho em Python para pesquisa.
- Código aberto (licença a definir com o LabEEE); empacotamento desktop opcional (Tauri) se houver demanda.

## 7. Plano de validação

- Posição solar contra NREL SPA (pvlib): meta abaixo de 0,01°.
- Máscaras: casos analíticos (brise infinito reproduz a curva α) e fração ensolarada hora a hora contra "Surface Outside Face Sunlit Fraction" do EnergyPlus, para um conjunto de janelas, brises, orientações e latitudes.
- Radiação incidente contra "Surface Outside Face Incident Solar Radiation Rate per Area" do EnergyPlus (mesmo arquivo climático; explicitar diferenças de modelo de céu).
- Regressão contra o SOL-AR 6.2, documentando as diferenças esperadas (fuso, dados).
- Usabilidade com estudantes (ex.: questionário SUS) e avaliação didática.
- O conjunto rende artigo (ENCAC/ENTAC ou periódico).

## 8. Roteiro (estimativas grosseiras, dedicação parcial)

- Protótipo (1 a 2 semanas): EPW, carta estereográfica com SPA e fuso correto, transferidor α/β/γ, máscara calculada para brise horizontal e vertical finitos com percentual, sobreposição de TBS com faixas editáveis, rosa de 16 setores, exportação SVG.
- v1.0 (2 a 3 meses): catálogo e mapa, comparação de climas, quantificação e mapa mês × hora, modo didático, idiomas, PWA, impressão em escala, validação de geometria e máscaras.
- v2 (mais 2 a 4 meses): radiação difusa com máscara (Perez), exportação EnergyPlus, INI-C, entorno 3D, importação de cargas horárias, zona NBR 15220-3:2024.

## 9. Riscos e cuidados

- Escopo: não replicar o CBE Clima; foco no projeto de proteção solar no contexto brasileiro.
- Simplicidade: manter o modo clássico.
- Didática: a automação pode reduzir o aprendizado; modo exercício.
- Dados: licenças, qualidade (direta/difusa de modelos de separação, vento de aeroporto) e transparência.
- Metodologia: temperatura externa como proxy; ambiguidade de semestre; hora solar versus hora legal; convenção de hora final da radiação horária (valor integrado na hora anterior).
- Institucional: marca "Analysis SOL-AR", créditos (Lamberts, Maciel, Ono), hospedagem e manutenção; alinhar com o LabEEE se a ideia é substituir o link.

## 10. Fontes

- Goulart, Lamberts e Firmino (1998), Dados climáticos para projeto e avaliação energética de edificações para 14 cidades brasileiras: https://labeee.ufsc.br/sites/default/files/publicacoes/livros/dados_climaticos_para_projetos_e_avaliacao_energetica_de_edificacoes_para_14_cidades_brasileiras.pdf
- CBE Clima Tool (artigo): https://ar5iv.labs.arxiv.org/html/2212.04609
- Andrew Marsh, Dynamic Overshadowing: https://andrewmarsh.com/software/shading-box-web/
- Kaftan e Marsh (2005), método celular: https://www.aivc.org/node/31534
- Sargent, Niemasz e Reinhart (2011), SHADERADE: https://www.aivc.org/node/35610
- Ladybug, Energy Shade Benefit: https://discourse.ladybug.tools/t/energy-shade-benefit-analysis-for-lbt/23382
- NBR 15220-3:2024 publicada: https://normalizacaoee.com.br/publicado-novo-zoneamento-bioclimatico-brasileiro/
- LabEEE, Zoneamento Bioclimático: https://labeee.ufsc.br/pt-br/zoneamentobioclimatico
- Zonas 1R a 6B e emenda NBR 15575: https://www.ugreen.com.br/nbr-15220-3-2024-e-a-emenda-de-2025-a-nbr-15575-as-12-zonas-bioclimaticas-e-o-que-muda-no-laudo-termico/
- INI-C (AVS, AHS, AOV): https://labeee.ufsc.br/sites/default/files/documents/INIC_Dez2020.pdf
- Projeteee (ArchDaily): https://www.archdaily.com/1121635/bioclimatic-solutions-for-energy-efficient-projects
- Oliveira, Primos-Rotelli e Chaves (2025), Avaré: https://static.even3.com/anais/1270170.pdf
- Fernandes (2023), PARC: https://periodicos.sbu.unicamp.br/ojs/index.php/parc/article/view/8671992
- Santos e Silva, Jogo-Solar (UFPel): https://anais-siiepe.ufpel.edu.br/2025/G5_06360.pdf
- LabEEE/INPE, arquivos climáticos futuros: https://labeee.ufsc.br/en/node/1111
- Climate.OneBuilding, Brasil: https://www.climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/index.html

## Apêndice: resumo dos arquivos horários embarcados

| Arquivo | Tméd (°C) | Tmáx | Tmín | % horas > 25 °C | % calmaria | GHI (kWh/m²·ano) |
|---|---|---|---|---|---|---|
| belem | 26,0 | 34,9 | 20,0 | 49,4 | 53,5 | 1960 |
| brasilia | 20,7 | 33,0 | 6,1 | 18,1 | 52,9 | 2092 |
| concepcion | 12,0 | 28,6 | -0,5 | 0,3 | 7,4 | 1506 |
| curitiba | 16,3 | 31,0 | -2,1 | 5,4 | 17,8 | 1706 |
| florianopolis | 20,7 | 36,0 | 2,0 | 14,4 | 21,6 | 1517 |
| fortaleza | 26,5 | 32,2 | 19,7 | 72,1 | 29,6 | 2086 |
| maceio | 24,2 | 34,8 | 15,8 | 36,2 | 51,1 | 2090 |
| natal | 25,7 | 32,6 | 18,7 | 54,1 | 7,1 | 2010 |
| porto_alegre | 19,2 | 36,5 | 1,3 | 15,4 | 19,8 | 1734 |
| recife | 25,7 | 31,4 | 19,6 | 67,8 | 6,0 | 1988 |
| rio_de_janeiro | 23,6 | 38,2 | 13,0 | 31,0 | 25,7 | 1837 |
| salvador | 25,3 | 33,6 | 14,2 | 52,8 | 17,1 | 1989 |
| sao_luis | 26,7 | 35,0 | 20,3 | 63,1 | 33,2 | 2010 |
| sao_paulo | 18,8 | 32,8 | 7,5 | 9,7 | 7,0 | 1871 |
| vitoria | 23,2 | 35,6 | 11,2 | 28,4 | 17,5 | 1852 |

Percentuais sobre as 8760 horas do ano; calmaria = velocidade zero.
